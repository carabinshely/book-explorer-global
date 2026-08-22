import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  activeVersionId,
  assertActiveVersion,
  assertVersionMetadata,
  computeDistFingerprint,
  normalizeDeploymentSnapshot,
  parseVersionUploadOutput,
} from "./site-production-release.mjs";

const version = "6030742a-3272-4a68-b601-5abb87d7e3c7";
const previous = "11111111-2222-4333-8444-555555555555";
const commit = "2e342021e87064e0e457ea601b99b3f84e2e3d93";
const digest = "a".repeat(64);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("dist fingerprints are deterministic and content-sensitive", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "bronerbooks-site-artifact-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, "index.html"), "home");
  await writeFile(join(directory, "asset.js"), "bundle");
  const first = await computeDistFingerprint(directory);
  const second = await computeDistFingerprint(directory);
  assert.deepEqual(first, second);
  assert.equal(first.file_count, 2);
  await writeFile(join(directory, "asset.js"), "changed bundle");
  const changed = await computeDistFingerprint(directory);
  assert.notEqual(first.sha256, changed.sha256);
});

test("deployment parsing requires one version at 100 percent", () => {
  assert.equal(activeVersionId([]), null);
  assert.equal(activeVersionId([{ versions: [{ version_id: previous, percentage: 100 }] }]), previous);
  assert.throws(
    () => activeVersionId([{ versions: [{ version_id: previous, percentage: 50 }] }]),
    /exactly one version at 100%/,
  );
  assert.throws(
    () => activeVersionId([{
      versions: [
        { version_id: previous, percentage: 50 },
        { version_id: version, percentage: 50 },
      ],
    }]),
    /exactly one version at 100%/,
  );
  assert.throws(() => activeVersionId({}), /deployment state must be an array/);
  assert.throws(
    () => assertActiveVersion([{ versions: [{ version_id: previous, percentage: 100 }] }], version),
    /does not match/,
  );
});

test("deployment HTTP state normalization preserves 404 and 204 semantics", () => {
  assert.deepEqual(normalizeDeploymentSnapshot({
    httpStatus: "204",
    operation: "upload",
    phase: "before",
  }), []);
  assert.deepEqual(normalizeDeploymentSnapshot({
    httpStatus: "204",
    operation: "promote",
    phase: "before",
  }), []);
  assert.deepEqual(normalizeDeploymentSnapshot({
    httpStatus: "404",
    operation: "upload",
    phase: "before",
  }), []);
  assert.deepEqual(normalizeDeploymentSnapshot({
    httpStatus: "200",
    operation: "upload",
    phase: "before",
    deployments: { result: [] },
  }), []);
  assert.throws(
    () => normalizeDeploymentSnapshot({
      httpStatus: "404",
      operation: "promote",
      phase: "before",
    }),
    /resource does not exist/,
  );
  assert.throws(
    () => normalizeDeploymentSnapshot({
      httpStatus: "404",
      operation: "upload",
      phase: "after",
    }),
    /resource does not exist/,
  );
  assert.throws(
    () => normalizeDeploymentSnapshot({
      httpStatus: "503",
      operation: "upload",
      phase: "before",
    }),
    /unavailable \(HTTP 503\)/,
  );
  assert.throws(
    () => normalizeDeploymentSnapshot({
      httpStatus: "200",
      operation: "upload",
      phase: "before",
      deployments: {},
    }),
    /deployment state must be an array/,
  );
});

test("zero-deployment upload remains empty before and after", () => {
  const before = normalizeDeploymentSnapshot({
    httpStatus: "204",
    operation: "upload",
    phase: "before",
  });
  const after = normalizeDeploymentSnapshot({
    httpStatus: "204",
    operation: "upload",
    phase: "after",
  });
  assert.equal(activeVersionId(before), null);
  assert.equal(activeVersionId(after), null);
  assert.deepEqual(after, before);
});

test("first promotion transitions empty state to the selected exact version", () => {
  const before = normalizeDeploymentSnapshot({
    httpStatus: "204",
    operation: "promote",
    phase: "before",
  });
  const after = normalizeDeploymentSnapshot({
    httpStatus: "200",
    operation: "promote",
    phase: "after",
    deployments: [{ versions: [{ version_id: version, percentage: 100 }] }],
  });
  assert.equal(activeVersionId(before), null);
  assert.equal(assertActiveVersion(after, version), version);
});

