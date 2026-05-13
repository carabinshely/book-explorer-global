# Broner Books

Website for Broner Books — multilingual and bilingual children's titles.

## Local development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

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
