import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const baseUrl = (process.env.SITE_URL || "https://bronerbooks.com").replace(/\/+$/, "");
const skusDir = join(process.cwd(), "src", "data", "skus");

const slugs = readdirSync(skusDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => {
    const raw = readFileSync(join(skusDir, file), "utf8");
    const data = JSON.parse(raw);
    return data.slug;
  })
  .filter(Boolean);

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
