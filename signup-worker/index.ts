import {
  MailerLiteClient,
  type FetchTransport,
} from './mailerlite-client';
import {
  DELIVERY_GROUP_ID,
  evaluateSignupRequest,
  MARKETING_GROUP_ID,
  MAX_UTM_FIELD_LENGTH,
  NIRAN_CONSENT_VERSION,
  type SignupRequest,
} from './subscriber-state';

export const SIGNUP_PATH = '/api/niran-storytime-signup';
export const MAX_REQUEST_BODY_BYTES = 8 * 1024;

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
} as const;

const ACCEPTED_KEYS = new Set([
  'email',
  'marketingConsent',
  'consentVersion',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
]);

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

type BodyReadResult =
  | Readonly<{ kind: 'success'; text: string }>
  | Readonly<{ kind: 'invalid' }>
  | Readonly<{ kind: 'too-large' }>;

function jsonResponse(
  status: number,
  body: Readonly<Record<string, string>>,
  headers?: Readonly<Record<string, string>>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...RESPONSE_HEADERS, ...headers },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasJsonContentType(request: Request): boolean {
  const contentType = request.headers.get('Content-Type');
  return contentType?.split(';', 1)[0].trim().toLowerCase() === 'application/json';
}

function declaredBodyTooLarge(request: Request): boolean {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength === null || !/^\d+$/.test(contentLength.trim())) return false;
  return Number(contentLength) > MAX_REQUEST_BODY_BYTES;
}

async function readBoundedBody(request: Request): Promise<BodyReadResult> {
  if (declaredBodyTooLarge(request)) return { kind: 'too-large' };
  if (!request.body) return { kind: 'success', text: '' };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // The size decision is already final; cancellation failure is non-identifying.
        }
        return { kind: 'too-large' };
      }
      chunks.push(value);
    }
  } catch {
    return { kind: 'invalid' };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return {
      kind: 'success',
      text: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    };
  } catch {
    return { kind: 'invalid' };
  }
}

function normalizeEmail(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const email = value.trim();
  if (
    email.length === 0 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return undefined;
  }
  return email;
}

function parseSignupRequest(value: unknown): SignupRequest | undefined {
  if (!isRecord(value)) return undefined;
  if (Object.keys(value).some((key) => !ACCEPTED_KEYS.has(key))) return undefined;

  const email = normalizeEmail(value.email);
  if (
    !email ||
    typeof value.marketingConsent !== 'boolean' ||
    value.consentVersion !== NIRAN_CONSENT_VERSION
  ) {
    return undefined;
  }

  const request: Record<string, string | boolean> = {
    email,
    marketingConsent: value.marketingConsent,
    consentVersion: NIRAN_CONSENT_VERSION,
  };

  for (const key of UTM_KEYS) {
    const candidate = value[key];
    if (candidate === undefined) continue;
    if (typeof candidate !== 'string') return undefined;
    const normalized = candidate.trim();
    if (normalized.length > MAX_UTM_FIELD_LENGTH) return undefined;
    if (normalized) request[key] = normalized;
  }

  return request as SignupRequest;
}

function runtimeConfiguration(env: Env) {
  const apiToken = env.MAILERLITE_API_TOKEN?.trim();
  const pendingMarketingGroupId =
    env.MAILERLITE_PENDING_MARKETING_GROUP_ID?.trim();
  const signupEnvironment = env.SIGNUP_ENVIRONMENT?.trim();

  if (
    env.SIGNUP_ENABLED !== 'true' ||
    !apiToken ||
    env.MAILERLITE_DELIVERY_GROUP_ID !== DELIVERY_GROUP_ID ||
    env.MAILERLITE_MARKETING_GROUP_ID !== MARKETING_GROUP_ID ||
    !pendingMarketingGroupId ||
    pendingMarketingGroupId === DELIVERY_GROUP_ID ||
    pendingMarketingGroupId === MARKETING_GROUP_ID ||
    env.NIRAN_CONSENT_VERSION !== NIRAN_CONSENT_VERSION ||
    !signupEnvironment
  ) {
    return undefined;
  }

  return { apiToken, pendingMarketingGroupId };
}

export async function handleSignupRequest(
  request: Request,
  env: Env,
  transport: FetchTransport
): Promise<Response> {
  if (new URL(request.url).pathname !== SIGNUP_PATH) {
    return jsonResponse(404, { status: 'not_found' });
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      405,
      { status: 'method_not_allowed' },
      { Allow: 'POST' }
    );
  }

  if (!hasJsonContentType(request)) {
    return jsonResponse(415, { status: 'unsupported_media_type' });
  }

  const body = await readBoundedBody(request);
  if (body.kind === 'too-large') {
    return jsonResponse(413, { status: 'payload_too_large' });
  }
  if (body.kind === 'invalid') {
    return jsonResponse(400, { status: 'invalid_request' });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body.text);
  } catch {
    return jsonResponse(400, { status: 'invalid_request' });
  }

  const signupRequest = parseSignupRequest(parsedBody);
  if (!signupRequest) {
    return jsonResponse(400, { status: 'invalid_request' });
  }

  const config = runtimeConfiguration(env);
  if (!config) {
    return jsonResponse(503, { status: 'unavailable' });
  }

  try {
    const client = new MailerLiteClient({
      apiToken: config.apiToken,
      fetch: transport,
    });
    const outcome = await evaluateSignupRequest(
      signupRequest,
      { pendingMarketingGroupId: config.pendingMarketingGroupId },
      client
    );

    return outcome.kind === 'accepted'
      ? jsonResponse(202, { status: 'accepted' })
      : jsonResponse(503, { status: 'unavailable' });
  } catch {
    return jsonResponse(503, { status: 'unavailable' });
  }
}

export default {
  fetch(request, env): Promise<Response> {
    return handleSignupRequest(request, env, fetch);
  },
} satisfies ExportedHandler<Env>;
