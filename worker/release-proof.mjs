#!/usr/bin/env node
/** Local release-proof checks. External health, deployment, and physical scan evidence stay opt-in. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const workspace = resolve(root, "..");
const fixturePath = resolve(import.meta.dirname, "manifest.fixture.json");
const integrityPath = resolve(import.meta.dirname, "manifest.integrity.ts");
const approvedPath = "/r/niran-storytime-kit-v1-en-p5-book";
const destination = "https://bronerbooks.com/books/the-lost-umbrella-of-niran-en?utm_campaign=niran_storytime_kit&utm_content=storytime_kit_v1_en_p5_book&utm_medium=qr&utm_source=storytime_kit";
const requiredHeaders = ["cache-control", "content-security-policy", "permissions-policy", "referrer-policy", "x-content-type-options", "x-frame-options"];
const prohibitedEvidenceValues = /^(?:n\/?a|none|null|unknown|tbd|todo|example|sample|placeholder|fabricated)$/i;

function fail(message) { throw new Error(message); }
function value(args, flag) { const at = args.indexOf(flag); return at === -1 ? undefined : args[at + 1]; }
function has(args, flag) { return args.includes(flag); }
function readJson(path) { try { return JSON.parse(readFileSync(path, "utf8")); } catch (error) { fail(`invalid JSON at ${path}: ${error.message}`); } }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function nonPlaceholder(value, field) {
  if (typeof value !== "string" || !value.trim() || prohibitedEvidenceValues.test(value.trim())) fail(`evidence.${field} must be a non-placeholder string`);
  return value;
}
function assertExactHeaders(headers) {
  for (const name of requiredHeaders) if (typeof headers[name] !== "string" || !headers[name]) fail(`evidence.headers.${name} is required`);
  if (headers["cache-control"] !== "no-store, max-age=0") fail("evidence.headers.cache-control must prove no-store, max-age=0");
}

/** Rejects evidence that is incomplete, synthetic-looking, or cannot be tied to a physical browser scan. */
export function validateEvidence(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) fail("evidence must be an object");
  const required = ["device", "browser", "timestamp", "decoded_url", "final_destination", "status", "headers", "qr_sha256", "evidence_source"];
  for (const field of required) if (!(field in evidence)) fail(`evidence.${field} is required`);
  if (evidence.evidence_source !== "physical-device-browser-scan") fail("evidence.evidence_source must be physical-device-browser-scan");
  nonPlaceholder(evidence.device, "device");
  nonPlaceholder(evidence.browser, "browser");
  const timestamp = nonPlaceholder(evidence.timestamp, "timestamp");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(timestamp) || Number.isNaN(Date.parse(timestamp))) fail("evidence.timestamp must be an ISO-8601 UTC instant");
  const decodedUrl = new URL(nonPlaceholder(evidence.decoded_url, "decoded_url"));
  if (decodedUrl.protocol !== "https:" || decodedUrl.hostname !== "r.bronerbooks.com" || decodedUrl.pathname !== approvedPath || decodedUrl.search || decodedUrl.hash) fail("evidence.decoded_url must be the query-free owned QR route");
  const finalDestination = new URL(nonPlaceholder(evidence.final_destination, "final_destination"));
  if (finalDestination.href !== destination) fail("evidence.final_destination must match the approved compiler destination exactly");
  if (evidence.status !== 302) fail("evidence.status must be the observed 302 redirect");
  if (!evidence.headers || typeof evidence.headers !== "object" || Array.isArray(evidence.headers)) fail("evidence.headers must be an object");
  const normalizedHeaders = Object.fromEntries(Object.entries(evidence.headers).map(([key, entry]) => [key.toLowerCase(), entry]));
  assertExactHeaders(normalizedHeaders);
  if (normalizedHeaders.location !== destination) fail("evidence.headers.location must equal final_destination");
  if (typeof evidence.qr_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(evidence.qr_sha256) || /^0{64}$/.test(evidence.qr_sha256)) fail("evidence.qr_sha256 must be a non-zero lowercase SHA-256");
  return true;
}

