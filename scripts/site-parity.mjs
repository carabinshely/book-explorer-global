#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  approvedPath,
  destination as approvedDestination,
  requiredHeaders as resolverRequiredHeaders,
} from "../worker/release-proof.mjs";

export const DEFAULT_LIVE_ORIGIN = "https://bronerbooks.com";
export const SIGNUP_PATH = "/api/niran-storytime-signup";
export const UNKNOWN_PATH = "/__issue30-unknown__";
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const SAFE_RESPONSE_HEADERS = [
  "cache-control",
  "content-security-policy",
  "content-type",
  "location",
  "permissions-policy",
  "referrer-policy",
  "x-content-type-options",
  "x-frame-options",
];

function fail(message) {
  throw new Error(message);
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`cannot read ${label} at ${path}: ${error.message}`);
  }
}

/** Removes JSONC comments without touching comment-like text inside strings. */
export function stripJsonComments(input) {
  let output = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }
    if (char === "/" && next === "/") {
      while (index < input.length && input[index] !== "\n") index += 1;
      output += "\n";
      continue;
    }
    if (char === "/" && next === "*") {
      index += 2;
      while (index < input.length && !(input[index] === "*" && input[index + 1] === "/")) index += 1;
      index += 1;
      continue;
    }
    output += char;
  }
  return output;
}

function readJsonc(path, label) {
  try {
    return JSON.parse(stripJsonComments(readFileSync(path, "utf8")));
  } catch (error) {
    fail(`cannot read ${label} at ${path}: ${error.message}`);
  }
}

export function normalizeOrigin(value, label = "origin") {
  if (typeof value !== "string" || !value.trim()) fail(`${label} is required`);
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${label} must be an absolute HTTPS origin`);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    fail(`${label} must be an HTTPS origin with no path, credentials, query, or fragment`);
  }
  return url.origin;
}

function htmlAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1];
}

export function parseHtmlMetadata(html) {
  const tags = [...String(html).matchAll(/<(?:meta|link)\b[^>]*>/gi)].map((match) => match[0]);
  const canonicalTag = tags.find((tag) => htmlAttribute(tag, "rel")?.toLowerCase() === "canonical");
  const robotsTag = tags.find((tag) => htmlAttribute(tag, "name")?.toLowerCase() === "robots");
  const moduleScripts = [
    ...String(html).matchAll(
      /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["']([^"']+)["'])[^>]*>/gi,
    ),
  ].map((match) => match[1]);
  return {
    title: String(html).match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim(),
    canonical: canonicalTag ? htmlAttribute(canonicalTag, "href") : undefined,
    robots: robotsTag ? htmlAttribute(robotsTag, "content") : undefined,
    moduleScripts,
  };
}

export function parseSitemapLocations(xml) {
  return [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).sort();
}

export function sanitizeHeaders(headers) {
  return Object.fromEntries(
    SAFE_RESPONSE_HEADERS.map((name) => [name, headers.get(name)]).filter(([, value]) => value !== null),
  );
}

export function validateRedirectObservation(observation, status, location) {
  if (observation.status !== status || !observation.headers.location) return false;
  try {
    return new URL(observation.headers.location, location).href === location;
  } catch {
    return false;
  }
}

export function privacyMarkerStatus(bundle, identity) {
  const effectiveDate = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${identity.privacyNoticeEffectiveDate}T00:00:00Z`));
  const required = [
    identity.publicPostalAddress,
    effectiveDate,
    "Children's content and adult data collection",
  ];
  const prohibited = ["provisional pending review", "{{PUBLIC_MAILBOX_ADDRESS}}"];
  return {
    missing: required.filter((marker) => !bundle.includes(marker)),
    prohibited: prohibited.filter((marker) => bundle.includes(marker)),
  };
}

function result(category, surface, pass, expected, actual, headers = undefined) {
  return { category, surface, pass, expected, actual, ...(headers ? { headers } : {}) };
}

function configResult(surface, pass, expected, actual) {
  return result("repository", surface, pass, expected, actual);
}

