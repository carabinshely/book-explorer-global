import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SCHEMA_VERSION = "book-explorer-global-seo-v1";
const DEFAULT_SITE_URL = "https://bronerbooks.com";
const MAX_SEO_DESCRIPTION_LENGTH = 161;
const HTML_TAG_PATTERN = /<[^>]+>/;
const distDir = join(process.cwd(), "dist");
const templatePath = join(distDir, "index.html");
const catalogPath = join(process.cwd(), "src", "generated", "books", "catalog.json");
const manifestPath = join(process.cwd(), "src", "generated", "seo", "manifest.json");

const fail = (message) => {
  throw new Error(`[seo:pages] ${message}`);
};

const baseUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");

const readJson = (path, label) => {
  if (!existsSync(path)) {
    fail(`${label} is missing at ${path}. Run the JLR publish flow before generating static SEO pages.`);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
};

const stripHtml = (value = "") =>
  String(value)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeHtmlText = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeHtmlAttr = (value) =>
  escapeHtmlText(value)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isAbsoluteHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
};

const toAbsoluteUrl = (value) => {
  if (!value) return undefined;
  const url = String(value);
  const absolute = url.startsWith("/") ? `${baseUrl}${url}` : url;
  if (!isAbsoluteHttpsUrl(absolute)) {
    fail(`URL must be absolute HTTPS or root-relative. Received ${JSON.stringify(value)}.`);
  }
  return absolute;
};

const assertPathPolicy = (path, label) => {
  if (typeof path !== "string" || !path.startsWith("/")) {
    fail(`${label} must start with '/'. Received ${JSON.stringify(path)}.`);
  }
  if (path.length > 1 && path.endsWith("/")) {
    fail(`${label} must not use a trailing slash except root (${path}).`);
  }
  const segments = path.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    fail(`${label} must not contain dot segments (${path}).`);
  }
};

const assertPlainDescription = (description, label) => {
  if (typeof description !== "string" || description.trim().length === 0) {
    fail(`${label}.description must be non-empty.`);
  }
  if (HTML_TAG_PATTERN.test(description)) {
    fail(`${label}.description must be stripped plain text.`);
  }
  if (description.length > MAX_SEO_DESCRIPTION_LENGTH) {
    fail(`${label}.description must be length-bounded to ${MAX_SEO_DESCRIPTION_LENGTH} characters.`);
  }
};

