import { describe, expect, it, vi } from 'vitest';
import type { FetchTransport } from './mailerlite-client';
import {
  handleSignupRequest,
  MAX_REQUEST_BODY_BYTES,
  SIGNUP_PATH,
} from './index';
import {
  DELIVERY_GROUP_ID,
  MARKETING_GROUP_ID,
  NIRAN_CONSENT_VERSION,
} from './subscriber-state';

const BASE_URL = `https://bronerbooks.com${SIGNUP_PATH}`;
const EMAIL = 'person@example.test';
const PENDING_GROUP_ID = 'PENDING_TEST_GROUP';

const BASE_ENV = {
  MAILERLITE_API_TOKEN: 'test-token',
  MAILERLITE_DELIVERY_GROUP_ID: DELIVERY_GROUP_ID,
  MAILERLITE_MARKETING_GROUP_ID: MARKETING_GROUP_ID,
  MAILERLITE_PENDING_MARKETING_GROUP_ID: PENDING_GROUP_ID,
  NIRAN_CONSENT_VERSION,
  SIGNUP_ENVIRONMENT: 'preview',
  SIGNUP_ENABLED: 'true',
} satisfies Env;

function testEnv(overrides: Partial<Env> = {}): Env {
  return { ...BASE_ENV, ...overrides };
}

function providerTransport(...responses: Response[]): FetchTransport {
  return vi.fn(async () => {
    const response = responses.shift();
    if (!response) throw new Error('unexpected provider request');
    return response;
  });
}

function providerSubscriber(status: string, groups: string[] = []): Response {
  return new Response(
    JSON.stringify({
      data: {
        id: 'provider-subscriber-id',
        status,
        groups: groups.map((id) => ({ id })),
      },
    }),
    { status: 200 }
  );
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    email: EMAIL,
    marketingConsent: false,
    consentVersion: NIRAN_CONSENT_VERSION,
    ...overrides,
  };
}

function jsonRequest(
  value: unknown = body(),
  overrides: Omit<RequestInit, 'body'> = {}
): Request {
  return new Request(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...overrides.headers },
    ...overrides,
    body: JSON.stringify(value),
  });
}

async function handle(
  request = jsonRequest(),
  env = testEnv(),
  transport = providerTransport(
    new Response('', { status: 404 }),
    new Response('', { status: 201 })
  )
) {
  return handleSignupRequest(request, env, transport);
}

function expectDefensiveHeaders(response: Response) {
  expect(response.headers.get('content-type')).toBe(
    'application/json; charset=utf-8'
  );
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  expect(response.headers.get('access-control-allow-origin')).toBeNull();
}

