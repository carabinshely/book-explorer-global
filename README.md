# Broner Books

Website for Broner Books — multilingual and bilingual children's titles.

## Local development

```sh
npm install
npm run dev
```

## Build

Production builds require the approved public PO box or commercial-mailbox
address. Copy `.env.example` to a local environment file or configure the
hosting environment, then replace the placeholder:

```sh
VITE_PUBLIC_MAILBOX_ADDRESS=your-approved-public-mailbox
PRIVACY_NOTICE_APPROVED=true
```

Never use a residential address. The build intentionally fails while this
value is missing or still a placeholder, or until the owner/legal reviewer and
approval date are recorded and `PRIVACY_NOTICE_APPROVED` is explicitly true.

```sh
npm run build
```

Pull-request checks use `npm run build:verify` to create a conspicuous,
test-only artifact. That command bypasses the publication gate but is never used
or uploaded by the deployment workflow.

## SEO workflow

After the publish pipeline refreshes `src/generated/seo/manifest.json`, run the
SEO checks from this directory:

```sh
npm run seo:check
npm run build
npm run seo:check:dist
```

For the full local SEO smoke sequence, run:

```sh
npm run seo:smoke
```

Credential-gated Search Console setup, sitemap submission, and post-deploy
inspection steps live in `docs/search-console.md`.

## Analytics

Google Analytics 4 is configured for the site with measurement ID
`G-DD2217GBC7`. Set `VITE_GA_MEASUREMENT_ID` in the hosting environment to
override it.

See `docs/GOOGLE_ANALYTICS.md` for setup, deployment verification, and weekly
report review steps.

## Generated book data

Book data and book images are generated and published from `juna_lumturo_retejo`.

This repo only consumes committed generated artifacts:

```sh
src/generated/books/catalog.json
public/generated/books/images/
```

No sync or pull scripts live in this repo anymore. Refresh those generated files from `juna_lumturo_retejo` with its `tools/ingest_cli.py --publish-target book-explorer-global --target-repo ...` flow.

## Link Worker operations

The owned `/r/...` resolver has a separate, protected manual path. Start with
local-safe commands in the [Link Worker runbook](docs/runbooks/link-worker.md);
the static GitHub Pages deployment remains separate.
