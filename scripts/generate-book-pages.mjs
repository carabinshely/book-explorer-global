import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const baseUrl = (process.env.SITE_URL || "https://bronerbooks.com").replace(/\/+$/, "");
const distDir = join(process.cwd(), "dist");
const templatePath = join(distDir, "index.html");

const template = readFileSync(templatePath, "utf8");
const skusDir = join(process.cwd(), "src", "data", "skus");

const stripHtml = (value = "") =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const toAbsolute = (path) => (path ? `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}` : undefined);

const skus = readdirSync(skusDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => {
    const raw = readFileSync(join(skusDir, file), "utf8");
    return JSON.parse(raw);
  });

const buildJsonLd = (sku) => {
  const image = Array.isArray(sku.images) && sku.images.length > 0 ? toAbsolute(sku.images[0]) : undefined;
  const formats = sku.specs?.format ?? [];

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
