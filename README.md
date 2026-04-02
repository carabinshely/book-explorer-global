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

## Generated book data

Book data and book images are generated and published from `juna_lumturo_retejo`.

This repo only consumes committed generated artifacts:

```sh
src/generated/books/catalog.json
public/generated/books/images/
```

No sync or pull scripts live in this repo anymore. Refresh those generated files from `juna_lumturo_retejo` with its `tools/publish_site.py` command.