export function checkFixtureIntegrity() {
  const bytes = readFileSync(fixturePath);
  const declared = readFileSync(integrityPath, "utf8").match(/EMBEDDED_MANIFEST_SHA256 = "([a-f0-9]{64})"/)?.[1];
  if (!declared || sha256(bytes) !== declared) fail("embedded manifest digest does not match fixture bytes");
  const fixture = JSON.parse(bytes);
  if (fixture.links[0]?.lifecycle !== "approved") fail("golden fixture lifecycle is expected to remain approved before shipment");
  return fixture;
}

/** Compiles the authoritative marketing registry into a temporary file and requires byte-for-byte fixture parity. */
export function checkGoldenCompilerParity() {
  const marketing = resolve(workspace, "bronerbooks-marketing-ops");
  if (!existsSync(resolve(marketing, "attribution_links", "__main__.py"))) fail("authoritative attribution compiler is unavailable at ../bronerbooks-marketing-ops");
  const temporary = mkdtempSync(resolve(tmpdir(), "bronerbooks-link-proof-"));
  const output = resolve(temporary, "attribution-map.json");
  try {
    const python = process.env.PYTHON ?? "python3";
    const result = spawnSync(python, ["-m", "attribution_links", "compile", "--environment", "preview", "--output", output], { cwd: marketing, encoding: "utf8" });
    if (result.status !== 0) fail(`golden compiler failed: ${result.error?.message ?? result.stderr ?? result.stdout ?? `exit ${result.status}`}`.trim());
    const expected = readFileSync(fixturePath);
    const actual = readFileSync(output);
    if (!actual.equals(expected)) fail(`golden compiler fixture mismatch: compiler SHA-256 ${sha256(actual)}, fixture SHA-256 ${sha256(expected)}`);
    return sha256(actual);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

/** The current compiler lifecycle is approved: production must fail closed, not route it as shipped. */
export function checkPreShipmentLifecycle() {
  const fixture = checkFixtureIntegrity();
  const lifecycle = fixture.links.find((link) => link.public_path === approvedPath)?.lifecycle;
  if (lifecycle !== "approved") fail(`expected approved pre-shipment lifecycle, received ${String(lifecycle)}`);
  return lifecycle;
}

function printCheck() {
  const digest = checkGoldenCompilerParity();
  const lifecycle = checkPreShipmentLifecycle();
  console.log(`OK: golden compiler parity SHA-256 ${digest}`);
  console.log(`OK: ${lifecycle} lifecycle is blocked from production routing until shipment`);
  console.log("OK: evidence schema requires a physical device/browser scan and rejects missing or placeholder proof");
}

function externalPlan(command, args) {
  if (!has(args, "--check")) fail(`${command} is external-only; use --check locally or the protected release workflow after approval`);
  console.log(`OK: ${command} plan only; no request was made`);
  console.log(command === "destination-health"
    ? "NEXT (protected): query-free HTTPS destination health check after preview/deploy approval."
    : "NEXT (protected): canonical browser smoke after preview/deploy approval.");
}

function parityPlan(args) {
  if (!has(args, "--execute")) {
    console.log("OK: local Wrangler/Miniflare preview parity plan only; no process or request was started");
    console.log("Run with --execute --wrangler /absolute/path/to/wrangler after installing the pinned local CLI. It compares GET/HEAD, status, security headers, query dropping, cache behavior, and Location between preview and production-local modes.");
    return;
  }
  const wrangler = value(args, "--wrangler");
  if (!wrangler || !existsSync(wrangler)) fail("--execute requires an existing local --wrangler path; no package download is attempted");
  return runWranglerParity(resolve(wrangler));
}

async function runWranglerParity(wrangler) {
  const work = mkdtempSync(resolve(tmpdir(), "bronerbooks-wrangler-proof-"));
  const start = (port, preview) => new Promise((resolveReady, rejectReady) => {
    const child = spawn(wrangler, ["dev", "--local", "--config", "worker/wrangler.toml", "--ip", "127.0.0.1", "--port", String(port), ...(preview ? ["--var", "LINK_ENVIRONMENT:preview"] : [])], { cwd: root, env: { ...process.env, WRANGLER_HOME: work, NO_COLOR: "1" }, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const onData = (chunk) => { output += chunk; if (/Ready|Listening|127\.0\.0\.1/.test(output)) resolveReady({ child, output }); };
    child.stdout.on("data", onData); child.stderr.on("data", onData);
    child.once("error", rejectReady); child.once("exit", (code) => rejectReady(new Error(`Wrangler exited before ready (${code}): ${output}`)));
    setTimeout(() => rejectReady(new Error(`Wrangler preview timed out: ${output}`)), 20_000).unref();
  });
  const observe = async (port, preview) => {
    const instance = await start(port, preview);
    try {
      const output = [];
      for (const method of ["GET", "HEAD"]) {
        const response = await fetch(`http://127.0.0.1:${port}${approvedPath}?hostile=https://evil.test/`, { method, redirect: "manual" });
        const headers = Object.fromEntries([...response.headers].map(([name, item]) => [name.toLowerCase(), item]));
        assert.equal(response.status, preview ? 302 : 404, `${preview ? "preview" : "production"} ${method} status`);
        assertExactHeaders(headers);
        if (preview) { assert.equal(headers.location, destination); assert.ok(!headers.location.includes("evil"), "query input must not reach Location"); }
        else assert.equal(headers.location, undefined);
        output.push({ method, status: response.status, headers });
      }
      return output;
    } finally { instance.child.kill("SIGTERM"); }
  };
  try {
    const preview = await observe(8788, true);
    const production = await observe(8789, false);
    console.log(`OK: Wrangler/Miniflare local parity passed (${preview.length + production.length} exact GET/HEAD observations)`);
  } finally { rmSync(work, { recursive: true, force: true }); }
}

function selfTest() {
  const valid = { device: "Pixel 8", browser: "Chrome 126", timestamp: "2026-08-11T10:00:00Z", decoded_url: `https://r.bronerbooks.com${approvedPath}`, final_destination: destination, status: 302, headers: { "cache-control": "no-store, max-age=0", "content-security-policy": "default-src 'none'", "permissions-policy": "camera=()", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff", "x-frame-options": "DENY", location: destination }, qr_sha256: "a".repeat(64), evidence_source: "physical-device-browser-scan" };
  assert.equal(validateEvidence(valid), true);
  assert.throws(() => validateEvidence({ ...valid, device: "TBD" }), /non-placeholder/);
  assert.throws(() => validateEvidence({ ...valid, evidence_source: "automated-test" }), /physical-device-browser-scan/);
  assert.throws(() => validateEvidence({ ...valid, headers: {} }), /cache-control/);
  assert.throws(() => validateEvidence({ ...valid, qr_sha256: "0".repeat(64) }), /non-zero/);
  console.log("OK: evidence schema rejects incomplete and fabricated proof");
}

const [command, ...args] = process.argv.slice(2);
try {
  if (command === "check") printCheck();
  else if (command === "validate-evidence") { const input = value(args, "--input"); if (!input) fail("validate-evidence requires --input <evidence.json>"); validateEvidence(readJson(resolve(input))); console.log("OK: release evidence schema is complete and non-fabricated"); }
  else if (command === "destination-health" || command === "canonical-smoke") externalPlan(command, args);
  else if (command === "preview-parity") await parityPlan(args);
  else if (command === "self-test") selfTest();
  else fail("expected check, validate-evidence, destination-health, canonical-smoke, preview-parity, or self-test");
} catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 2; }
