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

## Data sync pipeline

Book data and images are generated in another repo and synced here.

1) Run the generator script (from the other repo).
2) It should output JSON/images into `src/data` and `src/assets/images`.
3) It should also update these index files so imports stay consistent:
   - `src/data/skus/index.ts`
   - `src/data/works/index.ts`
   - `src/assets/images/index.ts`

To run the sync wrapper from this repo:

```sh
npm run sync:data -- /path/to/generator-script.sh
```
