import { describe, expect, it, vi } from 'vitest';
import {
  MailerLiteClient,
  type FetchTransport,
  type MailerLiteSubscriberStatus,
} from './mailerlite-client';
import {
  DELIVERY_GROUP_ID,
  evaluateSignupRequest,
  MARKETING_GROUP_ID,
  MAX_UTM_FIELD_LENGTH,
  NIRAN_CONSENT_VERSION,
  type SignupRequest,
} from './subscriber-state';

const EMAIL = 'person@example.test';
const PENDING_GROUP_ID = 'PENDING_TEST_GROUP';
const TEST_TOKEN = 'test-token';

type RecordedCall = Readonly<{ url: string; init?: RequestInit }>;

function providerSubscriber(
  status: MailerLiteSubscriberStatus,
  groupIds: readonly string[] = []
): Response {
  return new Response(
    JSON.stringify({
      data: {
        status,
        groups: groupIds.map((id) => ({ id })),
        ignored_provider_data: EMAIL,
      },
    }),
    { status: 200 }
  );
}

function response(status: number, body = ''): Response {
  return new Response(body, { status });
}

function createHarness(steps: Array<Response | Error>) {
  const calls: RecordedCall[] = [];
  const transport: FetchTransport = vi.fn(async (url, init) => {
    calls.push({ url: String(url), init });
    const next = steps.shift();
    if (!next) throw new Error('unexpected test transport call');
    if (next instanceof Error) throw next;
    return next;
  });
  const client = new MailerLiteClient({ apiToken: TEST_TOKEN, fetch: transport });

  return { api: client, calls, transport };
}

function request(overrides: Partial<SignupRequest> = {}): SignupRequest {
  return {
    consentVersion: NIRAN_CONSENT_VERSION,
    email: EMAIL,
    marketingConsent: false,
    ...overrides,
  };
}

function mutationBody(calls: readonly RecordedCall[]) {
  expect(calls).toHaveLength(2);
  return JSON.parse(String(calls[1].init?.body)) as Record<string, unknown>;
}

async function evaluate(
  steps: Array<Response | Error>,
  signupRequest: SignupRequest
) {
  const harness = createHarness(steps);
  const outcome = await evaluateSignupRequest(
    signupRequest,
    { pendingMarketingGroupId: PENDING_GROUP_ID },
    harness.api
  );
  return { ...harness, outcome };
}

