# Link Worker: first-maintainer runbook

The static GitHub Pages workflow (`.github/workflows/deploy.yml`) remains
independent. This runbook covers only `worker/`, which resolves owned `/r/...`
links. Local commands are fail-closed and do not retrieve credentials, call
Cloudflare, or deploy unless `--execute` is used inside the manual workflow.

## Pinned runtime and local checks

Use Node **22.16.0** (the CI pin) and npm. The Worker CLI is pinned in `devDependencies` at `wrangler@4.32.0`; `npm ci` installs its platform optional dependency before an approved workflow executes it.

```sh
npm ci
npm run links:check
npm run links:test
npm run links:preview
npm run links:smoke:local
npm run links:deploy:preview -- --check
npm run links:smoke:preview -- --check
npm run links:deploy:production -- --version exactWorkerVersion --check
npm run links:attach-route -- --environment production --version exactWorkerVersion --check
npm run links:smoke:production -- --check
npm run links:rollback -- --environment production --version exactWorkerVersion --check
```

`links:check`, `links:test`, and `links:smoke:local` are fully local. A remote
smoke accepts only a query-free, fragment-free HTTPS origin/base `LINK_SMOKE_URL`; it appends the approved `/r/niran-storytime-kit-v1-en-p5-book` route and rejects path-bearing URLs to avoid ambiguity. The default `--check` reports its plan without making a request. A remote preview smoke sends query input only to prove it is dropped, then requires GET and HEAD to return the exact 302 destination plus the security and no-store cache headers. Production deployment uses the env-suffixed Worker name `bronerbooks-link-resolver-production`. On first deployment it safely bootstraps that missing Worker with the route-free `worker/wrangler.bootstrap.toml` through Wrangler `deploy`, captures the returned version, and verifies the checked-out manifest digest; later deployments upload the checked-out commit artifact and deploy that exact version and attaches only
`bronerbooks.com/r/*`. The production Worker configuration sets `workers_dev=false`
and `preview_urls=false`; no non-`/r` website path is routed to it. Every rollback
(including preview) requires a syntactically exact healthy version ID. Without `--execute`, deployment and rollback
refuse rather than guess.

## Protected manual promotion

Configure GitHub environments **before** using
[`link-worker-promotion.yml`](../../.github/workflows/link-worker-promotion.yml):

- `link-worker-preview`: reviewer protection appropriate to preview work.
- `link-worker-production`: required reviewers and a deployment wait timer.
- Secret names only: `CLOUDFLARE_API_TOKEN_LINKS_PREVIEW`,
  `CLOUDFLARE_API_TOKEN_LINKS_PRODUCTION`, and production-only
  `MARKETING_REPO_DEPLOY_KEY`. The latter is a read-only SSH deploy key for
  `carabinshely/bronerbooks-marketing-ops`; it lets the protected workflow
  check out the exact compiler commit embedded in the fixture before upload.
  Scope all secrets to their matching
  environment and grant the least Cloudflare permission needed to upload/deploy versions, attach routes, and read the configured `bronerbooks.com` zone; the workflow verifies Zone Read before route attachment. Never put values in repository variables, logs, or issues.
- Variables: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID` (the `bronerbooks.com` zone ID, explicitly checked so route attachment cannot silently depend on Zone Read), and
  `LINK_SMOKE_URL`, a query-free, fragment-free HTTPS Worker origin/base URL in the matching environment. Preview may use its configured Worker origin (for example `https://preview-worker.example.workers.dev`); production smoke rejects every value except `https://bronerbooks.com`. Do not include a resolver path, query string, fragment, or credentials.
  The account ID is configuration metadata (not a secret); setting it prevents
  Wrangler from discovering an account through the `/memberships` endpoint.

The manual workflow has `contents: read` only and serializes each environment.
GitHub masks secret values, and Wrangler uses its default sanitized, non-debug
logging so fatal diagnostics remain visible. Before an approved operation, the
workflow verifies the token through Cloudflare's token-verification endpoint and
prints only a fixed success or failure message; it does not print the token,
account ID, or API response. `CLOUDFLARE_ACCOUNT_ID` is then supplied to Wrangler
for the approved operation, avoiding account auto-discovery. Select `check`
first. An authorized reviewer then selects `deploy` or `rollback`;
production deploy captures the new exact Worker version ID from the commit artifact;
rollback requires the exact already-known healthy version ID. Capture only status,
headers, version ID, commit, timestamp, the canonical route, and the query-free URL
in release evidence. Route eligibility is independent of physical shipment.

## Recovery and rollback

Do not modify the static Pages deployment to repair a resolver. First run local
checks, identify a previously healthy Worker version, and use the dry-run above.
A protected reviewer performs the exact-version rollback in the manual workflow. If the route itself is suspect, leave it detached by stopping after the rollback before any route-attach step; do not redirect unrelated site paths.
If a token or protected environment is unavailable, stop: this repository does
not provide or retrieve credentials.
