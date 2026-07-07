import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_VERSION = "book-explorer-global-seo-v1";
const DEFAULT_SITE_URL = "https://bronerbooks.com";
const REQUIRED_STATIC_PATHS = new Set(["/", "/books", "/about", "/contact"]);
const mode = process.argv.includes("--dist") ? "dist" : "source";
const baseUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
const cwd = process.cwd();

const fail = (message) => {
  console.error(`[seo:check] ${message}`);
  process.exitCode = 1;
};

const die = (message) => {
  fail(message);
  process.exit();
};

const readJson = (path, label) => {
  if (!existsSync(path)) {
    die(`${label} is missing at ${path}. Run the JLR publish flow to generate src/generated/seo/manifest.json.`);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    die(`${label} is invalid JSON: ${error.message}`);
  }
};

const readText = (path, label) => {
  if (!existsSync(path)) die(`${label} is missing at ${path}.`);
  return readFileSync(path, "utf8");
};

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const assertPath = (path, label) => {
  if (typeof path !== "string" || !path.startsWith("/")) fail(`${label} must start with '/'.`);
  if (typeof path === "string" && path.length > 1 && path.endsWith("/")) fail(`${label} must not have a trailing slash except root: ${path}.`);
  const segments = typeof path === "string" ? path.split("/").filter(Boolean) : [];
  if (segments.some((segment) => segment === "." || segment === "..")) fail(`${label} must not contain dot segments: ${path}.`);
};

const assertLastmod = (lastmod, label) => {
  if (typeof lastmod !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) {
    fail(`${label}.lastmod must be YYYY-MM-DD.`);
    return;
  }
  const parsed = new Date(`${lastmod}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== lastmod) {
    fail(`${label}.lastmod is not a real date: ${lastmod}.`);
  }
};

const routeOutputPath = (path) =>
  path === "/" ? join(cwd, "dist", "index.html") : join(cwd, "dist", path.slice(1), "index.html");

const parseSitemapLocs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

const manifestPath = join(cwd, "src", "generated", "seo", "manifest.json");
const catalogPath = join(cwd, "src", "generated", "books", "catalog.json");
const manifest = readJson(manifestPath, "SEO manifest");
const catalog = readJson(catalogPath, "Book catalog");

if (manifest.schema_version !== SCHEMA_VERSION) fail(`manifest.schema_version must be ${SCHEMA_VERSION}.`);
if (manifest.site?.base_url !== baseUrl) fail(`manifest.site.base_url must match SITE_URL (${baseUrl}).`);
if (!isHttpsUrl(baseUrl)) fail(`SITE_URL must be HTTPS: ${baseUrl}.`);
if (!Array.isArray(manifest.static_pages) || manifest.static_pages.length === 0) fail("manifest.static_pages must be non-empty.");
if (!Array.isArray(manifest.book_pages) || manifest.book_pages.length === 0) fail("manifest.book_pages must be non-empty.");

const pages = [
  ...(manifest.static_pages || []).map((page, index) => [page, `static_pages[${index}]`]),
  ...(manifest.book_pages || []).map((page, index) => [page, `book_pages[${index}]`]),
];
const paths = new Set();
for (const [page, label] of pages) {
  assertPath(page.path, `${label}.path`);
  assertLastmod(page.lastmod, label);
  if (paths.has(page.path)) fail(`duplicate path ${page.path}.`);
  paths.add(page.path);
  if (!page.title || !page.description) fail(`${label} requires title and description.`);
  if (Array.isArray(page.alternate_paths) && page.alternate_paths.length > 0) fail(`${label}.alternate_paths must be omitted until reciprocal hreflang validation exists.`);
}

for (const requiredPath of REQUIRED_STATIC_PATHS) {
  if (!paths.has(requiredPath)) fail(`missing required static path ${requiredPath}.`);
}

const skuIds = new Set((catalog.skus || []).map((sku) => sku.sku_id));
for (const [page, label] of (manifest.book_pages || []).map((page, index) => [page, `book_pages[${index}]`])) {
  if (!page.sku_id || !skuIds.has(page.sku_id)) fail(`${label}.sku_id does not join to catalog: ${page.sku_id}.`);
}

const robots = readText(join(cwd, "public", "robots.txt"), "robots.txt");
const expectedSitemapLine = `Sitemap: ${baseUrl}/sitemap.xml`;
if (!robots.split(/\r?\n/).map((line) => line.trim()).includes(expectedSitemapLine)) {
  fail(`robots.txt must include '${expectedSitemapLine}'.`);
}

const sitemapPath = join(cwd, mode === "dist" ? "dist" : "public", "sitemap.xml");
const sitemap = readText(sitemapPath, `${mode} sitemap`);
const locs = parseSitemapLocs(sitemap);
const expectedLocs = [...paths].map((path) => `${baseUrl}${path}`);
if (locs.length !== expectedLocs.length) fail(`${mode} sitemap URL count ${locs.length} does not match manifest ${expectedLocs.length}.`);
if (new Set(locs).size !== locs.length) fail(`${mode} sitemap contains duplicate <loc> entries.`);
for (const expected of expectedLocs) {
  if (!locs.includes(expected)) fail(`${mode} sitemap missing ${expected}.`);
}
for (const loc of locs) {
  if (!expectedLocs.includes(loc)) fail(`${mode} sitemap has URL not present in manifest: ${loc}.`);
  const path = new URL(loc).pathname;
  if (path.length > 1 && path.endsWith("/")) fail(`${mode} sitemap URL has trailing slash: ${loc}.`);
}

if (mode === "dist") {
  for (const path of paths) {
    const outputPath = routeOutputPath(path);
    if (!existsSync(outputPath)) fail(`dist route is missing for ${path}: expected ${outputPath}.`);
  }

  const representative = manifest.book_pages?.[0];
  if (representative) {
    const html = readText(routeOutputPath(representative.path), `representative book page ${representative.path}`);
    const titleCount = (html.match(/<title>/gi) || []).length;
    const descriptionCount = (html.match(/<meta\s+name=["']description["']/gi) || []).length;
    const canonicalCount = (html.match(/<link\s+rel=["']canonical["']/gi) || []).length;
    const jsonLdCount = (html.match(/type=["']application\/ld\+json["']/gi) || []).length;
    if (titleCount !== 1) fail(`representative page must have exactly one <title>; found ${titleCount}.`);
    if (descriptionCount !== 1) fail(`representative page must have exactly one meta description; found ${descriptionCount}.`);
    if (canonicalCount !== 1) fail(`representative page must have exactly one canonical link; found ${canonicalCount}.`);
    if (jsonLdCount !== 1) fail(`representative page must have exactly one JSON-LD script; found ${jsonLdCount}.`);
    if (html.includes("hreflang=")) fail("dist pages must not emit hreflang until reciprocal alternates are validated.");
    if (!html.includes(`href=\"${baseUrl}${representative.path}\"`)) fail("representative page canonical does not match manifest path.");
  }
}

if (process.exitCode) process.exit();
console.log(`[seo:check] ${mode} SEO checks passed for ${pages.length} URLs.`);
