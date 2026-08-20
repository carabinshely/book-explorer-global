import type {
  AdditiveSubscriberUpsert,
  LookupResult,
  MailerLiteFields,
  MutationResult,
} from './mailerlite-client';

export const DELIVERY_GROUP_ID = '195350273067058787';
export const MARKETING_GROUP_ID = '195356534701556956';
export const NIRAN_CONSENT_VERSION = 'niran_form_en_v2';
export const MAX_UTM_FIELD_LENGTH = 120;

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

type UtmKey = (typeof UTM_KEYS)[number];

export type SignupRequest = Readonly<{
  email: string;
  marketingConsent: boolean;
  consentVersion: typeof NIRAN_CONSENT_VERSION;
}> &
  Partial<Record<UtmKey, string>>;

export type SignupStateConfig = Readonly<{
  pendingMarketingGroupId: string;
}>;

export type SubscriberApi = Readonly<{
  lookupSubscriber(email: string): Promise<LookupResult>;
  additiveUpsert(upsert: AdditiveSubscriberUpsert): Promise<MutationResult>;
}>;

export type SignupEvaluation =
  | Readonly<{ kind: 'accepted' }>
  | Readonly<{ kind: 'upstream-failure' }>;

function approvedFields(request: SignupRequest): MailerLiteFields {
  const fields: Record<string, string> = {
    consent_version: request.consentVersion,
  };

  for (const key of UTM_KEYS) {
    const value = request[key]?.trim().slice(0, MAX_UTM_FIELD_LENGTH);
    if (value) fields[key] = value;
  }

  return fields as MailerLiteFields;
}

function hasGroup(groupIds: readonly string[], groupId: string): boolean {
  return groupIds.includes(groupId);
}

function uniqueGroupIds(groupIds: readonly string[]): string[] {
  return [...new Set(groupIds)];
}

function normalizePendingMarketingGroupId(config: SignupStateConfig): string | undefined {
  const pendingMarketingGroupId = config.pendingMarketingGroupId.trim();
  if (
    !pendingMarketingGroupId ||
    pendingMarketingGroupId === DELIVERY_GROUP_ID ||
    pendingMarketingGroupId === MARKETING_GROUP_ID
  ) {
    return undefined;
  }

  return pendingMarketingGroupId;
}

async function mutate(
  api: SubscriberApi,
  upsert: AdditiveSubscriberUpsert
): Promise<SignupEvaluation> {
  const result = await api.additiveUpsert(upsert);
  return result.kind === 'success'
    ? { kind: 'accepted' }
    : { kind: 'upstream-failure' };
}

export async function evaluateSignupRequest(
  request: SignupRequest,
  config: SignupStateConfig,
  api: SubscriberApi
): Promise<SignupEvaluation> {
  const pendingMarketingGroupId = normalizePendingMarketingGroupId(config);
  if (!pendingMarketingGroupId) return { kind: 'upstream-failure' };

  const lookup = await api.lookupSubscriber(request.email);

  if (lookup.kind === 'upstream-failure') {
    return { kind: 'upstream-failure' };
  }

  if (lookup.kind === 'not-found') {
    return mutate(api, {
      email: request.email,
      fields: approvedFields(request),
      groups: uniqueGroupIds(
        request.marketingConsent
          ? [DELIVERY_GROUP_ID, MARKETING_GROUP_ID]
          : [DELIVERY_GROUP_ID]
      ),
      status: 'unconfirmed',
    });
  }

  const { groupIds, status } = lookup.subscriber;
  if (
    status === 'unconfirmed' ||
    status === 'unsubscribed' ||
    status === 'bounced' ||
    status === 'junk'
  ) {
    return { kind: 'accepted' };
  }

  const deliveryMissing = !hasGroup(groupIds, DELIVERY_GROUP_ID);
  const marketingPresent = hasGroup(groupIds, MARKETING_GROUP_ID);
  const pendingPresent = hasGroup(groupIds, pendingMarketingGroupId);

  if (!request.marketingConsent || marketingPresent) {
    return deliveryMissing
      ? mutate(api, { email: request.email, groups: [DELIVERY_GROUP_ID] })
      : { kind: 'accepted' };
  }

  const groups = uniqueGroupIds([
    ...(deliveryMissing ? [DELIVERY_GROUP_ID] : []),
    ...(pendingPresent ? [] : [pendingMarketingGroupId]),
  ]);

  return groups.length > 0
    ? mutate(api, { email: request.email, groups })
    : { kind: 'accepted' };
}
