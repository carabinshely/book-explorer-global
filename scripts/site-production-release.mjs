import { createHash } from "node:crypto";
import { appendFile, lstat, readFile, readdir, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const PRODUCTION_WORKER = "bronerbooks-site-production";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function filesBelow(directory) {
  const files = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = resolve(current, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        files.push(absolute);
      } else {
        throw new Error(`dist fingerprint rejects non-file entry: ${entry.name}`);
      }
    }
  }
  await visit(directory);
  return files.sort((left, right) => left.localeCompare(right, "en"));
}

export async function computeDistFingerprint(directory) {
  const absoluteDirectory = resolve(directory);
  const directoryStat = await lstat(absoluteDirectory);
  if (!directoryStat.isDirectory()) throw new Error("dist fingerprint target must be a directory");

  const paths = await filesBelow(absoluteDirectory);
  if (paths.length === 0) throw new Error("dist fingerprint target must contain files");

  let largestAssetBytes = 0;
  const manifestLines = [];
  for (const path of paths) {
    const content = await readFile(path);
    const relativePath = relative(absoluteDirectory, path).split(sep).join("/");
    largestAssetBytes = Math.max(largestAssetBytes, content.byteLength);
    manifestLines.push(`${sha256(content)}  ${content.byteLength}  ${relativePath}\n`);
  }

  return {
    schema_version: "bronerbooks-static-site-artifact-v1",
    sha256: sha256(manifestLines.join("")),
    file_count: paths.length,
    largest_asset_bytes: largestAssetBytes,
  };
}

function normalizeCollection(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.result)) return value.result;
  if (Array.isArray(value?.items)) return value.items;
  throw new Error("deployment state must be an array or contain an array result/items collection");
}

export function normalizeDeploymentSnapshot({ httpStatus, operation, phase, deployments }) {
  if (!new Set(["upload", "promote"]).has(operation)) {
    throw new Error("deployment snapshot operation must be upload or promote");
  }
  if (!new Set(["before", "after"]).has(phase)) {
    throw new Error("deployment snapshot phase must be before or after");
  }
  if (!/^[0-9]{3}$/.test(httpStatus ?? "")) {
    throw new Error("deployment snapshot HTTP status must be a three-digit string");
  }

  if (httpStatus === "204") return [];
  if (httpStatus === "404") {
    if (operation === "upload" && phase === "before") return [];
    throw new Error("production Worker/version resource does not exist");
  }
  if (httpStatus !== "200") {
    throw new Error(`production Worker state is unavailable (HTTP ${httpStatus})`);
  }
  return normalizeCollection(deployments);
}

export function activeVersionId(deployments) {
  const normalized = normalizeCollection(deployments);
  if (normalized.length === 0) return null;
  const versions = normalized[0]?.versions;
  if (!Array.isArray(versions) || versions.length !== 1 || Number(versions[0].percentage) !== 100) {
    throw new Error("latest production deployment must contain exactly one version at 100% traffic");
  }
  const versionId = versions[0].version_id;
  if (!VERSION_ID_PATTERN.test(versionId ?? "")) {
    throw new Error("latest production deployment contains an invalid version ID");
  }
  return versionId;
}

export function assertActiveVersion(deployments, expectedVersion) {
  assertVersionId(expectedVersion);
  const actual = activeVersionId(deployments);
  if (actual !== expectedVersion) {
    throw new Error(`active production version ${actual ?? "none"} does not match ${expectedVersion}`);
  }
  return actual;
}

export function assertVersionMetadata(version, { versionId, commit, digest }) {
  assertVersionId(versionId);
  if (!COMMIT_PATTERN.test(commit ?? "")) throw new Error("expected commit must be a 40-character SHA");
  if (!DIGEST_PATTERN.test(digest ?? "")) throw new Error("expected dist digest must be SHA-256");
  const value = version?.result ?? version;
  if (value?.id !== versionId) throw new Error("Cloudflare version metadata returned a different version ID");
  const message = value?.annotations?.["workers/message"];
  const expectedMessage = `commit:${commit};dist:${digest}`;
  if (message !== expectedMessage) {
    throw new Error("Cloudflare version metadata does not match the selected commit and dist digest");
  }
  return value;
}

