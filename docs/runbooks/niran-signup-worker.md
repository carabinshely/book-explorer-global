# Niran signup Worker runbook

## Status and safety posture

This runbook covers the local, fail-closed implementation for the Niran Storytime Kit signup path. It does not authorize production deployment, route attachment, MailerLite subscriber mutation, automation activation, or public email.

Every committed Worker environment has `SIGNUP_ENABLED=false`. The real non-secret MailerLite group IDs are committed so preview and production deployments use the reviewed provider resources, but a deployed copy still returns a generic unavailable response until the required runtime secret and enablement are deliberately provisioned. The website route is independently fail-closed behind `VITE_NIRAN_STORYTIME_ENABLED=false`, so merging the integration does not publish the campaign page.

## Architecture

```text
Browser
  -> POST /api/niran-storytime-signup
  -> isolated Niran signup Worker
  -> reviewed MailerLite subscriber state machine
  -> MailerLite API
```

The signup Worker lives under `signup-worker/`. It is physically and logically separate from the hardened `/r/*` link resolver under `worker/`; the existing resolver does not accept signup requests.

The production route is intentionally exact:

```text
bronerbooks.com/api/niran-storytime-signup
```

It does not capture unrelated `/api/*` paths.

## Website publication gate

`/niran-storytime-kit` renders the normal site 404 unless the build receives the exact value:

```text
VITE_NIRAN_STORYTIME_ENABLED=true
```

Missing, empty, case-variant, and truthy-looking values such as `1` all remain disabled. Production must not set this variable until website Issue #5 authorizes the public route, the signup Worker, and the remaining launch gates. While disabled, the route stays out of the sitemap and the production Worker remains unattached.

For controlled local QA only, Vite accepts a server-side `SIGNUP_WORKER_DEV_URL`. It must be an `http://` URL whose host is `127.0.0.1`, `localhost`, or `[::1]`; non-local and HTTPS targets fail startup. When present, Vite proxies only `/api/niran-storytime-signup` to the local Wrangler process. This variable is not exposed to browser code and does not change the production endpoint contract.

## Data boundary

The Worker accepts only:

- adult email address;
- marketing-consent boolean;
- consent version `niran_form_en_v2`;
- current-page `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term` values.

It rejects unknown keys and never accepts names, child data, subscriber IDs, analytics identifiers, arbitrary metadata, or raw query strings. The request body is JSON-only and bounded to 8 KiB while streaming, even when `Content-Length` is absent or untrusted.

MailerLite remains the subscriber source of truth. There is no D1, KV, Durable Object, Queue, custom subscriber database, or custom IP store.

## Response and logging policy

All successful state-machine evaluations return the same `202` body:

```json
{"status":"accepted"}
```

This includes new, active, unconfirmed, and suppressed subscribers. The response does not reveal subscriber existence, status, group membership, suppression, or whether double opt-in was sent.

Application-level signup logging is intentionally absent. Never log:

- email addresses or request bodies;
- MailerLite lookup URLs;
- `Authorization` headers or Worker secrets;
- MailerLite response bodies;
- subscriber IDs.

The authenticated MailerLite lookup-by-email URL is an internal processor exception only. It must never enter a browser response, diagnostic, log, or thrown error message.

## Runtime bindings and secrets

Non-secret bindings are declared per environment in `signup-worker/wrangler.jsonc`:

- `MAILERLITE_DELIVERY_GROUP_ID`;
- `MAILERLITE_MARKETING_GROUP_ID`;
- `MAILERLITE_PENDING_MARKETING_GROUP_ID`;
- `NIRAN_CONSENT_VERSION`;
- `SIGNUP_ENVIRONMENT`;
- `SIGNUP_ENABLED`.

`MAILERLITE_API_TOKEN` is a Cloudflare Worker secret. It is not committed and is not passed through GitHub Actions output. Provision it only after provider authorization, using the selected environment:

```bash
npx wrangler secret put MAILERLITE_API_TOKEN --config signup-worker/wrangler.jsonc --env preview
npx wrangler secret put MAILERLITE_API_TOKEN --config signup-worker/wrangler.jsonc --env production
```

Do not use the production token in preview. Preview should remain disabled and should have no production MailerLite token.

Wrangler 4.32.0 predates the current `secrets.required` configuration field. `scripts/generate-signup-worker-types.mjs` creates a short-lived, ignored placeholder `.dev.vars.preview` only while generating binding types, removes it in `finally`, and never contains a real credential.

The manual GitHub workflow uses separate protected environments:

- `niran-signup-worker-preview` with `CLOUDFLARE_API_TOKEN_SIGNUP_PREVIEW`;
- `niran-signup-worker-production` with `CLOUDFLARE_API_TOKEN_SIGNUP_PRODUCTION`.

Each token should have only the Cloudflare permissions required to deploy the corresponding Worker; production also needs the minimum zone access required for the exact route. Account and zone IDs are GitHub environment variables, not secrets printed by the workflow.

## MailerLite resources

| Resource | Value |
| --- | --- |
| DELIVERY | `195350273067058787` |
| MARKETING (`BronerBooks Storytime Emails | Marketing Interest`) | `196395918279313018` |
| PENDING_MARKETING | `196325716650886774` |

Verified MailerLite custom field keys:

- `consent_version`;
- `utm_source`;
- `utm_medium`;
- `utm_campaign`;
- `utm_content`;
- `utm_term`.

The runtime fails closed when the token is absent, signup is not exactly enabled, required values are missing, configured delivery/marketing IDs do not match the reviewed constants, the consent version differs, the pending ID is blank, or the pending ID collides with DELIVERY or MARKETING.

## Provider launch gates