describe('Niran signup Worker HTTP boundary', () => {
  it('accepts a valid POST with the generic response contract', async () => {
    const response = await handle();

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: 'accepted' });
    expectDefensiveHeaders(response);
  });

  it('returns 405 and Allow: POST for GET', async () => {
    const response = await handle(new Request(BASE_URL));

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it('returns 405 for every other unsupported method', async () => {
    const response = await handle(new Request(BASE_URL, { method: 'DELETE' }));
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it('rejects a non-JSON content type', async () => {
    const response = await handle(
      new Request(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `email=${EMAIL}`,
      })
    );
    expect(response.status).toBe(415);
  });

  it('accepts normal JSON content-type parameters', async () => {
    const response = await handle(
      jsonRequest(body(), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
    );
    expect(response.status).toBe(202);
  });

  it('rejects malformed JSON', async () => {
    const response = await handle(
      new Request(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      })
    );
    expect(response.status).toBe(400);
  });

  it('rejects an oversized declared Content-Length before provider access', async () => {
    const transport = providerTransport();
    const response = await handleSignupRequest(
      new Request(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(MAX_REQUEST_BODY_BYTES + 1),
        },
        body: '{}',
      }),
      testEnv(),
      transport
    );

    expect(response.status).toBe(413);
    expect(transport).not.toHaveBeenCalled();
  });

  it('bounds a streamed body even without a trustworthy Content-Length', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_REQUEST_BODY_BYTES));
        controller.enqueue(new Uint8Array([1]));
        controller.close();
      },
    });
    const request = new Request(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    const response = await handle(request);
    expect(response.status).toBe(413);
  });

  it('rejects unknown request keys', async () => {
    expect((await handle(jsonRequest(body({ name: 'Nope' })))).status).toBe(400);
  });

  it('rejects a missing email', async () => {
    const value = body();
    delete (value as Partial<typeof value>).email;
    expect((await handle(jsonRequest(value))).status).toBe(400);
  });

  it('rejects a malformed email', async () => {
    expect((await handle(jsonRequest(body({ email: 'not-an-email' })))).status).toBe(
      400
    );
  });

  it('rejects an email longer than 254 characters', async () => {
    const email = `${'x'.repeat(245)}@example.test`;
    expect(email.length).toBeGreaterThan(254);
    expect((await handle(jsonRequest(body({ email })))).status).toBe(400);
  });

  it.each(['true', 1, 0, null])(
    'rejects non-boolean marketing consent (%s)',
    async (marketingConsent) => {
      expect(
        (await handle(jsonRequest(body({ marketingConsent })))).status
      ).toBe(400);
    }
  );

  it('rejects an unknown consent version', async () => {
    expect(
      (await handle(jsonRequest(body({ consentVersion: 'niran_form_en_v1' })))).status
    ).toBe(400);
  });

  it('rejects a non-string UTM value', async () => {
    expect((await handle(jsonRequest(body({ utm_source: 42 })))).status).toBe(400);
  });

  it('rejects a UTM value over 120 characters after trimming', async () => {
    expect(
      (await handle(jsonRequest(body({ utm_source: ` ${'x'.repeat(121)} ` })))).status
    ).toBe(400);
  });

  it('maps a Kit-only request to the frozen subscriber service contract', async () => {
    const transport = providerTransport(
      new Response('', { status: 404 }),
      new Response('', { status: 201 })
    );
    const response = await handleSignupRequest(
      jsonRequest(body({ utm_source: ' social ' })),
      testEnv(),
      transport
    );

    expect(response.status).toBe(202);
    const mutation = vi.mocked(transport).mock.calls[1];
    expect(mutation[0]).toBe('https://connect.mailerlite.com/api/subscribers');
    expect(JSON.parse(String(mutation[1]?.body))).toEqual({
      email: EMAIL,
      fields: {
        consent_version: NIRAN_CONSENT_VERSION,
        utm_source: 'social',
      },
      groups: [DELIVERY_GROUP_ID],
      status: 'unconfirmed',
    });
  });

  it('maps an opted-in new request to DELIVERY and MARKETING, never PENDING', async () => {
    const transport = providerTransport(
      new Response('', { status: 404 }),
      new Response('', { status: 201 })
    );
    const response = await handleSignupRequest(
      jsonRequest(body({ marketingConsent: true })),
      testEnv(),
      transport
    );

    expect(response.status).toBe(202);
    const mutationBody = JSON.parse(
      String(vi.mocked(transport).mock.calls[1][1]?.body)
    );
    expect(mutationBody.groups).toEqual([DELIVERY_GROUP_ID, MARKETING_GROUP_ID]);
    expect(mutationBody.groups).not.toContain(PENDING_GROUP_ID);
  });

  it.each(['unsubscribed', 'bounced', 'junk'])(
    'keeps a suppressed %s subscriber response generic',
    async (status) => {
      const response = await handle(
        jsonRequest(),
        testEnv(),
        providerTransport(providerSubscriber(status))
      );
      expect(response.status).toBe(202);
      expect(await response.json()).toEqual({ status: 'accepted' });
    }
  );

  it('keeps an existing unconfirmed subscriber response generic', async () => {
    const response = await handle(
      jsonRequest(),
      testEnv(),
      providerTransport(providerSubscriber('unconfirmed'))
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: 'accepted' });
  });

  it('returns a generic unavailable response after a provider failure', async () => {
    const response = await handle(
      jsonRequest(),
      testEnv(),
      providerTransport(new Response(`${EMAIL} provider detail`, { status: 500 }))
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable' });
  });

  it('fails closed while signup is disabled', async () => {
    expect(
      (await handle(jsonRequest(), testEnv({ SIGNUP_ENABLED: 'false' }))).status
    ).toBe(503);
  });

  it('fails closed without the MailerLite API token', async () => {
    expect(
      (await handle(jsonRequest(), testEnv({ MAILERLITE_API_TOKEN: '' }))).status
    ).toBe(503);
  });

  it('fails closed with a blank pending group', async () => {
    expect(
      (
        await handle(
          jsonRequest(),
          testEnv({ MAILERLITE_PENDING_MARKETING_GROUP_ID: ' ' })
        )
      ).status
    ).toBe(503);
  });

  it.each([DELIVERY_GROUP_ID, MARKETING_GROUP_ID])(
    'fails closed when PENDING collides with %s',
    async (pendingGroupId) => {
      expect(
        (
          await handle(
            jsonRequest(),
            testEnv({ MAILERLITE_PENDING_MARKETING_GROUP_ID: pendingGroupId })
          )
        ).status
      ).toBe(503);
    }
  );

  it.each([
    ['delivery group', { MAILERLITE_DELIVERY_GROUP_ID: '' }],
    ['marketing group', { MAILERLITE_MARKETING_GROUP_ID: '' }],
    ['consent version', { NIRAN_CONSENT_VERSION: '' }],
    ['environment', { SIGNUP_ENVIRONMENT: '' }],
  ])('fails closed with missing %s configuration', async (_name, config) => {
    expect((await handle(jsonRequest(), testEnv(config))).status).toBe(503);
  });

  it('never includes the submitted email or provider status in success', async () => {
    const response = await handle(
      jsonRequest(),
      testEnv(),
      providerTransport(providerSubscriber('unconfirmed'))
    );
    const text = await response.text();
    expect(text).not.toContain(EMAIL);
    expect(text).not.toContain('unconfirmed');
  });

  it('never includes the submitted email in an error response', async () => {
    const response = await handle(jsonRequest(body({ unknown: EMAIL })));
    expect(await response.text()).not.toContain(EMAIL);
  });

  it('does not emit wildcard CORS on any response', async () => {
    const response = await handle();
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('enforces the exact path and does not capture unrelated API routes', async () => {
    const response = await handle(
      new Request('https://bronerbooks.com/api/another-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body()),
      })
    );
    expect(response.status).toBe(404);
  });

  it('uses only the injected provider transport during tests', async () => {
    const realFetch = vi.spyOn(globalThis, 'fetch');
    const transport = providerTransport(
      new Response('', { status: 404 }),
      new Response('', { status: 201 })
    );

    const response = await handleSignupRequest(jsonRequest(), testEnv(), transport);

    expect(response.status).toBe(202);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(realFetch).not.toHaveBeenCalled();
    realFetch.mockRestore();
  });
});
