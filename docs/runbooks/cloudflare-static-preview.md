# Cloudflare static-site preview

This runbook publishes the current Vite `dist` output to the isolated
`bronerbooks-site-preview` Workers Static Assets resource. It does not attach a
custom domain or route, and it does not replace the GitHub Pages deployment.

## Frozen preview contract

- Use Node.js 22.x and the repository-pinned Wrangler version.
- Build with `VITE_BASE_URL=/`, `SITE_URL=https://bronerbooks.com`, and
  `VITE_NIRAN_STORYTIME_ENABLED=false`. These are the repository defaults; clear
  conflicting shell or `.env` values before building.
- Deploy only through `wrangler.site-preview.jsonc`.
- Do not add `bronerbooks.com`, `www`, `/r/*`, or the signup API route to this
  config. Those production surfaces remain separately owned.
- Do not put Cloudflare credentials or secrets in Vite variables or the client
  bundle.

## Build and validate

From a clean checkout of the exact commit to be deployed:

```sh
npm ci
npm test
npm run lint
npm run seo:check
npm run seo:check:committed
npm run build
npm run seo:check:dist
npm run site:check:preview
git status --short
git rev-parse HEAD
```

The final `git status --short` output must be empty. The dry run is
credential-free and validates the assets-only Wrangler configuration without
creating or changing a Cloudflare resource.

## Deploy the preview

Confirm the authenticated account before the external write:

```sh
npx wrangler whoami
npm run site:deploy:preview
```

Record the exact source commit, Worker name, deployment/version identifier,
stable `workers.dev` URL, and version preview URL if Wrangler exposes one. Never
guess the account subdomain.

Smoke-test the stable preview URL with `/`, one generated `/books/<slug>` page,
`/niran-storytime-kit`, one hashed asset, and an unknown path that must return
HTTP 404 while rendering the application NotFound shell. Full route and Worker
coexistence parity belongs to Issue #30.

Post the evidence to Issue #29. A preview deployment does not authorize any
production DNS, Custom Domain, Worker route, signup activation, or GitHub Pages
change.

## S3 parity and coexistence verification

Issue #30 uses the immutable version-preview URL as its authority and the
stable preview only as a drift check. The command below is read-only. It makes
public GET requests, records only status, byte count, and an allowlist of
non-sensitive response headers, and never records cookies, request bodies,
subscriber data, or credentials.

From the exact merged tree that corresponds to the deployed preview artifact:

```sh
npm run site:parity:preview -- \
  --preview-origin https://6030742a-bronerbooks-site-preview.crab2007.workers.dev

npm run site:parity:preview -- \
  --preview-origin https://bronerbooks-site-preview.crab2007.workers.dev \
  --json
```

The command requires an HTTPS origin with no path, query, fragment, or embedded
credentials. It exits `0` only when every required repository, static/SEO,
asset/privacy, 404, Worker-coexistence, and canonical-host check passes; a
parity failure exits `1`, while invalid invocation or an operational error exits
`2`. The external checks are deliberately opt-in and are not run by `npm test`.

The current GitHub Pages origin returns `404` for trailing-slash variants such
as `/privacy/`. The Cloudflare preview must instead return `307` to the clean
canonical path under the frozen `auto-trailing-slash` contract. That difference
is intentional; a soft `200`, redirect loop, or redirect to the wrong host/path
is a failure.

### Read-only Cloudflare inventory

Capture the current CLI version and deployment inventory without deploying or
changing a route:

```sh
npx wrangler --version
npx wrangler deployments list --config wrangler.site-preview.jsonc
npx wrangler deployments list --config worker/wrangler.toml --env production
npx wrangler deployments list --config signup-worker/wrangler.jsonc --env production
```

For Issue #30, the signup command is expected to report Cloudflare error `10007`
because `bronerbooks-niran-signup-production` is intentionally nonexistent.
The repository reserves only
`bronerbooks.com/api/niran-storytime-signup`, all committed environments remain
`SIGNUP_ENABLED=false`, and this QA does not authorize deploying or attaching
that Worker. The link-resolver command must list its deployed production
version.

### Playwright CLI privacy and render QA

Do not add Playwright to this repository. Use an installed `playwright-cli` in
named, clean sessions and run it from `output/playwright/issue-30/` so temporary
snapshots and screenshots remain contained. Element references vary per
snapshot; replace each `eX` below with the matching reference from the
immediately preceding snapshot.

