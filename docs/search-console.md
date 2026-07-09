# Search Console runbook

This runbook covers BronerBooks.com SEO measurement readiness. Repository agents may prepare files and checks, but Google Search Console verification, sitemap submission, DNS changes, GA/GTM changes, and account inspection are credential-gated operator actions.


## Local MCP setup pointer

Local Codex/MCP setup for Google Search Console and GA4 lives in the umbrella root runbook: `../../docs/seo-analytics-mcp.md` relative to this file, or `docs/seo-analytics-mcp.md` from the umbrella root. This website document owns deployed Search Console verification and baseline execution only; do not duplicate local credential or MCP setup here.

## Repo-complete preflight

Run from `book-explorer-global/` after the publish pipeline has generated `src/generated/seo/manifest.json`:

```bash
npm run seo:check
npm run build
npm run seo:check:dist
```

Before submitting anything, confirm the deployed public URLs return crawlable 200 responses without authentication:

- `https://bronerbooks.com/`
- `https://bronerbooks.com/books`
- `https://bronerbooks.com/about`
- `https://bronerbooks.com/contact`
- `https://bronerbooks.com/sitemap.xml`
- `https://bronerbooks.com/robots.txt`
- one representative `https://bronerbooks.com/books/{slug}` from the sitemap

Redirects are acceptable only when the final URL is HTTPS, crawlable, and preserves the canonical policy: root may end in `/`; all other canonical routes omit a trailing slash.

## Credential-gated verification boundary

Only an operator with the relevant Google property access should verify Search Console. Acceptable verification methods include:

1. Domain property via DNS TXT record.
2. URL-prefix property via uploaded HTML file.
3. URL-prefix property via HTML meta tag.
4. Existing Google Analytics 4 tag, if the same Google account has access to the BronerBooks GA4 property. The current site includes measurement ID `G-DD2217GBC7`, but that does not prove Search Console access by itself.
5. Existing Google Tag Manager container, if the operator controls it.

Do not commit secrets, DNS tokens, Search Console verification files, or operator-only screenshots unless the operator explicitly requests that repository artifact.

## Sitemap submission

After verification succeeds in Search Console:

1. Open the verified `https://bronerbooks.com/` property.
2. Go to **Indexing → Sitemaps**.
3. Submit `https://bronerbooks.com/sitemap.xml`.
4. Confirm Search Console reports the sitemap as fetched and parsed.
5. Use URL Inspection for `/`, `/books`, and one representative book URL.

If Search Console reports a parse or fetch error, first rerun `npm run seo:check` and confirm `robots.txt` contains exactly the canonical sitemap line for the deployed host.

## Monthly baseline template

Record this baseline monthly, and after major catalog publishes:

- Date and property checked.
- Submitted sitemap status and last read time.
- Indexed page count.
- Discovered URL count.
- Coverage/indexing errors and affected URL examples.
- Top queries and impressions/clicks.
- Top pages and impressions/clicks.
- Representative book URL inspection status.
- CTA metrics where available: Amazon/retailer outbound clicks, email clicks, contact clicks, and other primary conversion events.
- GA4 landing pages and engagement for organic search traffic.

## Troubleshooting checklist

- `robots.txt` must link to `https://bronerbooks.com/sitemap.xml`.
- Sitemap URLs must be unique, HTTPS, and no-trailing-slash except root.
- `lastmod` values must be stable `YYYY-MM-DD` content dates, not build dates.
- `/books`, `/about`, `/contact`, and every book URL in the sitemap must have a deployed `index.html` or host rewrite proof.
- Generated book pages must contain one page-specific title, description, canonical, Open Graph/Twitter metadata set, and one Book JSON-LD script.
- Hreflang is intentionally absent until reciprocal alternates are generated and validated.
