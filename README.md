# Broner Books

Website for Broner Books — multilingual and bilingual children's titles.

## Local development

```sh
npm install
npm run dev
```

## Build

The approved public legal identity, postal address, and Privacy Notice approval state are versioned in:

```text
src/config/public-identity.json
```

That file is intentionally public. It contains the public controller/contact details used by the website, including the approved public P.O. box, and the dated Privacy Notice approval/effective-date record. Never replace it with a residential address.

Production builds run `npm run privacy:check` and fail if the public postal address is unresolved, publication approval is not recorded, or the approval/effective dates are missing.

```sh
npm run build
```

Pull-request checks use `npm run build:verify` to build the proposed site without deploying it.

## SEO workflow

After the publish pipeline refreshes `src/generated/seo/manifest.json`, run the SEO checks from this directory:

```sh
npm run seo:check
npm run build
npm run seo:check:dist
```

For the full local SEO smoke sequence, run:

```sh
npm run seo:smoke
```

Credential-gated Search Console setup, sitemap submission, and post-deploy inspection steps live in `docs/search-console.md`.

## Analytics

Google Analytics 4 is configured for the site with measurement ID `G-DD2217GBC7`. Set `VITE_GA_MEASUREMENT_ID` in the hosting environment to override it.

The Niran Storytime integration is fail-closed. `VITE_NIRAN_STORYTIME_ENABLED` must equal `true` for the campaign route to render; the default production build serves the normal 404. Controlled local QA may set `SIGNUP_WORKER_DEV_URL=http://127.0.0.1:8787` to proxy the exact signup endpoint to a local Wrangler process. See [`docs/runbooks/niran-signup-worker.md`](docs/runbooks/niran-signup-worker.md#website-publication-gate).

See `docs/GOOGLE_ANALYTICS.md` for setup, deployment verification, and weekly report review steps.

## Generated book data

Book data and book images are generated and published from `juna_lumturo_retejo`.

This repo only consumes committed generated artifacts:

```sh
src/generated/books/catalog.json
public/generated/books/images/
```

No sync or pull scripts live in this repo anymore. Refresh those generated files from `juna_lumturo_retejo` with its `tools/ingest_cli.py --publish-target book-explorer-global --target-repo ...` flow.

## Link Worker operations

The owned `/r/...` resolver has a separate, protected manual path. Start with local-safe commands in the [Link Worker runbook](docs/runbooks/link-worker.md); the static GitHub Pages deployment remains separate.