export function validateRepositoryContracts(rootDir) {
  const site = readJsonc(resolve(rootDir, "wrangler.site-preview.jsonc"), "preview Wrangler config");
  const signup = readJsonc(resolve(rootDir, "signup-worker", "wrangler.jsonc"), "signup Wrangler config");
  const resolver = readFileSync(resolve(rootDir, "worker", "wrangler.toml"), "utf8");
  const catalog = readJson(resolve(rootDir, "src", "generated", "books", "catalog.json"), "book catalog");
  const forbiddenSiteKeys = [
    "main", "route", "routes", "env", "vars", "triggers", "services", "kv_namespaces",
    "r2_buckets", "d1_databases", "durable_objects",
  ];
  const signupRoutes = signup.env?.production?.routes ?? [];
  const mediaEntries = (catalog.skus ?? []).flatMap((sku) => [
    ...(sku.media?.youtube ?? []),
    ...(sku.media?.spotify ?? []),
    ...(sku.media?.apple_music ?? []),
  ]);

  return [
    configResult(
      "static preview ownership",
      site.workers_dev === true && site.preview_urls === true && forbiddenSiteKeys.every((key) => site[key] === undefined),
      "workers.dev/version previews enabled; no script, routes, domains, bindings, or environments",
      `name=${site.name}; forbidden keys=${forbiddenSiteKeys.filter((key) => site[key] !== undefined).join(",") || "none"}`,
    ),
    configResult(
      "static preview routing",
      site.assets?.directory === "./dist" &&
        site.assets?.html_handling === "auto-trailing-slash" &&
        site.assets?.not_found_handling === "404-page" &&
        site.assets?.run_worker_first === undefined &&
        site.assets?.binding === undefined,
      "dist assets, auto-trailing-slash, real 404 page, direct asset serving",
      JSON.stringify(site.assets),
    ),
    configResult(
      "resolver route ownership",
      /routes\s*=\s*\[\{\s*pattern\s*=\s*"bronerbooks\.com\/r\/\*"\s*,\s*zone_name\s*=\s*"bronerbooks\.com"\s*\}\]/.test(resolver),
      "production owns only bronerbooks.com/r/*",
      resolver.match(/routes\s*=.*$/m)?.[0] ?? "missing",
    ),
    configResult(
      "reserved signup route",
      signupRoutes.length === 1 && signupRoutes[0]?.pattern === `bronerbooks.com${SIGNUP_PATH}`,
      `exact reserved route bronerbooks.com${SIGNUP_PATH}`,
      signupRoutes.map((route) => route.pattern).join(",") || "missing",
    ),
    configResult(
      "signup activation state",
      signup.vars?.SIGNUP_ENABLED === "false" &&
        signup.env?.preview?.vars?.SIGNUP_ENABLED === "false" &&
        signup.env?.production?.vars?.SIGNUP_ENABLED === "false",
      "SIGNUP_ENABLED=false in local, preview, and production config",
      `local=${signup.vars?.SIGNUP_ENABLED}; preview=${signup.env?.preview?.vars?.SIGNUP_ENABLED}; production=${signup.env?.production?.vars?.SIGNUP_ENABLED}`,
    ),
    configResult(
      "optional media inventory",
      mediaEntries.length === 0,
      "no currently rendered YouTube, Spotify, or Apple Music entries",
      `${mediaEntries.length} configured entries`,
    ),
  ];
}

