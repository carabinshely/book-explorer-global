import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const baseUrl = (process.env.SITE_URL || "https://bronerbooks.com").replace(/\/+$/, "");
const catalogPath = join(process.cwd(), "src", "generated", "books", "catalog.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const slugs = (catalog.skus ?? []).map((sku) => sku.slug).filter(Boolean);

const today = new Date().toISOString().split("T")[0];
const urls = [
  "/",
  "/books",
  "/about",
  "/contact",
  ...slugs.map((slug) => `/books/${slug}`),
];

const urlset = urls
  .map((path) => {
    return `  <url>\n    <loc>${baseUrl}${path}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`;
  })
  .join("\n");

const xml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n${urlset}\n</urlset>\n`;

writeFileSync(join(process.cwd(), "public", "sitemap.xml"), xml, "utf8");
console.log("Generated public/sitemap.xml");