```sh
mkdir -p output/playwright/issue-30
cd output/playwright/issue-30

playwright-cli -s=issue30-reject open \
  https://6030742a-bronerbooks-site-preview.crab2007.workers.dev
playwright-cli -s=issue30-reject snapshot
playwright-cli -s=issue30-reject requests --static
playwright-cli -s=issue30-reject localstorage-list
playwright-cli -s=issue30-reject click eX # Reject analytics
playwright-cli -s=issue30-reject goto \
  https://6030742a-bronerbooks-site-preview.crab2007.workers.dev/privacy
playwright-cli -s=issue30-reject reload
playwright-cli -s=issue30-reject requests --static
playwright-cli -s=issue30-reject localstorage-get bronerbooks-analytics-consent

playwright-cli -s=issue30-accept open \
  https://6030742a-bronerbooks-site-preview.crab2007.workers.dev
playwright-cli -s=issue30-accept snapshot
playwright-cli -s=issue30-accept click eX # Accept analytics
playwright-cli -s=issue30-accept requests --static
playwright-cli -s=issue30-accept snapshot
playwright-cli -s=issue30-accept click eX # Privacy settings
playwright-cli -s=issue30-accept snapshot
playwright-cli -s=issue30-accept click eX # Reject analytics
playwright-cli -s=issue30-accept reload
playwright-cli -s=issue30-accept requests --static
```

Required observations:

- before a choice and after rejection/reload, no request targets Google Tag
  Manager, Google Analytics, YouTube, Spotify, or Apple Music;
- acceptance creates the single site-controlled Google tag request;
- revocation removes the tag and a subsequent reload makes no Google request;
- only the consent choice is reported from local storage; do not copy cookies or
  full storage state into evidence;
- `/niran-storytime-kit` renders the disabled/noindex application shell, has no
  signup form, and makes no POST to the reserved signup path;
- the current catalog has no optional third-party media entries, so rendered
  click-to-load QA is not applicable; the existing `ExternalMediaEmbed` unit
  test remains the executable behavior contract.

For visual coverage, inspect `/`, `/privacy`, one generated book route, and an
unknown route at both viewports:

```sh
playwright-cli -s=issue30-render resize 1440 900
playwright-cli -s=issue30-render snapshot
playwright-cli -s=issue30-render screenshot
playwright-cli -s=issue30-render eval \
  "() => document.documentElement.scrollWidth <= document.documentElement.clientWidth"

playwright-cli -s=issue30-render resize 390 844
playwright-cli -s=issue30-render snapshot
playwright-cli -s=issue30-render screenshot
playwright-cli -s=issue30-render eval \
  "() => document.documentElement.scrollWidth <= document.documentElement.clientWidth"
playwright-cli -s=issue30-render console error
```

Each route must expose its critical heading/content and usable navigation or
privacy controls, avoid horizontal overflow, and produce no application console
error. Close every named session after evidence capture.

### Evidence and stop conditions

Record:

- source commit and proof that it has the same tree as the deployed S2 commit;
- Worker name, Cloudflare version ID, stable URL, and immutable version URL;
- Node, npm, Wrangler, and browser CLI versions;
- repository gate results, parity table, and selected non-sensitive headers;
- desktop/mobile viewport results and the linked GitHub Actions run;
- whether S3 is safe or blocked for S5.

Stop and mark S5 blocked for any route collision or ambiguity, valid deep-link
404, unknown-route soft `200`, canonical/SEO regression, Privacy Notice marker
failure, pre-consent analytics/media request, artifact mismatch, paid-tier
dependency, or loss of the Pages rollback path. Do not deploy, attach a domain,
submit the signup form, activate MailerLite, or change DNS while collecting S3
evidence.

Use this shape for the Issue #30 evidence comment:

```md
## S3 preview parity evidence

- source and preview identity: ...
- repository gates: PASS/FAIL
- version-preview parity: PASS/FAIL (paste or link sanitized table)
- stable-preview drift check: PASS/FAIL
- Worker coexistence and reserved signup boundary: PASS/FAIL
- privacy/analytics/browser QA: PASS/FAIL
- desktop/mobile render QA: PASS/FAIL
- production DNS/domain mutation: none

**S5 disposition:** S3 evidence is safe for S5, subject to S4 completion and
the mandatory immediate pre-cutover control-plane snapshot.
```
