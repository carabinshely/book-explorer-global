import { trackEvent } from './analytics';

export const NIRAN_CAMPAIGN_ID = 'niran_storytime_2026';
export const NIRAN_CONSENT_VERSION = 'niran_form_en_v2';

export const NIRAN_UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

type UtmKey = (typeof NIRAN_UTM_KEYS)[number];
export type NiranAttribution = Partial<Record<UtmKey, string>>;

export const NIRAN_EVENT_NAMES = [
  'lead_form_started',
  'lead_form_submitted',
  'lead_signup_confirmed',
  'lead_magnet_accessed',
  'retailer_clicked',
  'contact_clicked',
] as const;

export type NiranEventName = (typeof NIRAN_EVENT_NAMES)[number];

const MAX_ATTRIBUTION_VALUE_LENGTH = 120;
const DIRECT_IDENTIFIER_KEYS = new Set([
  'email',
  'name',
  'subscriber_id',
  'mailer_id',
  'confirmation_token',
  'raw_query_string',
]);

function normalizeAttributionValue(value: string | null) {
  if (!value) return undefined;
  const normalized = value.trim().slice(0, MAX_ATTRIBUTION_VALUE_LENGTH);
  return normalized || undefined;
}

export function readNiranAttribution(search: string): NiranAttribution {
  const params = new URLSearchParams(search);
  const attribution: NiranAttribution = {};

  for (const key of NIRAN_UTM_KEYS) {
    const value = normalizeAttributionValue(params.get(key));
    if (value) attribution[key] = value;
  }

  return attribution;
}

export function niranAttributionFields(attribution: NiranAttribution) {
  return Object.entries(attribution).filter(([, value]) => Boolean(value));
}

type EventProperties = Record<string, string | number | boolean | null | undefined>;

export function sanitizeNiranEventProperties(properties: EventProperties) {
  const sanitized: EventProperties = {};

  for (const [key, value] of Object.entries(properties)) {
    const normalizedKey = key.toLowerCase();
    if (
      DIRECT_IDENTIFIER_KEYS.has(normalizedKey) ||
      normalizedKey.startsWith('child_')
    ) {
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
}

export function trackNiranEvent(
  eventName: NiranEventName,
  properties: EventProperties = {}
) {
  trackEvent(
    eventName,
    sanitizeNiranEventProperties({
      campaign_id: NIRAN_CAMPAIGN_ID,
      ...properties,
    })
  );
}
