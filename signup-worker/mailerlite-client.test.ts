import { describe, expect, it, vi } from 'vitest';
import { MAILERLITE_API_BASE, MailerLiteClient } from './mailerlite-client';

const TEST_TOKEN = 'test-token';

describe('MailerLiteClient', () => {
  it('URL-encodes email only inside the provider lookup URL', async () => {
    const transport = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: { id: 'subscriber-test', status: 'active', groups: [] },
        }),
        { status: 200 }
      )
    );
    const client = new MailerLiteClient({ apiToken: TEST_TOKEN, fetch: transport });
    const email = 'person+tag@example.test';

    await client.lookupSubscriber(email);

    expect(transport).toHaveBeenCalledWith(
      `${MAILERLITE_API_BASE}/subscribers/person%2Btag%40example.test`,
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('does not surface raw provider bodies or a transport error message', async () => {
    const email = 'person@example.test';
    const client = new MailerLiteClient({
      apiToken: TEST_TOKEN,
      fetch: vi.fn(async () => {
        throw new Error(`provider failure for ${email}`);
      }),
    });

    const result = await client.lookupSubscriber(email);

    expect(result).toEqual({ kind: 'upstream-failure' });
    expect(JSON.stringify(result)).not.toContain(email);
  });

  it.each([
    ['malformed JSON', '{'],
    ['missing subscriber data', JSON.stringify({ provider_error: 'person@example.test' })],
    [
      'unknown subscriber status',
      JSON.stringify({ data: { status: 'future', groups: [], provider_error: 'person@example.test' } }),
    ],
    [
      'malformed subscriber groups',
      JSON.stringify({ data: { status: 'active', groups: [{}], provider_error: 'person@example.test' } }),
    ],
  ])('fails closed for %s without exposing response content', async (_name, body) => {
    const email = 'person@example.test';
    const client = new MailerLiteClient({
      apiToken: TEST_TOKEN,
      fetch: vi.fn(async () => new Response(body, { status: 200 })),
    });

    const result = await client.lookupSubscriber(email);

    expect(result).toEqual({ kind: 'upstream-failure' });
    expect(JSON.stringify(result)).not.toContain(email);
  });

  it('contains mutation transport failures in a fixed non-identifying result', async () => {
    const email = 'person@example.test';
    const client = new MailerLiteClient({
      apiToken: TEST_TOKEN,
      fetch: vi.fn(async () => {
        throw new Error(`provider mutation failure for ${email}`);
      }),
    });

    const result = await client.additiveUpsert({
      email,
      groups: ['TEST_GROUP'],
    });

    expect(result).toEqual({ kind: 'upstream-failure' });
    expect(JSON.stringify(result)).not.toContain(email);
  });
});