describe('MailerLite subscriber state machine', () => {
  it('creates a not-found Kit-only subscriber as unconfirmed with only approved fields', async () => {
    const input = {
      ...request({ utm_source: ' instagram ', utm_term: '   ' }),
      arbitrary: 'ignored',
    } as SignupRequest & { arbitrary: string };
    const { calls, outcome } = await evaluate([response(404), response(201)], input);

    expect(outcome).toEqual({ kind: 'accepted' });
    expect(mutationBody(calls)).toEqual({
      email: EMAIL,
      fields: {
        consent_version: NIRAN_CONSENT_VERSION,
        utm_source: 'instagram',
      },
      groups: [DELIVERY_GROUP_ID],
    });
  });

  it('creates a not-found marketing signup as unconfirmed without PENDING', async () => {
    const { calls, outcome } = await evaluate(
      [response(404), response(201)],
      request({ marketingConsent: true, utm_campaign: 'niran_storytime_2026' })
    );

    expect(outcome).toEqual({ kind: 'accepted' });
    const body = mutationBody(calls);
    expect(body.groups).toEqual([DELIVERY_GROUP_ID, MARKETING_GROUP_ID]);
    expect(body.groups).not.toContain(PENDING_GROUP_ID);
    expect(body).not.toHaveProperty('status');
    expect(body.fields).toEqual({
      consent_version: NIRAN_CONSENT_VERSION,
      utm_campaign: 'niran_storytime_2026',
    });
  });

  it('trims and caps every approved UTM field at the campaign limit', async () => {
    const cappedValue = 'x'.repeat(MAX_UTM_FIELD_LENGTH);
    const overLengthValue = ` ${'x'.repeat(MAX_UTM_FIELD_LENGTH + 1)} `;
    const { calls, outcome } = await evaluate(
      [response(404), response(201)],
      request({
        utm_source: overLengthValue,
        utm_medium: overLengthValue,
        utm_campaign: overLengthValue,
        utm_content: overLengthValue,
        utm_term: overLengthValue,
      })
    );

    expect(outcome).toEqual({ kind: 'accepted' });
    expect(mutationBody(calls).fields).toEqual({
      consent_version: NIRAN_CONSENT_VERSION,
      utm_source: cappedValue,
      utm_medium: cappedValue,
      utm_campaign: cappedValue,
      utm_content: cappedValue,
      utm_term: cappedValue,
    });
  });

  it.each([false, true])('does not mutate an existing unconfirmed subscriber (%s)', async (marketingConsent) => {
    const { calls, outcome } = await evaluate(
      [providerSubscriber('unconfirmed')],
      request({ marketingConsent })
    );

    expect(outcome).toEqual({ kind: 'accepted' });
    expect(calls).toHaveLength(1);
  });

  it('adds DELIVERY for an active Kit-only subscriber without altering MARKETING', async () => {
    const { calls, outcome } = await evaluate(
      [providerSubscriber('active', [MARKETING_GROUP_ID]), response(200)],
      request()
    );

    expect(outcome).toEqual({ kind: 'accepted' });
    expect(mutationBody(calls)).toEqual({ email: EMAIL, groups: [DELIVERY_GROUP_ID] });
  });

  it('does not mutate an active Kit-only subscriber already in DELIVERY', async () => {
    const { calls, outcome } = await evaluate(
      [providerSubscriber('active', [DELIVERY_GROUP_ID])],
      request()
    );

    expect(outcome).toEqual({ kind: 'accepted' });
    expect(calls).toHaveLength(1);
  });

  it('adds only missing DELIVERY for an active subscriber already in MARKETING', async () => {
    const { calls, outcome } = await evaluate(
      [providerSubscriber('active', [MARKETING_GROUP_ID]), response(200)],
      request({ marketingConsent: true })
    );

    expect(outcome).toEqual({ kind: 'accepted' });
    expect(mutationBody(calls)).toEqual({ email: EMAIL, groups: [DELIVERY_GROUP_ID] });
  });

  it('does not mutate an active subscriber already in DELIVERY and MARKETING', async () => {
    const { calls, outcome } = await evaluate(
      [providerSubscriber('active', [DELIVERY_GROUP_ID, MARKETING_GROUP_ID])],
      request({ marketingConsent: true })
    );

    expect(outcome).toEqual({ kind: 'accepted' });
    expect(calls).toHaveLength(1);
  });

  it('adds PENDING but never MARKETING for fresh active marketing consent', async () => {
    const { calls, outcome } = await evaluate(
      [providerSubscriber('active', [DELIVERY_GROUP_ID]), response(200)],
      request({ marketingConsent: true })
    );

    expect(outcome).toEqual({ kind: 'accepted' });
    const body = mutationBody(calls);
    expect(body.groups).toEqual([PENDING_GROUP_ID]);
    expect(body.groups).not.toContain(MARKETING_GROUP_ID);
    expect(body.status).toBeUndefined();
  });

  it('normalizes the pending group ID for membership checks and does not retrigger it', async () => {
    const harness = createHarness([providerSubscriber('active', [DELIVERY_GROUP_ID, PENDING_GROUP_ID])]);
    const outcome = await evaluateSignupRequest(
      request({ marketingConsent: true }),
      { pendingMarketingGroupId: ` ${PENDING_GROUP_ID} ` },
      harness.api
    );

    expect(outcome).toEqual({ kind: 'accepted' });
    expect(harness.calls).toHaveLength(1);
  });

  it('deduplicates outgoing active marketing groups', async () => {
    const harness = createHarness([providerSubscriber('active'), response(200)]);
    const outcome = await evaluateSignupRequest(
      request({ marketingConsent: true }),
      { pendingMarketingGroupId: ` ${PENDING_GROUP_ID} ` },
      harness.api
    );

    expect(outcome).toEqual({ kind: 'accepted' });
    const groups = mutationBody(harness.calls).groups as string[];
    expect(groups).toEqual([DELIVERY_GROUP_ID, PENDING_GROUP_ID]);
    expect(new Set(groups).size).toBe(groups.length);
  });

  it('does not retrigger PENDING for an active subscriber already pending', async () => {
    const { calls, outcome } = await evaluate(
      [providerSubscriber('active', [DELIVERY_GROUP_ID, PENDING_GROUP_ID])],
      request({ marketingConsent: true })
    );

    expect(outcome).toEqual({ kind: 'accepted' });
    expect(calls).toHaveLength(1);
  });

  it('adds only missing DELIVERY when active subscriber is already pending', async () => {
    const { calls, outcome } = await evaluate(
      [providerSubscriber('active', [PENDING_GROUP_ID]), response(200)],
      request({ marketingConsent: true })
    );

    expect(outcome).toEqual({ kind: 'accepted' });
    expect(mutationBody(calls)).toEqual({ email: EMAIL, groups: [DELIVERY_GROUP_ID] });
  });

  it.each(['unsubscribed', 'bounced', 'junk'] as const)(
    'does not mutate a suppressed %s subscriber',
    async (status) => {
      const { calls, outcome } = await evaluate(
        [providerSubscriber(status)],
        request({ marketingConsent: true })
      );

      expect(outcome).toEqual({ kind: 'accepted' });
      expect(calls).toHaveLength(1);
    }
  );

  it('fails closed for an unknown provider status', async () => {
    const body = JSON.stringify({
      data: { id: 'subscriber-test', status: 'future_status', groups: [] },
    });
    const { calls, outcome } = await evaluate([response(200, body)], request());

    expect(outcome).toEqual({ kind: 'upstream-failure' });
    expect(calls).toHaveLength(1);
  });

  it.each([
    ['lookup 500', [response(500)]],
    ['lookup network failure', [new Error(`lookup failed for ${EMAIL}`)]],
  ])('returns a generic failure with zero mutation after %s', async (_name, steps) => {
    const { calls, outcome } = await evaluate(steps, request());

    expect(outcome).toEqual({ kind: 'upstream-failure' });
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(outcome)).not.toContain(EMAIL);
  });

  it('surfaces mutation failure generically without a provider response body', async () => {
    const { calls, outcome } = await evaluate(
      [response(404), response(500, `provider body ${EMAIL}`)],
      request()
    );

    expect(outcome).toEqual({ kind: 'upstream-failure' });
    expect(calls).toHaveLength(2);
    expect(JSON.stringify(outcome)).not.toContain(EMAIL);
  });

  it('uses only GET and POST and never sends resubscribe', async () => {
    const { calls } = await evaluate(
      [response(404), response(201)],
      request({ marketingConsent: true })
    );

    expect(calls.map((call) => call.init?.method)).toEqual(['GET', 'POST']);
    expect(JSON.stringify(mutationBody(calls))).not.toContain('resubscribe');
  });

  it('fails closed when fresh active marketing consent has no pending group configuration', async () => {
    const harness = createHarness([]);
    const outcome = await evaluateSignupRequest(
      request({ marketingConsent: true }),
      { pendingMarketingGroupId: ' ' },
      harness.api
    );

    expect(outcome).toEqual({ kind: 'upstream-failure' });
    expect(harness.calls).toHaveLength(0);
  });

  it.each([DELIVERY_GROUP_ID, MARKETING_GROUP_ID])(
    'fails closed before lookup when pending configuration collides with %s',
    async (pendingMarketingGroupId) => {
      const harness = createHarness([]);
      const outcome = await evaluateSignupRequest(
        request({ marketingConsent: true }),
        { pendingMarketingGroupId },
        harness.api
      );

      expect(outcome).toEqual({ kind: 'upstream-failure' });
      expect(harness.calls).toHaveLength(0);
    }
  );
});
