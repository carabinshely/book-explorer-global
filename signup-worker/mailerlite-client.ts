export const MAILERLITE_API_BASE = 'https://connect.mailerlite.com/api';

export const MAILERLITE_SUBSCRIBER_STATUSES = [
  'active',
  'unconfirmed',
  'unsubscribed',
  'bounced',
  'junk',
] as const;

export type MailerLiteSubscriberStatus =
  (typeof MAILERLITE_SUBSCRIBER_STATUSES)[number];

export type FetchTransport = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type MailerLiteSubscriber = Readonly<{
  status: MailerLiteSubscriberStatus;
  groupIds: readonly string[];
}>;

export type LookupResult =
  | Readonly<{ kind: 'found'; subscriber: MailerLiteSubscriber }>
  | Readonly<{ kind: 'not-found' }>
  | Readonly<{ kind: 'upstream-failure' }>;

export type MutationResult =
  | Readonly<{ kind: 'success' }>
  | Readonly<{ kind: 'upstream-failure' }>;

export type MailerLiteFields = Readonly<{
  consent_version: 'niran_form_en_v2';
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}>;

export type AdditiveSubscriberUpsert = Readonly<{
  email: string;
  fields?: MailerLiteFields;
  groups: readonly string[];
}>;

export type MailerLiteClientOptions = Readonly<{
  apiToken: string;
  fetch: FetchTransport;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSubscriberStatus(value: unknown): value is MailerLiteSubscriberStatus {
  return (
    typeof value === 'string' &&
    MAILERLITE_SUBSCRIBER_STATUSES.includes(
      value as MailerLiteSubscriberStatus
    )
  );
}

function parseSubscriber(value: unknown): MailerLiteSubscriber | undefined {
  if (!isRecord(value) || !isRecord(value.data)) return undefined;

  const { status, groups } = value.data;
  if (!isSubscriberStatus(status) || !Array.isArray(groups)) {
    return undefined;
  }

  const groupIds: string[] = [];
  for (const group of groups) {
    if (!isRecord(group) || typeof group.id !== 'string') return undefined;
    groupIds.push(group.id);
  }

  return { status, groupIds };
}

export class MailerLiteClient {
  private readonly apiToken: string;
  private readonly transport: FetchTransport;

  constructor(options: MailerLiteClientOptions) {
    this.apiToken = options.apiToken;
    this.transport = options.fetch;
  }

  async lookupSubscriber(email: string): Promise<LookupResult> {
    const url = `${MAILERLITE_API_BASE}/subscribers/${encodeURIComponent(email)}`;
    let response: Response;

    try {
      response = await this.transport(url, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
        method: 'GET',
      });
    } catch {
      return { kind: 'upstream-failure' };
    }

    if (response.status === 404) return { kind: 'not-found' };
    if (response.status !== 200) return { kind: 'upstream-failure' };

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { kind: 'upstream-failure' };
    }

    const subscriber = parseSubscriber(body);
    return subscriber
      ? { kind: 'found', subscriber }
      : { kind: 'upstream-failure' };
  }

  async additiveUpsert(
    upsert: AdditiveSubscriberUpsert
  ): Promise<MutationResult> {
    let response: Response;

    try {
      response = await this.transport(`${MAILERLITE_API_BASE}/subscribers`, {
        body: JSON.stringify(upsert),
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
    } catch {
      return { kind: 'upstream-failure' };
    }

    return response.ok ? { kind: 'success' } : { kind: 'upstream-failure' };
  }
}
