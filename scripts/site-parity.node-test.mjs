import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import {
  exitCodeForResults,
  formatTextReport,
  main,
  normalizeOrigin,
  parseHtmlMetadata,
  parseSitemapLocations,
  privacyMarkerStatus,
  sanitizeHeaders,
  stripJsonComments,
  validateRedirectObservation,
  validateRepositoryContracts,
} from "./site-parity.mjs";

const root = resolve(import.meta.dirname, "..");

test("origin validation accepts only credential-free HTTPS origins", () => {
  assert.equal(normalizeOrigin("https://preview.example.test"), "https://preview.example.test");
  for (const value of [
    "http://preview.example.test",
    "https://preview.example.test/path",
    "https://preview.example.test/?query=1",
    "https://user:secret@preview.example.test",
  ]) {
    assert.throws(() => normalizeOrigin(value), /HTTPS origin/);
  }
});

test("JSONC stripping preserves URLs inside strings", () => {
  const value = stripJsonComments('{"url":"https://example.test/a",// comment\n"enabled":true/* comment */}');
  assert.deepEqual(JSON.parse(value), { url: "https://example.test/a", enabled: true });
});

test("HTML and sitemap parsing captures canonical parity metadata", () => {
  const html = '<title>Privacy Notice | Broner Books</title><link href="https://bronerbooks.com/privacy" rel="canonical"><meta content="noindex,follow" name="robots"><script src="/assets/index.js" type="module"></script>';
  assert.deepEqual(parseHtmlMetadata(html), {
    title: "Privacy Notice | Broner Books",
    canonical: "https://bronerbooks.com/privacy",
    robots: "noindex,follow",
    moduleScripts: ["/assets/index.js"],
  });
  assert.deepEqual(
    parseSitemapLocations("<loc>https://bronerbooks.com/privacy</loc><loc>https://bronerbooks.com/</loc>"),
    ["https://bronerbooks.com/", "https://bronerbooks.com/privacy"],
  );
});

test("privacy markers require the approved identity and reject superseded text", () => {
  const identity = {
    publicPostalAddress: "P.O. Box 4244, Haifa 3104201, Israel",
    privacyNoticeEffectiveDate: "2026-08-19",
  };
  const passing = privacyMarkerStatus(
    "P.O. Box 4244, Haifa 3104201, Israel August 19, 2026 Children's content and adult data collection",
    identity,
  );
  assert.deepEqual(passing, { missing: [], prohibited: [] });
  const failing = privacyMarkerStatus("{{PUBLIC_MAILBOX_ADDRESS}} provisional pending review", identity);
  assert.equal(failing.missing.length, 3);
  assert.deepEqual(failing.prohibited, ["provisional pending review", "{{PUBLIC_MAILBOX_ADDRESS}}"]);
});

test("selected response evidence excludes cookies and authorization data", () => {
  const headers = new Headers({
    Authorization: "Bearer secret",
    "Cache-Control": "no-store",
    Location: "https://bronerbooks.com/",
    "Set-Cookie": "secret=value",
  });
  assert.deepEqual(sanitizeHeaders(headers), {
    "cache-control": "no-store",
    location: "https://bronerbooks.com/",
  });
});

test("repository route classifications preserve resolver and reserved signup boundaries", () => {
  const results = validateRepositoryContracts(root);
  assert.equal(results.length, 6);
  assert.ok(results.every((entry) => entry.pass), results.map((entry) => entry.actual).join("\n"));
  assert.match(results.find((entry) => entry.surface === "resolver route ownership").expected, /\/r\/\*/);
  assert.match(results.find((entry) => entry.surface === "reserved signup route").expected, /niran-storytime-signup/);
  assert.match(results.find((entry) => entry.surface === "signup activation state").expected, /false/);
});

test("redirect and failure helpers enforce exact outcomes", () => {
  assert.equal(validateRedirectObservation({ status: 307, headers: { location: "https://example.test/privacy" } }, 307, "https://example.test/privacy"), true);
  assert.equal(validateRedirectObservation({ status: 307, headers: { location: "/privacy" } }, 307, "https://example.test/privacy"), true);
  assert.equal(validateRedirectObservation({ status: 307, headers: { location: "https://example.test/wrong" } }, 307, "https://example.test/privacy"), false);
  assert.equal(exitCodeForResults([{ pass: true }]), 0);
  assert.equal(exitCodeForResults([{ pass: true }, { pass: false }]), 1);
});

test("text evidence is deterministic and contains no response bodies", () => {
  const report = {
    preview_origin: "https://preview.example.test",
    live_origin: "https://bronerbooks.com",
    summary: { passed: 1, failed: 0, total: 1 },
    results: [{ category: "static", surface: "/", pass: true, expected: "200", actual: "200 HTML" }],
  };
  const output = formatTextReport(report);
  assert.match(output, /1\/1 passed/);
  assert.match(output, /\| PASS \| static \| \/ \| 200 \| 200 HTML \|/);
  assert.doesNotMatch(output, /cookie|authorization|response body/i);
});

test("CLI input errors return exit code 2 without making a request", async () => {
  let requests = 0;
  let errors = "";
  const code = await main([], {
    fetchImpl: async () => { requests += 1; throw new Error("must not run"); },
    rootDir: root,
    writeOut: () => {},
    writeErr: (value) => { errors += value; },
  });
  assert.equal(code, 2);
  assert.equal(requests, 0);
  assert.match(errors, /--preview-origin is required/);
});