test("version metadata is bound to the exact commit and dist digest", () => {
  const metadata = {
    id: version,
    annotations: { "workers/message": `commit:${commit};dist:${digest}` },
  };
  assert.equal(assertVersionMetadata(metadata, { versionId: version, commit, digest }), metadata);
  assert.throws(
    () => assertVersionMetadata(metadata, { versionId: version, commit: "f".repeat(40), digest }),
    /does not match/,
  );
  assert.throws(
    () => assertVersionMetadata(metadata, { versionId: version, commit, digest: "b".repeat(64) }),
    /does not match/,
  );
});

test("Wrangler upload output must name the production Worker and exact version preview", () => {
  const valid = JSON.stringify({
    type: "version-upload",
    worker_name: "bronerbooks-site-production",
    version_id: version,
    preview_url: "https://6030742a-bronerbooks-site-production.crab2007.workers.dev",
  });
  assert.deepEqual(parseVersionUploadOutput(valid), {
    version_id: version,
    preview_url: "https://6030742a-bronerbooks-site-production.crab2007.workers.dev",
  });
  assert.throws(
    () => parseVersionUploadOutput(valid.replace("bronerbooks-site-production", "unexpected-worker")),
    /unexpected Worker/,
  );
  assert.throws(
    () => parseVersionUploadOutput(valid.replace("crab2007.workers.dev", "example.com")),
    /invalid production version preview URL/,
  );
});

test("preview and production static-host configs keep the frozen assets-only boundary", async () => {
  const preview = JSON.parse(await readFile(join(repoRoot, "wrangler.site-preview.jsonc"), "utf8"));
  const production = JSON.parse(await readFile(join(repoRoot, "wrangler.site-production.jsonc"), "utf8"));
  assert.equal(preview.name, "bronerbooks-site-preview");
  assert.equal(preview.workers_dev, true);
  assert.equal(production.name, "bronerbooks-site-production");
  assert.equal(production.workers_dev, false);
  assert.equal(production.preview_urls, true);
  assert.deepEqual(production.assets, preview.assets);
  for (const key of [
    "main",
    "route",
    "routes",
    "env",
    "vars",
    "triggers",
    "services",
    "kv_namespaces",
    "r2_buckets",
    "d1_databases",
    "durable_objects",
  ]) {
    assert.equal(production[key], undefined, `production config must not define ${key}`);
  }
});

test("production workflow is manual, protected, main-gated, and has no zone authority", async () => {
  const workflow = await readFile(
    join(repoRoot, ".github", "workflows", "site-production-promotion.yml"),
    "utf8",
  );
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*push:/m);
  assert.match(workflow, /default: check/);
  assert.match(workflow, /options: \[check, upload, promote, verify-live\]/);
  assert.match(workflow, /name: site-static-production/);
  assert.match(workflow, /refs\/heads\/main/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN_SITE_PRODUCTION/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /normalize-deployments/);
  assert.match(workflow, /--phase before/);
  assert.match(workflow, /--phase after/);
  assert.match(workflow, /active_version_after/);
  assert.match(workflow, /active_version=\$\{previous\}/);
  assert.match(workflow, /unavailable-first-promotion/);
  const verifiedDeployment = workflow.lastIndexOf("site-production-release.mjs verify-deployment");
  const recordedActiveVersion = workflow.indexOf('echo "active_version=${version}"');
  const postPromotionSmoke = workflow.indexOf(
    'node scripts/site-smoke.mjs --origin "${{ steps.selected.outputs.preview_url }}"',
  );
  assert.ok(verifiedDeployment < recordedActiveVersion);
  assert.ok(recordedActiveVersion < postPromotionSmoke);
  assert.match(workflow, /wrangler versions upload --config wrangler\.site-production\.jsonc/);
  assert.match(workflow, /wrangler versions deploy "\$\{version\}@100%"/);
  assert.doesNotMatch(workflow, /version="\$\{\{ inputs\.version \}\}"/);
  assert.doesNotMatch(workflow, /CLOUDFLARE_ZONE_ID/);
  assert.doesNotMatch(workflow, /wrangler\s+deploy(?:\s|$)/m);
  assert.doesNotMatch(workflow, /--(?:route|routes|domain|domains)\b/);
});

test("GitHub Pages remains the automatic main deployment and live privacy status owner", async () => {
  const workflow = await readFile(join(repoRoot, ".github", "workflows", "deploy.yml"), "utf8");
  assert.match(workflow, /push:\s*\n\s*branches: \[main\]/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /privacy-live-smoke/);
  assert.match(workflow, /node scripts\/site-smoke\.mjs --origin https:\/\/bronerbooks\.com/);
  assert.doesNotMatch(workflow, /bronerbooks-site-production/);
});
