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
