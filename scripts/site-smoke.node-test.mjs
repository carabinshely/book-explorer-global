import assert from "node:assert/strict";
import test from "node:test";

import { runSiteSmoke } from "./site-smoke.mjs";

const origin = "https://candidate.example.workers.dev";
const bookPath = "/books/representative-book";
const bundlePath = "/assets/index-test.js";

function response(body, status = 200) {
  return new Response(body, { status });
}

function successfulRoutes() {
  return new Map([
    ["/", response(`<html><script type="module" src="${bundlePath}"></script></html>`)],
    ["/privacy", response("<html>privacy shell</html>")],
    [bookPath, response("<html>book</html>")],
    ["/niran-storytime-kit", response('<meta name="robots" content="noindex,nofollow">')],
    ["/robots.txt", response("Sitemap: https://bronerbooks.com/sitemap.xml\n")],
    ["/sitemap.xml", response("<loc>https://bronerbooks.com/</loc>")],
    [
      bundlePath,
      response(
        "P.O. Box 4244, Haifa 3104201, Israel August 19, 2026 Children's content and adult data collection",
      ),
    ],
    [
      "/__static-site-smoke-404__",
      response('<meta name="robots" content="noindex,follow"><script type="module" src="/assets/index-test.js"></script>', 404),
    ],
  ]);
}

function fetchFrom(routes) {
  return async (input) => {
    const path = new URL(input).pathname;
    return routes.get(path) ?? response("missing fixture", 500);
  };
}

async function run(routes) {
  return runSiteSmoke({
    origin,
    bookPath,
    fetchImpl: fetchFrom(routes),
    attempts: 1,
    delayMs: 0,
  });
}

test("static-site smoke accepts the approved route and privacy contract", async () => {
  const result = await run(successfulRoutes());
  assert.equal(result.bundle_path, bundlePath);
  assert.equal(result.representative_book_path, bookPath);
});

test("static-site smoke rejects missing approved privacy text", async () => {
  const routes = successfulRoutes();
  routes.set(bundlePath, response("August 19, 2026"));
  await assert.rejects(run(routes), /missing approved Privacy Notice text/);
});

test("static-site smoke rejects superseded privacy placeholders", async () => {
  const routes = successfulRoutes();
  const current = await routes.get(bundlePath).text();
  routes.set(bundlePath, response(`${current} {{PUBLIC_MAILBOX_ADDRESS}}`));
  await assert.rejects(run(routes), /contains superseded Privacy Notice text/);
});

test("static-site smoke rejects an unavailable application asset", async () => {
  const routes = successfulRoutes();
  routes.set(bundlePath, response("unavailable", 503));
  await assert.rejects(run(routes), /application bundle returned HTTP 503/);
});

test("static-site smoke rejects a wrong success-route status", async () => {
  const routes = successfulRoutes();
  routes.set(bookPath, response("missing", 404));
  await assert.rejects(run(routes), /representative book route returned HTTP 404/);
});

test("static-site smoke rejects soft 404 behavior", async () => {
  const routes = successfulRoutes();
  routes.set("/__static-site-smoke-404__", response("soft 404", 200));
  await assert.rejects(run(routes), /unknown route returned HTTP 200; expected 404/);
});

test("static-site smoke rejects credentialed or non-HTTPS origins", async () => {
  await assert.rejects(
    runSiteSmoke({ origin: "http://user:pass@example.test", bookPath, fetchImpl: fetchFrom(successfulRoutes()) }),
    /credential-free HTTPS origin/,
  );
  await assert.rejects(
    runSiteSmoke({ origin: "https://example.test/not-an-origin", bookPath, fetchImpl: fetchFrom(successfulRoutes()) }),
    /credential-free HTTPS origin/,
  );
});

test("static-site smoke rejects a cross-origin application bundle", async () => {
  const routes = successfulRoutes();
  routes.set("/", response('<script type="module" src="https://third-party.example/bundle.js"></script>'));
  await assert.rejects(run(routes), /module bundle must remain on the selected smoke origin/);
});