async function observe(fetchImpl, origin, path, method = "GET") {
  const url = new URL(path, `${origin}/`).href;
  try {
    const response = await fetchImpl(url, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: "*/*" },
    });
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      fail(`response exceeds ${MAX_BODY_BYTES} bytes at ${url}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BODY_BYTES) fail(`response exceeds ${MAX_BODY_BYTES} bytes at ${url}`);
    const contentType = response.headers.get("content-type") ?? "";
    const textual = /(?:html|javascript|json|text|xml)/i.test(contentType);
    return {
      status: response.status,
      headers: sanitizeHeaders(response.headers),
      bytes: bytes.byteLength,
      text: textual ? new TextDecoder().decode(bytes) : "",
    };
  } catch (error) {
    return { status: null, headers: {}, bytes: 0, text: "", error: error.message };
  }
}

function observationActual(observation) {
  if (observation.error) return `request error: ${observation.error}`;
  const location = observation.headers.location ? ` -> ${observation.headers.location}` : "";
  return `${observation.status}${location}; ${observation.headers["content-type"] ?? "no content-type"}; ${observation.bytes} bytes`;
}

function statusAndType(category, surface, observation, status, contentType) {
  const pass = observation.status === status && contentType.test(observation.headers["content-type"] ?? "");
  return result(category, surface, pass, `${status} ${contentType}`, observationActual(observation), observation.headers);
}

function htmlPageResult(surface, observation, page) {
  const metadata = parseHtmlMetadata(observation.text);
  const expectedCanonical = new URL(page.path, `${DEFAULT_LIVE_ORIGIN}/`).href;
  const pass = observation.status === 200 &&
    /text\/html/i.test(observation.headers["content-type"] ?? "") &&
    metadata.title === page.title && metadata.canonical === expectedCanonical;
  return result(
    "static/seo",
    surface,
    pass,
    `200 HTML; title=${page.title}; canonical=${expectedCanonical}`,
    `${observationActual(observation)}; title=${metadata.title}; canonical=${metadata.canonical}`,
    observation.headers,
  );
}

function branded404Result(surface, observation) {
  const metadata = parseHtmlMetadata(observation.text);
  const pass = observation.status === 404 && metadata.title === "Page Not Found | Broner Books" && metadata.robots === "noindex,follow";
  return result(
    "404/routing",
    surface,
    pass,
    "404 branded HTML; robots=noindex,follow",
    `${observationActual(observation)}; title=${metadata.title}; robots=${metadata.robots}`,
    observation.headers,
  );
}

function resolverHeadersPass(headers) {
  return resolverRequiredHeaders.every((name) => headers[name]) && headers["cache-control"] === "no-store, max-age=0";
}

function pickPages(manifest) {
  const staticPaths = ["/", "/privacy", "/books"];
  const staticPages = staticPaths.map((path) => manifest.static_pages.find((page) => page.path === path));
  const mono = manifest.book_pages.find((page) => page.sku_id === "the-lost-umbrella-of-niran-en");
  const bilingual = manifest.book_pages.find((page) => page.sku_id === "the-lost-umbrella-of-niran-en-eo");
  if ([...staticPages, mono, bilingual].some((page) => !page)) fail("SEO manifest lacks the required Issue #30 representative pages");
  return [...staticPages, mono, bilingual];
}

export async function runParity({ previewOrigin, liveOrigin = DEFAULT_LIVE_ORIGIN, fetchImpl = fetch, rootDir }) {
  const manifest = readJson(resolve(rootDir, "src", "generated", "seo", "manifest.json"), "SEO manifest");
  const identity = readJson(resolve(rootDir, "src", "config", "public-identity.json"), "public identity");
  const results = validateRepositoryContracts(rootDir);
  const pages = pickPages(manifest);
  const observations = new Map();
  const get = async (label, origin, path) => {
    const key = `${label}:${path}`;
    if (!observations.has(key)) observations.set(key, await observe(fetchImpl, origin, path));
    return observations.get(key);
  };

  for (const page of pages) {
    results.push(htmlPageResult(`preview ${page.path}`, await get("preview", previewOrigin, page.path), page));
    results.push(htmlPageResult(`live ${page.path}`, await get("live", liveOrigin, page.path), page));
  }

  for (const [label, origin] of [["preview", previewOrigin], ["live", liveOrigin]]) {
    const storytime = await get(label, origin, "/niran-storytime-kit");
    const storytimeMeta = parseHtmlMetadata(storytime.text);
    results.push(result(
      "static/seo",
      `${label} /niran-storytime-kit`,
      storytime.status === 200 && storytimeMeta.title === "Niran Storytime Kit | Broner Books" && storytimeMeta.robots === "noindex,nofollow",
      "200 app shell; robots=noindex,nofollow",
      `${observationActual(storytime)}; title=${storytimeMeta.title}; robots=${storytimeMeta.robots}`,
      storytime.headers,
    ));
  }

  const previewRobots = await get("preview", previewOrigin, "/robots.txt");
  const liveRobots = await get("live", liveOrigin, "/robots.txt");
  results.push(statusAndType("static/seo", "preview robots.txt", previewRobots, 200, /text\/plain/i));
  results.push(statusAndType("static/seo", "live robots.txt", liveRobots, 200, /text\/plain/i));
  results.push(result("static/seo", "robots parity", previewRobots.text === liveRobots.text, "identical public robots policy", previewRobots.text === liveRobots.text ? "identical" : "different"));

  const previewSitemap = await get("preview", previewOrigin, "/sitemap.xml");
  const liveSitemap = await get("live", liveOrigin, "/sitemap.xml");
  results.push(statusAndType("static/seo", "preview sitemap.xml", previewSitemap, 200, /xml/i));
  results.push(statusAndType("static/seo", "live sitemap.xml", liveSitemap, 200, /xml/i));
  const previewLocs = parseSitemapLocations(previewSitemap.text);
  const liveLocs = parseSitemapLocations(liveSitemap.text);
  results.push(result(
    "static/seo",
    "sitemap parity",
    JSON.stringify(previewLocs) === JSON.stringify(liveLocs) &&
      previewLocs.length === manifest.static_pages.length + manifest.book_pages.length,
    "identical canonical URL set",
    `preview=${previewLocs.length}; live=${liveLocs.length}; identical=${JSON.stringify(previewLocs) === JSON.stringify(liveLocs)}`,
  ));

  for (const [label, origin] of [["preview", previewOrigin], ["live", liveOrigin]]) {
    const home = await get(label, origin, "/");
    const scriptPath = parseHtmlMetadata(home.text).moduleScripts[0];
    if (!scriptPath) {
      results.push(result("assets/privacy", `${label} application bundle`, false, "module script discovered", "missing"));
    } else {
      const bundle = await get(label, origin, scriptPath);
      const markers = privacyMarkerStatus(bundle.text, identity);
      results.push(result(
        "assets/privacy",
        `${label} application bundle`,
        bundle.status === 200 && /javascript/i.test(bundle.headers["content-type"] ?? "") && bundle.bytes > 0,
        "200 JavaScript bundle",
        observationActual(bundle),
        bundle.headers,
      ));
      results.push(result(
        "assets/privacy",
        `${label} approved Privacy Notice markers`,
        markers.missing.length === 0 && markers.prohibited.length === 0,
        "approved address/date/child-content heading; no placeholder or provisional text",
        `missing=${markers.missing.join(",") || "none"}; prohibited=${markers.prohibited.join(",") || "none"}`,
      ));
    }
  }

  const coverPath = manifest.book_pages.find((page) => page.images?.length)?.images?.[0];
  if (!coverPath) fail("SEO manifest has no representative generated image");
  for (const [label, origin] of [["preview", previewOrigin], ["live", liveOrigin]]) {
    const cover = await get(label, origin, coverPath);
    results.push(result(
      "assets/privacy",
      `${label} generated cover`,
      cover.status === 200 && /image\//i.test(cover.headers["content-type"] ?? "") && cover.bytes > 0,
      "200 non-empty image",
      observationActual(cover),
      cover.headers,
    ));
    results.push(branded404Result(`${label} unknown route`, await get(label, origin, UNKNOWN_PATH)));
    results.push(branded404Result(`${label} missing asset`, await get(label, origin, "/assets/__issue30-missing__.js")));
  }

  for (const path of ["/privacy", "/books/the-lost-umbrella-of-niran-en", "/books/the-lost-umbrella-of-niran-en-eo"]) {
    const preview = await get("preview", previewOrigin, `${path}/`);
    results.push(result(
      "404/routing",
      `preview trailing slash ${path}/`,
      validateRedirectObservation(preview, 307, `${previewOrigin}${path}`),
      `307 -> ${previewOrigin}${path}`,
      observationActual(preview),
      preview.headers,
    ));
    const live = await get("live", liveOrigin, `${path}/`);
    results.push(result(
      "404/routing",
      `live Pages baseline ${path}/`,
      live.status === 404,
      "404 current GitHub Pages baseline; preview canonical redirect is intentional",
      observationActual(live),
      live.headers,
    ));
  }

  const liveApproved = await get("live", liveOrigin, approvedPath);
  results.push(result(
    "worker coexistence",
    "live approved /r/*",
    validateRedirectObservation(liveApproved, 302, approvedDestination) && resolverHeadersPass(liveApproved.headers),
    `302 -> ${approvedDestination}; hardened no-store headers`,
    observationActual(liveApproved),
    liveApproved.headers,
  ));
  results.push(branded404Result("preview approved /r/* is isolated", await get("preview", previewOrigin, approvedPath)));

  const missingResolverPath = "/r/not-a-real-link";
  const liveMissingResolver = await get("live", liveOrigin, missingResolverPath);
  results.push(result(
    "worker coexistence",
    "live missing /r/*",
    liveMissingResolver.status === 404 && resolverHeadersPass(liveMissingResolver.headers),
    "404 from resolver with hardened no-store headers",
    observationActual(liveMissingResolver),
    liveMissingResolver.headers,
  ));
  results.push(branded404Result("preview missing /r/* is isolated", await get("preview", previewOrigin, missingResolverPath)));

  for (const path of ["/r", "/rr/not-a-real-link"]) {
    results.push(branded404Result(`live resolver near-miss ${path}`, await get("live", liveOrigin, path)));
    results.push(branded404Result(`preview resolver near-miss ${path}`, await get("preview", previewOrigin, path)));
  }

  for (const path of [SIGNUP_PATH, `${SIGNUP_PATH}/`, `${SIGNUP_PATH}-near-miss`]) {
    results.push(branded404Result(`live reserved signup ${path}`, await get("live", liveOrigin, path)));
    results.push(branded404Result(`preview reserved signup ${path}`, await get("preview", previewOrigin, path)));
  }

  if (liveOrigin === DEFAULT_LIVE_ORIGIN) {
    const redirects = [
      ["https://www.bronerbooks.com/privacy?utm_source=issue30", "https://bronerbooks.com/privacy?utm_source=issue30"],
      ["http://bronerbooks.com/privacy?utm_source=issue30", "https://bronerbooks.com/privacy?utm_source=issue30"],
      ["http://www.bronerbooks.com/privacy?utm_source=issue30", "https://bronerbooks.com/privacy?utm_source=issue30"],
    ];
    for (const [source, target] of redirects) {
      const observation = await observe(fetchImpl, new URL(source).origin, `${new URL(source).pathname}${new URL(source).search}`);
      results.push(result(
        "canonical host",
        source,
        validateRedirectObservation(observation, 301, target),
        `301 -> ${target}`,
        observationActual(observation),
        observation.headers,
      ));
    }
  }

  return {
    schema_version: "bronerbooks-site-parity-v1",
    generated_at: new Date().toISOString(),
    preview_origin: previewOrigin,
    live_origin: liveOrigin,
    results,
    summary: {
      passed: results.filter((entry) => entry.pass).length,
      failed: results.filter((entry) => !entry.pass).length,
      total: results.length,
    },
  };
}

function escapeTable(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function formatTextReport(report) {
  const lines = [
    `Cloudflare preview parity: ${report.summary.passed}/${report.summary.total} passed`,
    `Preview: ${report.preview_origin}`,
    `Live: ${report.live_origin}`,
    "",
    "| Result | Category | Surface | Expected | Actual |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const entry of report.results) {
    lines.push(`| ${entry.pass ? "PASS" : "FAIL"} | ${escapeTable(entry.category)} | ${escapeTable(entry.surface)} | ${escapeTable(entry.expected)} | ${escapeTable(entry.actual)} |`);
  }
  return `${lines.join("\n")}\n`;
}

export function exitCodeForResults(results) {
  return results.some((entry) => !entry.pass) ? 1 : 0;
}

export function parseArgs(args) {
  const options = { json: false, liveOrigin: DEFAULT_LIVE_ORIGIN };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--preview-origin") options.previewOrigin = args[++index];
    else if (arg === "--live-origin") options.liveOrigin = args[++index];
    else fail(`unknown argument ${arg}`);
  }
  options.previewOrigin = normalizeOrigin(options.previewOrigin, "--preview-origin");
  options.liveOrigin = normalizeOrigin(options.liveOrigin, "--live-origin");
  return options;
}

export async function main(args, dependencies = {}) {
  const writeOut = dependencies.writeOut ?? ((value) => process.stdout.write(value));
  const writeErr = dependencies.writeErr ?? ((value) => process.stderr.write(value));
  const rootDir = dependencies.rootDir ?? resolve(import.meta.dirname, "..");
  try {
    const options = parseArgs(args);
    const report = await runParity({
      previewOrigin: options.previewOrigin,
      liveOrigin: options.liveOrigin,
      fetchImpl: dependencies.fetchImpl ?? fetch,
      rootDir,
    });
    writeOut(options.json ? `${JSON.stringify(report, null, 2)}\n` : formatTextReport(report));
    return exitCodeForResults(report.results);
  } catch (error) {
    writeErr(`ERROR: ${error.message}\n`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