Before any live subscriber test:

1. Verify `Account settings -> Subscribe settings -> Double opt-in for API and integrations = ON`.
2. Verify the API double-opt-in sender, confirmation email, and confirmation destination.
3. Re-verify the existing `PENDING_MARKETING` group `196325716650886774` before controlled QA.
4. Configure MARKETING as the relevant explicit preference-center interest.
5. Re-verify pending-confirmation automation `196332811592926777`, including its personalized MailerLite preference-center link, one-email shape, inactive status, and open tracking off.
6. Prove that PENDING_MARKETING never directly adds MARKETING.
7. Keep existing delivery and marketing automations disabled until controlled QA is complete and activation is separately authorized.
8. Provision the production MailerLite Worker secret without copying it into GitHub output, source, config vars, or local tracked files.
9. Review the committed group IDs and keep `SIGNUP_ENABLED=false` except during a bounded, separately authorized preview test window.

## Controlled provider test matrix

### Brand-new Kit-only

- subscriber is `unconfirmed`;
- DELIVERY only;
- double opt-in only;
- no ordinary automation while unconfirmed.

### Brand-new Kit plus marketing

- subscriber is `unconfirmed`;
- DELIVERY and MARKETING;
- double opt-in only;
- no ordinary automation while unconfirmed.

### Active Kit-only

- DELIVERY is added if missing;
- no marketing-group changes;
- no double opt-in.

### Active new marketing request

- PENDING_MARKETING is added;
- MARKETING is not added directly;
- mailbox preference confirmation is required.

### Existing unconfirmed

- generic `202`;
- no mutation;
- no deliberate double-opt-in resend.

### Suppressed

- generic `202`;
- no mutation;
- no reactivation.

## Deferred provider races

Controlled live testing must verify:

- simultaneous PENDING joins;
- suppression between lookup and additive POST;
- groups assigned while unconfirmed becoming automation-eligible exactly as expected after confirmation.

Do not solve these deferred provider-concurrency and automation-timing questions with custom infrastructure in this implementation.

## Analytics ownership

The protected integration verifies the website-owned events `lead_form_started` and `lead_form_submitted` after analytics consent. Their allowed properties are the campaign ID, approved current-page UTM fields, `content_id`, and `page_path`; direct identifiers and raw query strings are removed before GA4 dispatch.

MailerLite remains the confirmation source of truth. The browser must never infer or emit `lead_signup_confirmed` from a generic `202` response. Website Issue #7 owns the remaining confirmation, lead-magnet, retailer, contact, and broader attribution implementation.

## Validation and promotion

Local non-mutating checks:

```bash
npm run signup:test
npm run signup:types:check
npm run signup:check:preview
npm run signup:check:production
```

The manual workflow `.github/workflows/niran-signup-worker-promotion.yml` defaults to `check`. A future deployment requires an explicit `deploy` operation and protected preview or production environment. Selecting production explicitly means Wrangler will attach only the exact production route in the reviewed config. Do not dispatch a production deployment until that route change is separately authorized and all provider gates are ready.

## Controlled local live-provider QA

Use an owner-controlled test address and keep all ordinary automations inactive. Never put the MailerLite token on the command line, in shell history, in source, or in a tracked environment file.

1. Create ignored `signup-worker/.dev.vars.preview` containing only `MAILERLITE_API_TOKEN`.
2. Start Wrangler locally with the preview config and override only `SIGNUP_ENABLED:true` for the bounded session.
3. Start Vite with `VITE_NIRAN_STORYTIME_ENABLED=true` and `SIGNUP_WORKER_DEV_URL=http://127.0.0.1:8787`.
4. Exercise Kit-only, Kit-plus-marketing, active-to-pending-marketing, and suppressed/unsubscribed paths.
5. Verify generic responses, exact group state, double-opt-in behavior, no direct identifiers in URLs/logs/analytics, and GA4 Realtime receipt after consent.
6. Stop both processes, delete the ignored token file, Forget disposable test profiles where appropriate, and re-confirm that delivery, pending-confirmation, and marketing automations remain inactive.

The committed route and Worker flags must still be false after QA. This local procedure does not authorize preview deployment, production deployment, public signup, or public email.

## Production-closeout smoke

After merging the feature-disabled integration, verify that `https://bronerbooks.com/niran-storytime-kit` still renders the normal site 404 and that no production signup Worker deployment or route attachment occurred. A successful 404 is the expected protected-integration result, not a launch failure.

## Privacy Notice factual delta

The current `/privacy` page says Cloudflare provides DNS, email-routing, and related network/security infrastructure and may process routing or security metadata. Once this signup Worker is deployed on the collection path, Cloudflare will also execute the signup request and process the submitted email, consent flag, consent version, and approved UTM fields before the Worker calls MailerLite.

That is a factual data-flow delta for privacy Issue #28's owner to review. This implementation does not invent replacement legal wording and does not edit the approved Privacy Notice.

## Privacy Issue #33 evidence deltas

The private evidence index for Issue #33 should add or update the following without copying private evidence into Git:

- browser -> signup Worker -> MailerLite data-flow evidence;
- evidence that Cloudflare processes the signup request content listed above;
- MailerLite subscriber, double-opt-in, DELIVERY, MARKETING, and PENDING_MARKETING roles;
- Worker secret ownership and Cloudflare/GitHub deployment-access ownership;
- the explicit no-email, no-body, no-provider-body logging policy;
- relevant provider/subprocessor and outbound-transfer evidence;
- exact Worker route, environment, non-secret config, and deployment evidence.

Do not commit subscriber data, raw request logs, screenshots with credentials, accepted contracts, secret values, or the private evidence store.
