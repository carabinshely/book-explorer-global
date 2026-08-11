import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const run = (...args) => spawnSync("node", ["worker/release-proof.mjs", ...args], { encoding: "utf8" });

test("release-proof local checks prove golden compiler parity and pre-shipment gating", () => {
  const result = run("check");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /golden compiler parity SHA-256/);
  assert.match(result.stdout, /approved lifecycle is blocked from production routing/);
});

test("external health and canonical commands are dry-run-only locally", () => {
  for (const command of ["destination-health", "canonical-smoke"]) {
    const checked = run(command, "--check");
    assert.equal(checked.status, 0, checked.stderr);
    assert.match(checked.stdout, /no request was made/);
    const unguarded = run(command);
    assert.equal(unguarded.status, 2);
    assert.match(unguarded.stderr, /external-only/);
  }
});

test("preview parity remains opt-in and does not download a CLI", () => {
  const result = run("preview-parity");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /no process or request was started/);
  const unavailable = run("preview-parity", "--execute", "--wrangler", "/missing/wrangler");
  assert.equal(unavailable.status, 2);
  assert.match(unavailable.stderr, /existing local/);
});

test("evidence schema test suite rejects incomplete and fabricated proof", () => {
  const result = run("self-test");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /rejects incomplete and fabricated/);
});