export function parseVersionUploadOutput(ndjson, worker = PRODUCTION_WORKER) {
  const entries = ndjson
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const entry = entries.findLast((item) => item.type === "version-upload");
  if (!entry) throw new Error("Wrangler output did not contain a version-upload record");
  if (entry.worker_name !== worker) throw new Error("Wrangler uploaded an unexpected Worker");
  assertVersionId(entry.version_id);

  const preview = new URL(entry.preview_url);
  const expectedPrefix = `${entry.version_id.slice(0, 8)}-${worker}.`;
  if (
    preview.protocol !== "https:" ||
    preview.username ||
    preview.password ||
    preview.pathname !== "/" ||
    !preview.hostname.startsWith(expectedPrefix) ||
    !preview.hostname.endsWith(".workers.dev")
  ) {
    throw new Error("Wrangler returned an invalid production version preview URL");
  }
  return { version_id: entry.version_id, preview_url: preview.origin };
}

export function previewRoutingState(response) {
  if (response?.success !== true) {
    throw new Error("Cloudflare preview routing response was unsuccessful");
  }
  const { enabled, previews_enabled: previewsEnabled } = response?.result ?? {};
  if (typeof enabled !== "boolean" || typeof previewsEnabled !== "boolean") {
    throw new Error("Cloudflare preview routing response is malformed");
  }
  return enabled === false && previewsEnabled === true ? "ready" : "drift";
}

export function assertVersionId(value) {
  if (!VERSION_ID_PATTERN.test(value ?? "")) throw new Error("version must be a Cloudflare UUID");
  return value;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function argument(name, { required = true } = {}) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (required && !value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const command = process.argv[2];
  if (command === "fingerprint") {
    const fingerprint = await computeDistFingerprint(argument("--directory"));
    const output = `${JSON.stringify(fingerprint, null, 2)}\n`;
    const outputPath = argument("--output", { required: false });
    if (outputPath) await writeFile(outputPath, output);
    else process.stdout.write(output);
    return;
  }

  if (command === "active-version") {
    const active = activeVersionId(await readJson(argument("--input")));
    if (active) process.stdout.write(active);
    return;
  }

  if (command === "normalize-deployments") {
    const inputPath = argument("--input", { required: false });
    const normalized = normalizeDeploymentSnapshot({
      httpStatus: argument("--status"),
      operation: argument("--operation"),
      phase: argument("--phase"),
      deployments: inputPath ? await readJson(inputPath) : undefined,
    });
    const output = `${JSON.stringify(normalized, null, 2)}\n`;
    const outputPath = argument("--output", { required: false });
    if (outputPath) await writeFile(outputPath, output);
    else process.stdout.write(output);
    return;
  }

  if (command === "compare-active") {
    const before = activeVersionId(await readJson(argument("--before")));
    const after = activeVersionId(await readJson(argument("--after")));
    if (before !== after) throw new Error("version upload unexpectedly changed the active deployment");
    console.log(`Active production deployment remained ${after ?? "absent"}.`);
    return;
  }

  if (command === "verify-version") {
    assertVersionMetadata(await readJson(argument("--input")), {
      versionId: argument("--version"),
      commit: argument("--commit"),
      digest: argument("--digest"),
    });
    console.log("Cloudflare version metadata matches the selected commit and dist digest.");
    return;
  }

  if (command === "verify-deployment") {
    assertActiveVersion(await readJson(argument("--input")), argument("--version"));
    console.log("Selected Cloudflare version is the sole active production deployment at 100%.");
    return;
  }

  if (command === "parse-upload") {
    const parsed = parseVersionUploadOutput(await readFile(argument("--input"), "utf8"));
    const githubOutput = argument("--github-output", { required: false });
    if (githubOutput) {
      await appendFile(
        githubOutput,
        `version_id=${parsed.version_id}\npreview_url=${parsed.preview_url}\n`,
      );
    } else {
      process.stdout.write(`${JSON.stringify(parsed)}\n`);
    }
    return;
  }

  if (command === "preview-routing-state") {
    process.stdout.write(previewRoutingState(await readJson(argument("--input"))));
    return;
  }

  if (command === "validate-version-id") {
    assertVersionId(argument("--version"));
    return;
  }

  throw new Error("command must be fingerprint, normalize-deployments, active-version, compare-active, verify-version, verify-deployment, parse-upload, preview-routing-state, or validate-version-id");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
