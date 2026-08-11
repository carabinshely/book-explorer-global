import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
    assert.match(planned.stdout, /dry-run plan/);
  }
});

test("remote operations refuse without an explicit execution mode", () => {
  const result = run("deploy", "--environment", "preview");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /disabled by default/);
});
