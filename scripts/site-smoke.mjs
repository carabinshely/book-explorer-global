import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const APPROVED_PRIVACY_MARKERS = [
  "P.O. Box 4244, Haifa 3104201, Israel",
  "August 19, 2026",
  "Children's content and adult data collection",
];
const FORBIDDEN_PRIVACY_MARKERS = ["provisional pending review", "{{PUBLIC_MAILBOX_ADDRESS}}"];
const CANONICAL_ORIGIN = "https://bronerbooks.com";
const UNKNOWN_PATH = "/__static-site-smoke-404__";

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

function assertHttpsOrigin(value) {
  const origin = new URL(value);
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("smoke origin must be a credential-free HTTPS origin");
  }
  return origin;
}

function moduleScriptPath(html) {
  const match = html.match(
    /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["']([^"']+)["'])[^>]*>/i,
  );
  if (!match) throw new Error("homepage did not expose a module bundle");
  return match[1];
}

async function responseText(fetchImpl, url, expectedStatus, label) {
  const response = await fetchImpl(url, { redirect: "follow" });
  if (response.status !== expectedStatus) {
    throw new Error(`${label} returned HTTP ${response.status}; expected ${expectedStatus}`);
  }
  return response.text();
}

async function representativeBookPath(cwd) {
  const manifest = JSON.parse(
    await readFile(join(cwd, "src", "generated", "seo", "manifest.json"), "utf8"),
  );
  const path = manifest.book_pages?.[0]?.path;
  if (typeof path !== "string" || !path.startsWith("/books/")) {
    throw new Error("SEO manifest does not contain a representative book path");
  }
  return path;
}

async function smokeAttempt({ origin, fetchImpl, bookPath }) {
  const homepageUrl = new URL("/", origin);
  const homepage = await responseText(fetchImpl, homepageUrl, 200, "homepage");
  const assetUrl = new URL(moduleScriptPath(homepage), origin);
  if (assetUrl.origin !== origin.origin) {
    throw new Error("homepage module bundle must remain on the selected smoke origin");
  }

  await responseText(fetchImpl, new URL("/privacy", origin), 200, "Privacy Notice route");
  await responseText(fetchImpl, new URL(bookPath, origin), 200, "representative book route");

  const niranShell = await responseText(
    fetchImpl,
    new URL("/niran-storytime-kit", origin),
    200,
    "Niran application shell",
  );
  if (!/noindex\s*,\s*nofollow/i.test(niranShell)) {
    throw new Error("Niran application shell lost its noindex,nofollow contract");
  }

  const robots = await responseText(fetchImpl, new URL("/robots.txt", origin), 200, "robots.txt");
  if (!robots.includes(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`)) {
    throw new Error("robots.txt does not reference the canonical sitemap");
  }

  const sitemap = await responseText(fetchImpl, new URL("/sitemap.xml", origin), 200, "sitemap.xml");
  if (!sitemap.includes(`<loc>${CANONICAL_ORIGIN}/`)) {
    throw new Error("sitemap.xml does not contain canonical production URLs");
  }

  const bundle = await responseText(fetchImpl, assetUrl, 200, "application bundle");
  for (const marker of APPROVED_PRIVACY_MARKERS) {
    if (!bundle.includes(marker)) throw new Error("application bundle is missing approved Privacy Notice text");
  }
  for (const marker of FORBIDDEN_PRIVACY_MARKERS) {
    if (bundle.includes(marker)) throw new Error("application bundle contains superseded Privacy Notice text");
  }

  const notFound = await responseText(fetchImpl, new URL(UNKNOWN_PATH, origin), 404, "unknown route");
  if (!/noindex\s*,\s*follow/i.test(notFound) || !/<script\b[^>]*\btype=["']module["']/i.test(notFound)) {
    throw new Error("unknown route did not return the generated NotFound application shell");
  }

  return {
    origin: origin.origin,
    representative_book_path: bookPath,
    bundle_path: assetUrl.pathname,
    unknown_path: UNKNOWN_PATH,
  };
}

export async function runSiteSmoke({
  origin,
  fetchImpl = globalThis.fetch,
  cwd = process.cwd(),
  bookPath,
  attempts = 12,
  delayMs = 5000,
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation is required");
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 20) {
    throw new Error("smoke attempts must be an integer from 1 through 20");
  }
  if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > 30000) {
    throw new Error("smoke delay must be an integer from 0 through 30000 milliseconds");
  }

  const parsedOrigin = assertHttpsOrigin(origin);
  const selectedBookPath = bookPath ?? (await representativeBookPath(cwd));
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await smokeAttempt({ origin: parsedOrigin, fetchImpl, bookPath: selectedBookPath });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(delayMs);
    }
  }
  throw new Error(`static-site smoke failed after ${attempts} attempt(s): ${lastError?.message ?? "unknown failure"}`);
}

function cliArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const origin = cliArgument("--origin") ?? process.argv[2];
  if (!origin) throw new Error("an origin argument is required");
  const result = await runSiteSmoke({
    origin,
    attempts: Number(process.env.SITE_SMOKE_ATTEMPTS ?? 12),
    delayMs: Number(process.env.SITE_SMOKE_DELAY_MS ?? 5000),
  });
  console.log(
    `Static-site smoke passed for ${result.origin}: home, privacy, ${result.representative_book_path}, Niran shell, robots, sitemap, ${result.bundle_path}, and HTTP 404.`,
  );
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
