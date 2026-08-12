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

test("remote operations refuse without an explicit execution mode", () => {
  const result = run("deploy", "--environment", "preview");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /disabled by default/);
});

// Keep workflow diagnostics inspectable while retaining the guarded deployment boundary.
test("promotion workflow authenticates before execution without suppressing Wrangler diagnostics", () => {
  const workflow = readFileSync(".github/workflows/link-worker-promotion.yml", "utf8");
  const runner = readFileSync("scripts/links-dx.mjs", "utf8");
  const runbook = readFileSync("docs/runbooks/link-worker.md", "utf8");

  assert.doesNotMatch(workflow, /WRANGLER_LOG\s*:/);
  assert.doesNotMatch(runner, /WRANGLER_LOG/);
  assert.match(workflow, /name: Verify Cloudflare authentication\n        if: \$\{\{ inputs\.operation != 'check' \}\}\n        run: npx --yes wrangler@4\.32\.0 whoami/);
  assert.ok(workflow.indexOf("name: Verify Cloudflare authentication") < workflow.indexOf("name: Execute approved operation"));
  assert.match(runbook, /default sanitized, non-debug\nlogging so fatal diagnostics remain visible/);
});