const removeHeadSeo = (headHtml) =>
  headHtml
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, "")
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+property=["']og:(title|description|url|type|image)["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+name=["']twitter:(card|title|description|image|site)["'][^>]*>\s*/gi, "")
    .replace(/<link\s+rel=["']alternate["'][^>]*hreflang=["'][^"']+["'][^>]*>\s*/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");

const removeBodyJsonLd = (html) =>
  html.replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");

const seoTags = ({ title, description, canonicalUrl, type = "website", imageUrl, jsonLd }) => {
  const payload = JSON.stringify(jsonLd, null, 2).replace(/</g, "\\u003c");
  const imageTags = imageUrl
    ? `\n    <meta property="og:image" content="${escapeHtmlAttr(imageUrl)}" />\n    <meta name="twitter:image" content="${escapeHtmlAttr(imageUrl)}" />`
    : "";

  return `    <title>${escapeHtmlText(title)}</title>\n    <meta name="description" content="${escapeHtmlAttr(description)}" />\n    <link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />\n    <meta property="og:title" content="${escapeHtmlAttr(title)}" />\n    <meta property="og:description" content="${escapeHtmlAttr(description)}" />\n    <meta property="og:type" content="${escapeHtmlAttr(type)}" />\n    <meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}" />${imageTags}\n    <meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}" />\n    <meta name="twitter:title" content="${escapeHtmlAttr(title)}" />\n    <meta name="twitter:description" content="${escapeHtmlAttr(description)}" />\n    <script type="application/ld+json">${payload}</script>\n`;
};

const applySeo = (template, seo) => {
  const withoutBodyJsonLd = removeBodyJsonLd(template);
  const headClose = withoutBodyJsonLd.match(/<\/head>/i);
  if (!headClose) fail("dist/index.html template is missing </head>.");

  const beforeHeadClose = withoutBodyJsonLd.slice(0, headClose.index);
  const afterHeadClose = withoutBodyJsonLd.slice(headClose.index);
  const headOpen = beforeHeadClose.match(/<head[^>]*>/i);
  if (!headOpen) fail("dist/index.html template is missing <head>.");

  const beforeHead = beforeHeadClose.slice(0, headOpen.index + headOpen[0].length);
  const headBody = beforeHeadClose.slice(headOpen.index + headOpen[0].length);
  return `${beforeHead}\n${removeHeadSeo(headBody)}${seoTags(seo)}${afterHeadClose}`;
};

const writeRoutePage = (path, html) => {
  assertPathPolicy(path, "route path");
  const outputPath = path === "/" ? join(distDir, "index.html") : join(distDir, path.slice(1), "index.html");
  const relativeOutput = relative(resolve(distDir), resolve(outputPath));
  if (relativeOutput === ".." || relativeOutput.startsWith("../") || relativeOutput.startsWith("..\\")) {
    fail(`route path would escape dist output: ${path}.`);
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html, "utf8");
};

const buildAssociatedMedia = (sku) => {
  const media = [];
  const addEntries = (entries, type, label) => {
    if (!Array.isArray(entries)) return;
    entries.forEach((entry) => {
      const url = entry?.url;
      if (!url) return;
      media.push({
        "@type": type,
        name: `${label}${entry.lang && entry.lang !== "mixed" ? ` (${entry.lang.toUpperCase()})` : ""}`,
        url,
      });
    });
  };

  addEntries(sku.media?.spotify, "AudioObject", "Audio (Spotify)");
  addEntries(sku.media?.apple_music, "AudioObject", "Audio (Apple Music)");
  addEntries(sku.media?.youtube, "VideoObject", "Video (YouTube)");
  return media.length > 0 ? media : undefined;
};

const buildBookJsonLd = (page, sku) => {
  const image = toAbsoluteUrl(page.image?.url || page.cover_image || sku.cover_image);
  const associatedMedia = buildAssociatedMedia(sku);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: page.title,
    description: page.description,
    url: `${baseUrl}${page.path}`,
    inLanguage: page.languages || sku.languages || [],
    publisher: {
      "@type": "Organization",
      name: "Broner Books",
      url: baseUrl,
    },
  };

  const formats = sku.specs?.format ?? [];
  if (formats.length > 0) jsonLd.bookFormat = formats;
  if (sku.specs?.isbn) jsonLd.isbn = sku.specs.isbn;
  if (image) jsonLd.image = image;
  if (associatedMedia) jsonLd.associatedMedia = associatedMedia;
  return jsonLd;
};

const buildStaticJsonLd = (page) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: page.title,
  description: page.description,
  url: `${baseUrl}${page.path}`,
  publisher: {
    "@type": "Organization",
    name: "Broner Books",
    url: baseUrl,
  },
});

const validateManifest = (manifest) => {
  if (manifest.schema_version !== SCHEMA_VERSION) {
    fail(`manifest.schema_version must be ${SCHEMA_VERSION}. Received ${JSON.stringify(manifest.schema_version)}.`);
  }
  if (manifest.site?.base_url !== baseUrl) {
    fail(`manifest.site.base_url (${JSON.stringify(manifest.site?.base_url)}) must match SITE_URL (${baseUrl}).`);
  }
  if (!Array.isArray(manifest.static_pages) || manifest.static_pages.length === 0) {
    fail("manifest.static_pages must be a non-empty array.");
  }
  if (!Array.isArray(manifest.book_pages) || manifest.book_pages.length === 0) {
    fail("manifest.book_pages must be a non-empty array.");
  }

  const seen = new Set();
  for (const [kind, pages] of [
    ["static_pages", manifest.static_pages],
    ["book_pages", manifest.book_pages],
  ]) {
    pages.forEach((page, index) => {
      const label = `${kind}[${index}]`;
      assertPathPolicy(page.path, `${label}.path`);
      if (seen.has(page.path)) fail(`duplicate manifest path ${page.path}.`);
      seen.add(page.path);
      if (!page.title) fail(`${label} requires non-empty title.`);
      assertPlainDescription(page.description, label);
      if (Array.isArray(page.alternate_paths) && page.alternate_paths.length > 0) {
        fail(`${label}.alternate_paths is not supported yet; hreflang output is deferred.`);
      }
    });
  }
};

const main = () => {
  if (!existsSync(templatePath)) {
    fail("dist/index.html is missing. Run vite build before generating static pages.");
  }

  const template = readFileSync(templatePath, "utf8");
  const catalog = readJson(catalogPath, "Book catalog");
  const manifest = readJson(manifestPath, "SEO manifest");
  validateManifest(manifest);

  const skusById = new Map((catalog.skus || []).map((sku) => [sku.sku_id, sku]));
  let bookCount = 0;

  for (const page of manifest.static_pages) {
    const html = applySeo(template, {
      title: page.title,
      description: stripHtml(page.description),
      canonicalUrl: `${baseUrl}${page.path}`,
      type: "website",
      imageUrl: toAbsoluteUrl(page.image?.url || page.cover_image),
      jsonLd: buildStaticJsonLd(page),
    });
    writeRoutePage(page.path, html);
  }

  for (const page of manifest.book_pages) {
    const sku = skusById.get(page.sku_id);
    if (!sku) {
      fail(`manifest book page ${page.path} references missing catalog sku_id ${JSON.stringify(page.sku_id)}.`);
    }

    const html = applySeo(template, {
      title: page.title,
      description: stripHtml(page.description),
      canonicalUrl: `${baseUrl}${page.path}`,
      type: "book",
      imageUrl: toAbsoluteUrl(page.image?.url || page.cover_image || sku.cover_image),
      jsonLd: buildBookJsonLd(page, sku),
    });
    writeRoutePage(page.path, html);
    bookCount += 1;
  }

  console.log(`Generated ${manifest.static_pages.length} static route pages and ${bookCount} book pages with page-specific SEO metadata.`);
};

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
