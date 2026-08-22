# Guarded Cloudflare static-site production deployment

This runbook prepares `bronerbooks-site-production` for the owner-controlled
hosting cutover in Issue #32. It does not attach `bronerbooks.com`, change DNS,
or replace the GitHub Pages origin. GitHub Pages remains the live host and
rollback authority until the later cutover and soak are complete.

## Frozen production boundary

- Build with Node.js 22.16.0, `SITE_URL=https://bronerbooks.com`,
  `VITE_BASE_URL=/`, and `VITE_NIRAN_STORYTIME_ENABLED=false`.
- Publish only the existing `dist` artifact through
  `wrangler.site-production.jsonc`.
- Keep `workers_dev=false` and `preview_urls=true` so immutable versions can be
  tested without creating a stable production `workers.dev` origin.
- Keep the production-only `global_fetch_strictly_public` compatibility flag.
  Cloudflare version-preview routing for this assets-only Worker otherwise
  returns runtime error `1042` when it performs its same-zone Worker fetch.
- `wrangler versions upload` does not apply the Worker's non-versioned subdomain
  setting. After an upload creates the Worker resource (and before its preview
  smoke), or before a promotion, the protected mutation job reads that setting,
  reconciles only `enabled=false, previews_enabled=true` when needed, and
  requires an exact readback before continuing. It never adds a route, Custom
  Domain, or DNS record.
- The production config must contain no route, Custom Domain, Worker script,
  binding, zone ID, or `run_worker_first` layer.
- `/r/*` and the exact signup API boundary remain separately owned. This flow
  must not deploy, broaden, enable, or reconfigure either Worker.

## Required GitHub environment

Create `site-static-production` before any `upload`, `promote`, or
`verify-live` run:

1. Restrict deployment branches to the exact `main` branch.
2. Require one owner approval. For the sole-owner repository, allow the owner
   to approve their own dispatch so the gate is usable; replace this with an
   independent reviewer if another maintainer is designated later.
3. Add environment secret `CLOUDFLARE_API_TOKEN_SITE_PRODUCTION`.
4. Add environment variable `CLOUDFLARE_ACCOUNT_ID`.

The Cloudflare token must be scoped to the exact account and only the minimum
Worker script/version read and write permissions needed by Wrangler. Do not
grant Zone, DNS, route, or Custom Domain permissions. Never place the token in
repository variables, Vite variables, logs, artifacts, or issue comments.

The workflow intentionally does not create or configure this environment. An
environment created implicitly by a first workflow run has no protection rules
and is not approved for use.

## Manual operations

Use the **Promote static site production Worker (manual)** workflow. Dispatch
from `main`; mutation requests from any other ref fail closed.

### `check` (default)

Runs tests, lint, SEO/privacy/build gates, both Wrangler dry runs, and the
deterministic `dist` fingerprint. It uses no Cloudflare credential and performs
no external write.

### `upload`

Requires the protected environment approval, rebuilds and verifies the exact
candidate artifact, and uploads a version with metadata:

```text
commit:<40-character source SHA>;dist:<SHA-256 artifact digest>
```

The workflow uses Wrangler's structured output to capture the version UUID and
generated version preview URL, runs the static-site/Privacy Notice smoke against
that URL, and proves the active production deployment did not change. Upload
does not attach a hostname and does not promote the version.

Record the workflow run URL, source SHA, version UUID, preview URL, artifact
digest, file count, largest asset size, and smoke result on Issue #31. Review
the sanitized evidence artifact before promotion.

### `promote`

Enter the exact healthy version UUID from an approved `upload` run and dispatch
the workflow from the same `main` commit. The workflow rebuilds the candidate,
requires its digest and commit to match the immutable Cloudflare version
metadata, and smokes the version preview before changing deployment state.

Promotion deploys only that version at 100% on the still-unattached production
Worker. It captures the previous 100% version first. If post-promotion
deployment verification or smoke fails, it attempts to restore that exact
prior version. A first promotion has no prior version to restore; failure leaves
the Worker unattached and blocks Issue #32 rather than deleting anything.
The Worker may already contain immutable versions while still having zero active
deployments; this is the expected state before its first promotion.

Promotion is not hostname cutover approval. Do not add a Custom Domain, route,
or DNS mutation to this workflow.

### `verify-live` (after Issue #32 cutover only)

Runs the shared site and Privacy Notice smoke against
`https://bronerbooks.com` and publishes the existing `privacy-live-smoke`
commit status. Content parity alone is not hosting-origin proof because the
current Pages origin is also Cloudflare-proxied. Issue #32 must independently
verify the saved DNS, route, Custom Domain, and provider state before using this
operation as post-cutover evidence.

## Evidence and stop conditions

Each upload or promotion stores a sanitized JSON artifact with the source SHA,
Worker/version IDs, version preview URL, dist digest, asset count/maximum size,
previous version, active version after the operation, smoke result, and
deployment state. It contains no token, account ID, API response, subscriber
data, or request body.

Stop and keep Issue #32 blocked for any config drift, version/digest mismatch,
preview smoke failure, soft 404, Privacy Notice regression, non-100% deployment,
failed recovery, unexpected paid-tier requirement, or evidence that a hostname,
zone, `/r/*`, or signup boundary would be changed. Do not delete the Worker or
retire the Pages workflow as an automatic recovery action.

## Issue #32 handoff

Before cutover, provide Issue #32 with the exact approved version and sanitized
evidence, plus the S3 parity result. Issue #32 still owns the immediate
pre-cutover DNS/routes/Custom Domains/Pages snapshot, apex attachment, `www`
redirect preservation, public route matrix, and rollback decision. Pages stays
deployable until Issue #33 explicitly retires it after soak.
