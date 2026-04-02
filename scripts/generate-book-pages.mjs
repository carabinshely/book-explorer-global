import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const baseUrl = (process.env.SITE_URL || "https://bronerbooks.com").replace(/\/+$/, "");
const distDir = join(process.cwd(), "dist");
const templatePath = join(distDir, "index.html");
const catalogPath = join(process.cwd(), "src", "generated", "books", "catalog.json");

const template = readFileSync(templatePath, "utf8");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

const stripHtml = (value = "") =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const toAbsolute = (path) => (path ? `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}` : undefined);
const skus = catalog.skus ?? [];

const buildAssociatedMedia = (sku) => {
  const media = [];
  const addEntries = (entries, type, label) => {
    if (!Array.isArray(entries)) return;
    entries.forEach((entry) => {
      const langCode = entry?.lang;
      const url = entry?.url;
      if (!url) return;
      const suffix = langCode && langCode !== "mixed" ? ` (${langCode.toUpperCase()})` : "";
      media.push({
        "@type": type,
        name: `${label}${suffix}`,
        url,
      });
    });
  };

  addEntries(sku.media?.spotify, "AudioObject", "Audio (Spotify)");
  addEntries(sku.media?.apple_music, "AudioObject", "Audio (Apple Music)");
  addEntries(sku.media?.youtube, "VideoObject", "Video (YouTube)");

  return media.length > 0 ? media : undefined;
};

const buildJsonLd = (sku) => {
  const image = sku.cover_image ? toAbsolute(sku.cover_image) : undefined;
  const formats = sku.specs?.format ?? [];
  const associatedMedia = buildAssociatedMedia(sku);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: sku.title,
    description: stripHtml(sku.description),
    url: `${baseUrl}/books/${sku.slug}`,
    inLanguage: sku.languages || [],
    bookFormat: formats,
    publisher: {
      "@type": "Organization",
      name: "Broner Books",
      url: baseUrl,
    },
  };

  if (sku.specs?.isbn) {
    jsonLd.isbn = sku.specs.isbn;
  }
  if (image) {
    jsonLd.image = image;
  }
  if (associatedMedia) {
    jsonLd.associatedMedia = associatedMedia;
  }

  return jsonLd;
};

const injectJsonLd = (html, jsonLd) => {
  const payload = JSON.stringify(jsonLd, null, 2).replace(/</g, "\\u003c");
  const script = `<script type=\"application/ld+json\">${payload}</script>`;
  return html.replace("</head>", `${script}\n</head>`);
};

skus.forEach((sku) => {
  if (!sku.slug) return;
  const outputDir = join(distDir, "books", sku.slug);
  mkdirSync(outputDir, { recursive: true });
  const pageHtml = injectJsonLd(template, buildJsonLd(sku));
  writeFileSync(join(outputDir, "index.html"), pageHtml, "utf8");
});

console.log(`Generated ${skus.length} book pages with JSON-LD.`);
