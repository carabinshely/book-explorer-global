# Link Worker: first-maintainer runbook

The static GitHub Pages workflow (`.github/workflows/deploy.yml`) remains
independent. This runbook covers only `worker/`, which resolves owned `/r/...`
links. Local commands are fail-closed and do not retrieve credentials, call
Cloudflare, or deploy unless `--execute` is used inside the manual workflow.

## Pinned runtime and local checks

Use Node **22.16.0** (the CI pin) and npm. The Worker CLI is pinned at
`wrangler@4.32.0` only when an approved workflow executes it.

```sh
npm ci
npm run links:check
npm run links:test
npm run links:preview
npm run links:smoke:local
npm run links:deploy:preview -- --check
npm run links:smoke:preview -- --check
npm run links:deploy:production -- --version exactWorkerVersion --check
npm run links:smoke:production -- --check
npm run links:rollback -- --environment production --version exactWorkerVersion --check
```

`links:check`, `links:test`, and `links:smoke:local` are fully local. A remote
smoke uses only a query-free `LINK_SMOKE_URL`; the default `--check` reports its
plan without making a request. Every production deployment or rollback requires
a syntactically exact version ID. Without `--execute`, deployment and rollback
refuse rather than guess.

## Protected manual promotion

Configure GitHub environments **before** using
[`link-worker-promotion.yml`](../../.github/workflows/link-worker-promotion.yml):

- `link-worker-preview`: reviewer protection appropriate to preview work.
- `link-worker-production`: required reviewers and a deployment wait timer.
- Secret names only: `CLOUDFLARE_API_TOKEN_LINKS_PREVIEW` and
  `CLOUDFLARE_API_TOKEN_LINKS_PRODUCTION`; scope both to their matching
  environment and grant the least Cloudflare permission needed to deploy this
  Worker. Never put values in repository variables, logs, or issues.
- Variable: `LINK_SMOKE_URL`, a query-free HTTPS Worker URL in the matching
  environment.

The manual workflow has `contents: read` only, serializes each environment, and
sets `WRANGLER_LOG=error`. Select `check` first. An authorized reviewer then
selects `deploy` or `rollback`; production requires the exact already-known
Worker version ID. Capture only status, headers, version ID, commit, timestamp,
and the query-free URL in release evidence.

## Recovery and rollback

Do not modify the static Pages deployment to repair a resolver. First run local
checks, identify a previously healthy Worker version, and use the dry-run above.
A protected reviewer performs the exact-version rollback in the manual workflow.
If a token or protected environment is unavailable, stop: this repository does
not provide or retrieve credentials.
