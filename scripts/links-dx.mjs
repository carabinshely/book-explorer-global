#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { approvedPath, assertRemoteSmokeResponse } from "../worker/release-proof.mjs";

const [command, ...args] = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
};
const environment = value("--environment") ?? "preview";
const version = value("--version");
const check = has("--check");
const execute = has("--execute");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 2;
}
function plan(message) { console.log(`OK: ${message}`); }
function requireEnvironment() {
  if (!["preview", "production"].includes(environment)) {
    fail("--environment must be preview or production");
    return false;
  }
  return true;
}
function requireVersion() {
  if (!version || !/^[A-Za-z0-9_-]{6,128}$/.test(version)) {
    fail("an exact --version <Cloudflare Worker version ID> is required");
    return false;
  }
  return true;
}
function workerName() {
  return environment === "production" ? "bronerbooks-link-resolver" : "bronerbooks-link-resolver-preview";
}
export function resolveSmokeUrl(rawUrl) {
  let base;
  try { base = new URL(rawUrl); } catch { throw new Error("LINK_SMOKE_URL must be an absolute query-free HTTPS origin/base URL"); }
  if (base.protocol !== "https:" || base.search || base.hash || base.pathname !== "/" || base.username || base.password) {
    throw new Error("LINK_SMOKE_URL must be a query-free, fragment-free HTTPS origin/base URL without a path or credentials");
  }
  return new URL(approvedPath, base);
}
async function smokeRemote(url) {
  for (const method of ["GET", "HEAD"]) {
    const response = await fetch(`${url.href}?hostile=https%3A%2F%2Fevil.test`, { method, redirect: "manual", signal: AbortSignal.timeout(15_000) });
    const headers = Object.fromEntries([...response.headers].map(([name, item]) => [name.toLowerCase(), item]));
    assertRemoteSmokeResponse(environment, method, response.status, headers);
  }
}
function versionDeployCommand() {
  return ["versions", "deploy", version, "--name", workerName(), "--env", environment, "--yes"];
}
function runWrangler(commandArgs) {
  const result = spawnSync("npx", ["--yes", "wrangler@4.32.0", ...commandArgs], {
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) process.exitCode = result.status ?? 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
if (!command) fail("expected check, preview, smoke-local, smoke, deploy, rollback, attach-route, or detach-route");
else if (command === "check") {
  if (!requireEnvironment()) process.exitCode = 2;
  else {
    const result = spawnSync("node", ["worker/verify-fixture.mjs"], { stdio: "inherit" });
    if (result.status !== 0) process.exitCode = result.status ?? 1;
    else plan(`${environment} link manifest is locally verified; no network or credentials used`);
  }
} else if (command === "preview") {
  if (requireEnvironment()) plan(`local ${environment} preview is prepared; run npm run links:smoke:local before an authenticated preview`);
} else if (command === "smoke-local") {
  const result = spawnSync("bash", ["worker/smoke.sh"], { stdio: "inherit" });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else plan("local Worker smoke passed; no remote request was made");
} else if (command === "smoke") {
  if (!requireEnvironment()) process.exitCode = 2;
  else if (check) plan(`${environment} smoke plan is query-free and read-only; set LINK_SMOKE_URL and use --execute only in the protected workflow`);
  else if (!execute) fail("remote smoke is disabled by default; rerun with --check or use protected workflow execution");
  else if (!process.env.LINK_SMOKE_URL) fail("LINK_SMOKE_URL is required for a remote smoke");
  else {
    try {
      const url = resolveSmokeUrl(process.env.LINK_SMOKE_URL);
      await smokeRemote(url);
      plan(`${environment} remote smoke passed for ${url.pathname} (GET/HEAD, security/cache headers, exact redirect contract, query dropped)`);
    } catch (error) { fail(error.message); }
  }
} else if (command === "deploy" || command === "rollback" || command === "attach-route" || command === "detach-route") {
  if (!requireEnvironment()) process.exitCode = 2;
  else if (((command === "deploy" && environment === "production") || command === "rollback" || command === "attach-route") && !requireVersion()) process.exitCode = 2;
  else if (check) {
    const intended = command === "detach-route"
      ? "npx --yes wrangler@4.32.0 triggers deploy --config worker/wrangler.detach.toml"
      : command === "attach-route"
        ? "npx --yes wrangler@4.32.0 triggers deploy --config worker/wrangler.toml --env production"
      : command === "rollback" || environment === "production"
        ? `npx --yes wrangler@4.32.0 ${versionDeployCommand().join(" ")}`
        : "npx --yes wrangler@4.32.0 deploy --config worker/wrangler.toml --env preview --var LINK_ENVIRONMENT:preview";
    plan(`${command} ${environment} dry-run: ${intended}; no deployment was attempted`);
  }
  else if (!execute) fail(`${command} is disabled by default; use --check locally or protected workflow --execute`);
  else if (!process.env.CLOUDFLARE_API_TOKEN) fail("CLOUDFLARE_API_TOKEN is required only for protected workflow execution");
  else if (command === "detach-route") runWrangler(["triggers", "deploy", "--config", "worker/wrangler.detach.toml"]);
  else if (command === "attach-route") runWrangler(["triggers", "deploy", "--config", "worker/wrangler.toml", "--env", "production"]);
  else if (command === "rollback" || environment === "production") runWrangler(versionDeployCommand());
  else runWrangler(["deploy", "--config", "worker/wrangler.toml", "--env", "preview", "--var", "LINK_ENVIRONMENT:preview"]);
} else fail(`unknown command: ${command}`);

}
