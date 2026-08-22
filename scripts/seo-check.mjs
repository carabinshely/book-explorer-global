import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_VERSION = "book-explorer-global-seo-v1";
const DEFAULT_SITE_URL = "https://bronerbooks.com";
const REQUIRED_STATIC_PATHS = new Set(["/", "/books", "/about", "/contact", "/privacy"]);
const NON_INDEXED_SHELLS = [
  { path: "/niran-storytime-kit", robots: "noindex,nofollow" },
  { path: "/404", robots: "noindex,follow" },
];
const MAX_SEO_DESCRIPTION_LENGTH = 161;
const HTML_TAG_PATTERN = /<[^>]+>/;
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

const assertPlainDescription = (description, label) => {
  if (typeof description !== "string" || description.trim().length === 0) {
    fail(`${label} requires a non-empty description.`);
    return;
  }
  if (HTML_TAG_PATTERN.test(description)) {
    fail(`${label}.description must be stripped plain text.`);
  }
  if (description.length > MAX_SEO_DESCRIPTION_LENGTH) {
    fail(`${label}.description must be length-bounded to ${MAX_SEO_DESCRIPTION_LENGTH} characters.`);
  }
};

const routeOutputPath = (path) =>
  path === "/" ? join(cwd, "dist", "index.html") : join(cwd, "dist", `${path.slice(1)}.html`);

const parseSitemapLocs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

const parseModuleScriptSources = (html) =>
  [
    ...html.matchAll(
      /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["']([^"']+)["'])[^>]*>/gi
    ),
  ].map((match) => match[1]);

const assertPreviewConfig = () => {
  const configPath = join(cwd, "wrangler.site-preview.jsonc");
  const config = readJson(configPath, "Cloudflare static-site preview config");
  if (config.name !== "bronerbooks-site-preview") fail("preview Worker name must be bronerbooks-site-preview.");
  if (config.compatibility_date !== "2026-08-22") fail("preview Worker compatibility_date must be 2026-08-22.");
  if (config.workers_dev !== true) fail("preview Worker must keep workers_dev enabled.");
  if (config.preview_urls !== true) fail("preview Worker must keep preview_urls enabled.");
  if (config.assets?.directory !== "./dist") fail("preview Worker assets.directory must be ./dist.");
  if (config.assets?.html_handling !== "auto-trailing-slash") {
    fail("preview Worker must use auto-trailing-slash HTML handling.");
  }
  if (config.assets?.not_found_handling !== "404-page") {
    fail("preview Worker must use 404-page handling, never blanket SPA fallback.");
  }
  if (config.assets?.binding !== undefined || config.assets?.run_worker_first !== undefined) {
    fail("preview Worker must remain assets-only with no binding or run_worker_first layer.");
  }

  const forbiddenKeys = [
    "main",
    "route",
    "routes",
    "env",
    "vars",
    "triggers",
    "services",
    "kv_namespaces",
    "r2_buckets",
    "d1_databases",
    "durable_objects",
  ];
  for (const key of forbiddenKeys) {
    if (config[key] !== undefined) fail(`preview Worker config must not define ${key}.`);
  }
};

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
  if (!page.title) fail(`${label} requires title.`);
  assertPlainDescription(page.description, label);
  if (Array.isArray(page.alternate_paths) && page.alternate_paths.length > 0) fail(`${label}.alternate_paths must be omitted until reciprocal hreflang validation exists.`);
}

for (const requiredPath of REQUIRED_STATIC_PATHS) {
  if (!paths.has(requiredPath)) fail(`missing required static path ${requiredPath}.`);
}
for (const { path } of NON_INDEXED_SHELLS) {
  if (paths.has(path)) fail(`${path} must remain outside the SEO manifest and sitemap.`);
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
  assertPreviewConfig();

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
    const manifestImage = Array.isArray(representative.images) ? representative.images.find(Boolean) : undefined;
    if (manifestImage && !html.includes(`${baseUrl}${manifestImage}`)) fail("representative page metadata does not include the manifest image URL.");
  }

  const indexHtml = readText(routeOutputPath("/"), "dist application shell");
  const indexModuleScripts = parseModuleScriptSources(indexHtml);
  if (indexModuleScripts.length === 0) fail("dist application shell must load at least one module script.");

  for (const shell of NON_INDEXED_SHELLS) {
    const html = readText(routeOutputPath(shell.path), `non-indexed shell ${shell.path}`);
    const moduleScripts = parseModuleScriptSources(html);
    if (JSON.stringify(moduleScripts) !== JSON.stringify(indexModuleScripts)) {
      fail(`${shell.path} must load the same compiled module scripts as dist/index.html.`);
    }
    if (!/<div\s+id=["']root["']><\/div>/i.test(html)) {
      fail(`${shell.path} must contain the React application root.`);
    }
    const robots = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["'][^>]*>/i)?.[1];
    if (robots !== shell.robots) fail(`${shell.path} must use robots=${shell.robots}.`);
    if (/<link\s+rel=["']canonical["']/i.test(html)) fail(`${shell.path} must not emit a canonical link.`);
    if (/type=["']application\/ld\+json["']/i.test(html)) fail(`${shell.path} must not emit JSON-LD.`);
    if (html.includes("window.location.replace") || html.includes("/?/") || html.includes("~and~")) {
      fail(`${shell.path} must not contain the legacy GitHub Pages redirect shim.`);
    }
  }
}

if (process.exitCode) process.exit();
console.log(`[seo:check] ${mode} SEO checks passed for ${pages.length} URLs.`);
