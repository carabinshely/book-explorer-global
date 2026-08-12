import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const run = (...args) => spawnSync("node", ["scripts/links-dx.mjs", ...args], { encoding: "utf8" });

test("check and local preview remain credential-free", () => {
  for (const args of [["check", "--environment", "preview"], ["preview", "--environment", "preview"], ["smoke", "--environment", "preview", "--check"]]) {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /OK:/);
  }
});

test("production deploy and rollback require exact version and never execute in check mode", () => {
  for (const command of ["deploy", "rollback"]) {
    const missing = run(command, "--environment", "production", "--check");
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /exact --version/);
    const planned = run(command, "--environment", "production", "--version", "abc123", "--check");
    assert.equal(planned.status, 0, planned.stderr);
    assert.match(planned.stdout, /dry-run:/);
  }
  const previewRollback = run("rollback", "--environment", "preview", "--check");
  assert.equal(previewRollback.status, 2);
  const plannedRollback = run("rollback", "--environment", "preview", "--version", "abc123", "--check");
  assert.equal(plannedRollback.status, 0, plannedRollback.stderr);
  assert.match(plannedRollback.stdout, /wrangler@4\.32\.0 versions deploy abc123 --name bronerbooks-link-resolver-preview/);
});

test("production commands use the Wrangler environment-suffixed Worker name", () => {
  const result = run("deploy", "--environment", "production", "--version", "abc123", "--check");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--name bronerbooks-link-resolver-production/);
});

test("route detach has no version dependency and remains dry-run by default", () => {
  const result = run("detach-route", "--environment", "production", "--check");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /wrangler\.detach\.toml/);
});

test("remote operations refuse without an explicit execution mode", () => {
  const result = run("deploy", "--environment", "preview");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /disabled by default/);
});

// Keep workflow diagnostics inspectable while retaining the guarded deployment boundary.
test("production workflow uploads the exact commit artifact, deploys its captured version, and attaches only /r", () => {
  const workflow = readFileSync(".github/workflows/link-worker-promotion.yml", "utf8");
  const config = readFileSync("worker/wrangler.toml", "utf8");
  const detachConfig = readFileSync("worker/wrangler.detach.toml", "utf8");
  assert.match(workflow, /workers\/scripts\/\$\{worker_name\}/);
  assert.match(workflow, /bronerbooks-link-resolver-production/);
  assert.match(workflow, /wrangler@4\.32\.0 deploy --config worker\/wrangler\.toml --env production/);
  assert.match(workflow, /versions upload --config worker\/wrangler\.toml --env production/);
  assert.match(workflow, /versions view "\$version" --name "\$worker_name" --json/);
  assert.match(workflow, /links:deploy:production -- --version "\$\{\{ steps\.production_upload\.outputs\.version \}\}" --execute/);
  assert.match(workflow, /links:attach-route/);
  assert.match(workflow, /post-route failure; detaching production route/);
  assert.match(workflow, /links:detach-route -- --environment production --execute/);
  assert.match(workflow, /CLOUDFLARE_ZONE_ID/);
  assert.match(workflow, /Cloudflare Zone Read permission verified for bronerbooks\.com/);
  assert.match(config, /\[env\.production\]/);
  assert.match(config, /workers_dev = false/);
  assert.match(config, /preview_urls = false/);
  assert.match(config, /pattern = "bronerbooks\.com\/r\/\*", zone_name = "bronerbooks\.com"/);
  assert.doesNotMatch(config, /bronerbooks\.com\/\*"/);
  assert.match(detachConfig, /name = "bronerbooks-link-resolver-production"/);
  assert.match(detachConfig, /routes = \[\]/);
});

test("promotion workflow authenticates before execution without suppressing Wrangler diagnostics", () => {
  const workflow = readFileSync(".github/workflows/link-worker-promotion.yml", "utf8");
  const runner = readFileSync("scripts/links-dx.mjs", "utf8");
  const runbook = readFileSync("docs/runbooks/link-worker.md", "utf8");

  assert.doesNotMatch(workflow, /WRANGLER_LOG\s*:/);
  assert.doesNotMatch(runner, /WRANGLER_LOG/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID: \$\{\{ vars\.CLOUDFLARE_ACCOUNT_ID \}\}/);
  assert.doesNotMatch(workflow, /wrangler@4\.32\.0 whoami/);
  assert.match(workflow, /https:\/\/api\.cloudflare\.com\/client\/v4\/user\/tokens\/verify/);
  assert.match(workflow, /OK: Cloudflare API token verified/);
  assert.doesNotMatch(workflow, /console\.log\(body\)/);
  assert.ok(workflow.indexOf("name: Verify Cloudflare token and account configuration") < workflow.indexOf("name: Upload exact production commit artifact and capture version"));
  assert.match(runbook, /`\/memberships` endpoint/);
  assert.match(runbook, /does not print the token,\naccount ID, or API response/);
});

const linksDx = await import("./links-dx.mjs");
const proof = await import("../worker/release-proof.mjs");

test("remote smoke targets the approved route and rejects ambiguous base URLs", () => {
  assert.equal(
    linksDx.resolveSmokeUrl("https://preview.example.test").href,
    `https://preview.example.test${proof.approvedPath}`,
  );
  for (const rawUrl of [
    "http://preview.example.test",
    "https://preview.example.test/?unexpected=1",
    "https://preview.example.test/#fragment",
    "https://preview.example.test/not-the-worker-root",
    "https://user:pass@preview.example.test",
  ]) {
    assert.throws(() => linksDx.resolveSmokeUrl(rawUrl), /LINK_SMOKE_URL/);
  }
});

test("shared release-proof contract requires exact GET/HEAD preview redirects", () => {
  const headers = {
    "cache-control": "no-store, max-age=0",
    "content-security-policy": "default-src 'none'",
    "permissions-policy": "camera=()",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    location: proof.destination,
  };
  for (const method of ["GET", "HEAD"]) assert.doesNotThrow(() => proof.assertRemoteSmokeResponse("preview", method, 302, headers));
  assert.throws(() => proof.assertRemoteSmokeResponse("preview", "GET", 302, { ...headers, location: `${proof.destination}&hostile=1` }), /Location/);
  assert.throws(() => proof.assertRemoteSmokeResponse("preview", "HEAD", 200, headers), /status/);
  assert.throws(() => proof.assertRemoteSmokeResponse("preview", "GET", 302, { ...headers, "cache-control": "max-age=60" }), /cache-control/);
});
