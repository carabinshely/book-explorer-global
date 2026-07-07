import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_VERSION = "book-explorer-global-seo-v1";
const REQUIRED_STATIC_PATHS = new Set(["/", "/books", "/about", "/contact"]);
const DEFAULT_SITE_URL = "https://bronerbooks.com";
const manifestPath = join(process.cwd(), "src", "generated", "seo", "manifest.json");
const robotsPath = join(process.cwd(), "public", "robots.txt");
const sitemapPath = join(process.cwd(), "public", "sitemap.xml");

const fail = (message) => {
  throw new Error(`[seo:sitemap] ${message}`);
};

const configuredBaseUrl = () =>
  (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");

const readJson = (path, label) => {
  if (!existsSync(path)) {
    fail(
      `${label} is missing at ${path}. Run the JLR publish flow to generate the SEO manifest before building SEO artifacts.`,
    );
  }

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
};

const xmlEscape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const isAbsoluteHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
};

const assertPathPolicy = (path, label) => {
  if (typeof path !== "string" || !path.startsWith("/")) {
    fail(`${label} must be an absolute site path starting with '/'. Received ${JSON.stringify(path)}.`);
  }
  if (path.length > 1 && path.endsWith("/")) {
    fail(`${label} violates canonical path policy: no trailing slash except root (${path}).`);
  }
  if (path.includes("//")) {
    fail(`${label} must not contain duplicate slashes (${path}).`);
  }
  const segments = path.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    fail(`${label} must not contain dot segments (${path}).`);
  }
};

const assertLastmod = (lastmod, label) => {
  if (typeof lastmod !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) {
    fail(`${label} lastmod must use YYYY-MM-DD. Received ${JSON.stringify(lastmod)}.`);
  }

  const parsed = new Date(`${lastmod}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== lastmod) {
    fail(`${label} lastmod is not a real calendar date: ${lastmod}.`);
  }
};

const normalizePageEntries = (manifest) => {
  const staticPages = manifest.static_pages;
  const bookPages = manifest.book_pages;

  if (!Array.isArray(staticPages) || staticPages.length === 0) {
    fail("manifest.static_pages must be a non-empty array.");
  }
  if (!Array.isArray(bookPages) || bookPages.length === 0) {
    fail("manifest.book_pages must be a non-empty array.");
  }

  const pages = [];

  for (const [index, page] of staticPages.entries()) {
    pages.push({ ...page, __label: `static_pages[${index}]` });
  }
  for (const [index, page] of bookPages.entries()) {
    pages.push({ ...page, __label: `book_pages[${index}]` });
  }

  return { staticPages, bookPages, pages };
};

const pageImages = (page, label) => {
  const rawImages = Array.isArray(page.images)
    ? page.images
    : page.image
      ? [page.image]
      : page.cover_image
        ? [page.cover_image]
        : [];

  return rawImages.map((image, index) => {
    const source = typeof image === "string" ? { url: image } : image;
    const url = source?.url || source?.loc;
    if (typeof url !== "string" || url.length === 0) {
      fail(`${label} image[${index}] must include a non-empty url.`);
    }

    const absoluteUrl = url.startsWith("/") ? `${configuredBaseUrl()}${url}` : url;
    if (!isAbsoluteHttpsUrl(absoluteUrl)) {
      fail(`${label} image[${index}] must be an absolute HTTPS URL or root-relative path. Received ${JSON.stringify(url)}.`);
    }

    return {
      loc: absoluteUrl,
      caption: source.caption || source.title || source.alt,
      title: source.title,
    };
  });
};

export const loadAndValidateManifest = () => {
  const manifest = readJson(manifestPath, "SEO manifest");
  const baseUrl = configuredBaseUrl();

  if (manifest.schema_version !== SCHEMA_VERSION) {
    fail(`manifest.schema_version must be ${SCHEMA_VERSION}. Received ${JSON.stringify(manifest.schema_version)}.`);
  }
  if (manifest.site?.base_url !== baseUrl) {
    fail(`manifest.site.base_url (${JSON.stringify(manifest.site?.base_url)}) must match SITE_URL (${baseUrl}).`);
  }
  if (!isAbsoluteHttpsUrl(baseUrl)) {
    fail(`SITE_URL must resolve to an absolute HTTPS URL. Received ${JSON.stringify(baseUrl)}.`);
  }

  const { staticPages, bookPages, pages } = normalizePageEntries(manifest);
  const staticPathSet = new Set(staticPages.map((page) => page.path));
  for (const requiredPath of REQUIRED_STATIC_PATHS) {
    if (!staticPathSet.has(requiredPath)) {
      fail(`manifest.static_pages is missing required route ${requiredPath}.`);
    }
  }

  const seen = new Set();
  for (const page of pages) {
    const label = page.__label;
    assertPathPolicy(page.path, `${label}.path`);
    assertLastmod(page.lastmod, label);
    if (seen.has(page.path)) {
      fail(`duplicate sitemap path in manifest: ${page.path}.`);
    }
    seen.add(page.path);

    if (typeof page.title !== "string" || page.title.trim().length === 0) {
      fail(`${label}.title must be non-empty.`);
    }
    if (typeof page.description !== "string" || page.description.trim().length === 0) {
      fail(`${label}.description must be non-empty.`);
    }
    if (Array.isArray(page.alternate_paths) && page.alternate_paths.length > 0) {
      fail(`${label}.alternate_paths is not supported yet; hreflang is deferred until reciprocal alternates are validated.`);
    }

    page.__images = pageImages(page, label);
  }

  return { manifest, baseUrl, pages };
};

const buildUrlEntry = (page, baseUrl) => {
  const images = page.__images || [];
  const imageXml = images
    .map((image) => {
      const caption = image.caption
        ? `\n      <image:caption>${xmlEscape(image.caption)}</image:caption>`
        : "";
      const title = image.title ? `\n      <image:title>${xmlEscape(image.title)}</image:title>` : "";
      return `\n    <image:image>\n      <image:loc>${xmlEscape(image.loc)}</image:loc>${caption}${title}\n    </image:image>`;
    })
    .join("");

  return `  <url>\n    <loc>${xmlEscape(`${baseUrl}${page.path}`)}</loc>\n    <lastmod>${xmlEscape(page.lastmod)}</lastmod>${imageXml}\n  </url>`;
};

const assertRobotsSitemapLink = (baseUrl) => {
  if (!existsSync(robotsPath)) {
    fail(`robots.txt is missing at ${robotsPath}.`);
  }

  const robots = readFileSync(robotsPath, "utf8");
  const expectedLine = `Sitemap: ${baseUrl}/sitemap.xml`;
  const sitemapLines = robots
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^sitemap:/i.test(line));

  if (!sitemapLines.includes(expectedLine)) {
    fail(`robots.txt must include exactly the canonical sitemap linkage '${expectedLine}'. Found: ${sitemapLines.join(", ") || "none"}.`);
  }
};

const main = () => {
  const { baseUrl, pages } = loadAndValidateManifest();
  assertRobotsSitemapLink(baseUrl);

  const hasImages = pages.some((page) => (page.__images || []).length > 0);
  const imageNamespace = hasImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : "";
  const urlset = pages.map((page) => buildUrlEntry(page, baseUrl)).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNamespace}>\n${urlset}\n</urlset>\n`;

  writeFileSync(sitemapPath, xml, "utf8");
  console.log(`Generated public/sitemap.xml from SEO manifest (${pages.length} URLs).`);
};

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
