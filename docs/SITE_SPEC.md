# Site Spec

> [!note]
> Purpose: [[docs/AGENTS#docs/SITE_SPEC.md]].

## Goals and non-goals

Goals:
- Provide a clear, multilingual catalog of books with edition-level detail.
- Drive outbound traffic to Amazon product pages.
- Keep content updates low-friction via the ingest pipeline.
- Remain static and low-maintenance while supporting previews for new changes.

Non-goals:
- No on-site checkout or embedded Amazon cart.
- No user accounts or personalization beyond language preference.

## Page map and routes

Primary routes:
- `/` (home)
- `/books` (catalog)
- `/books/{slug}` (product detail)
- `/about`
- `/contact`

Canonical route policy: use no trailing slash except for `/`. UI language is
client-side state, not a URL prefix. Do not emit `hreflang` until reciprocal
alternate relationships are explicit and validated.

Routing example: [[docs/EXAMPLES#Routing Example]].

## Navigation and layout

- Header includes logo/site name, primary nav, and language switcher.
- Footer includes about/contact links and legal text.
- Language switcher is visible on all pages.

## Page-by-page requirements

### Home

- Show site name and short tagline.
- Provide clear entry to the catalog.

### Books catalog

- Show a grid/list of SKUs with cover image, title, and languages.
- Each item links to its product detail page.

### Product detail

- Show title, description, specs, and gallery images.
- Gallery must be scrollable on a static site (client-side).
- Show Amazon outbound link (primary CTA).
- Show media embeds when available.
- Show “Other editions & languages” for same `work_id`.

### About

- Short mission/about text (localized).

### Contact

- Provide contact method or form (static-friendly).

## Data dependencies

The site is rendered from published generated data in `src/generated/books/catalog.json` plus `i18n/*` and static assets under `public/generated/books/images/`.

Content model requirements:
- One published catalog payload contains all Works and SKUs for the site build.
- `languages` reflects content languages; bilingual SKUs include both.
- Media entries can be per-language or `mixed` for bilingual editions.
- SKU image rendering uses published `cover_image` and `gallery_images` fields.

Per-page data needs:
- Home/About/Contact: `i18n/{lang}.json` (site strings).
- Catalog: `src/generated/books/catalog.json`.
- Product detail: a SKU plus its Work and sibling SKUs (same `work_id`).

Examples: [[docs/EXAMPLES#Normalized Work (Site Output)]], [[docs/EXAMPLES#Normalized SKU (Mono)]], [[docs/EXAMPLES#Normalized SKU (Bilingual)]].

## i18n behavior

- UI language is client-side state selected by the language toggle and persisted locally; it is not part of canonical route paths.
- Content languages live on SKU data (`languages`).
- Strings come from `i18n/{ui_lang}.json`.
- Planned: browser-locale default with English fallback and persistent user toggle.

Related policy: [[docs/ARCHITECTURE#Routing, i18n, and SEO]].

## Media and embeds

- Spotify, Apple Music, and YouTube embeds are shown only when links exist.
- Gallery supports multiple images per SKU or work.
- Bilingual editions may include per-language links per service.

Example snippet: [[docs/EXAMPLES#Gallery and Media Embed Snippet]].

## SEO requirements

- Defer `hreflang` output until reciprocal alternate URLs are generated and validated; do not emit guessed alternates from UI language variants alone.
- Planned: JSON-LD for `Book`, `Product`, `Organization`, `BreadcrumbList`.
- Planned: localized metadata (titles/descriptions/JSON-LD) per UI language.

## Accessibility requirements

- Images must include alt text.
- Gallery controls must be keyboard accessible.
- Media embeds should have accessible titles/labels.

## Analytics and legal

- Google Analytics 4 is installed for basic traffic, page-view, and outbound
  Amazon CTA measurement. The default measurement ID is `G-DD2217GBC7`; hosting
  environments may override it with `VITE_GA_MEASUREMENT_ID`.
- Custom campaign links should use the UTM rules maintained in
  `bronerbooks-marketing-ops/07_automation/utm-rules.yaml`.
- Analytics reporting and review workflow lives in
  `docs/GOOGLE_ANALYTICS.md`.
- Disclose analytics usage in the privacy/legal experience before broader paid
  traffic campaigns.
- Provide Privacy/Terms pages if required by hosting or embeds.

## Hosting and previews (planned)

- Support multiple domains pointing to the same site.
- Allow per-domain default UI language.
- Provide a preview environment for testing changes.
