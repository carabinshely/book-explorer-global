/** A small, untrusted-input-free adapter around the marketing compiler envelope. */
export const MANIFEST_SCHEMA = "attribution_links/v1";
export const PRODUCTION_LIFECYCLES = ["shipped", "deprecated", "disabled"] as const;

export type RuntimeLifecycle = "shipped" | "active" | "approved-preview" | "approved" | "deprecated" | "disabled";
export type ManifestLink = Readonly<{ id: string; public_path: string | null; revision: number; lifecycle: RuntimeLifecycle; url?: string; fallback_url?: string }>;
export type LinkManifest = Readonly<{ schema_version: string; registry_id: string; registry_checksum: string; provenance: Readonly<Record<string, unknown>>; links: readonly ManifestLink[] }>;
export type Resolution = Readonly<{ kind: "redirect"; location: string }> | Readonly<{ kind: "gone"; recovery: "niran" }> | Readonly<{ kind: "not-found"; recovery: "generic" }>;

const SAFE_PATH = /^\/r\/[a-z0-9-]+$/;
const SAFE_ID = /^[a-z][a-z0-9_]{2,79}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const HTTPS_URL = /^https:\/\/bronerbooks\.com(?:\/|$)/;
const LIFECYCLES = new Set<RuntimeLifecycle>(["shipped", "active", "approved-preview", "approved", "deprecated", "disabled"]);
const EXPECTED_PROVENANCE = {
  book_id: "book_niran_umbrella",
  campaign_id: "camp_2026q2_niran_validation",
  sku_id: "the-lost-umbrella-of-niran-en",
  source_files: ["02_catalog/books.yaml", "02_catalog/editions.yaml", "04_campaigns/2026-q2-niran-validation/campaign.yaml", "07_automation/utm-rules.yaml"],
  work_id: "the-lost-umbrella-of-niran",
};

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function readString(value: unknown, field: string): string { if (typeof value !== "string" || value.length === 0) throw new Error(`invalid manifest: ${field}`); return value; }
function requireKeys(value: Record<string, unknown>, expected: readonly string[], field: string): void {
  if (Object.keys(value).length !== expected.length || expected.some((key) => !(key in value))) throw new Error(`invalid manifest: ${field}`);
}
function readDestination(value: unknown, field: string): string {
  const destination = readString(value, field);
  if (!HTTPS_URL.test(destination)) throw new Error(`invalid manifest: ${field}`);
  const parsed = new URL(destination);
  if (parsed.hostname !== "bronerbooks.com" || parsed.username || parsed.password || parsed.hash) throw new Error(`invalid manifest: ${field}`);
  return destination;
}
function provenanceIsExpected(value: Record<string, unknown>): boolean { return JSON.stringify(value) === JSON.stringify(EXPECTED_PROVENANCE); }

/** Validates the exact compiler envelope before it can influence HTTP behavior. */
export function validateManifest(value: unknown, production = false): LinkManifest {
  if (!isRecord(value)) throw new Error("invalid manifest: expected object");
  requireKeys(value, ["schema_version", "registry_id", "registry_checksum", "provenance", "links"], "envelope keys");
  if (value.schema_version !== MANIFEST_SCHEMA || value.registry_id !== "niran_storytime_kit") throw new Error("invalid manifest: schema");
  const registry_checksum = readString(value.registry_checksum, "registry_checksum");
  if (!SHA256.test(registry_checksum)) throw new Error("invalid manifest: registry_checksum");
  if (!isRecord(value.provenance) || !provenanceIsExpected(value.provenance)) throw new Error("invalid manifest: provenance");
  if (!Array.isArray(value.links)) throw new Error("invalid manifest: links");
  const paths = new Set<string>(); const ids = new Set<string>();
  const links = value.links.map((candidate, index): ManifestLink => {
    if (!isRecord(candidate)) throw new Error(`invalid manifest: links[${index}]`);
    const allowedKeys = ["id", "public_path", "revision", "lifecycle", "url", "fallback_url"];
    if (Object.keys(candidate).some((key) => !allowedKeys.includes(key))) throw new Error(`invalid manifest: links[${index}] keys`);
    const id = readString(candidate.id, `links[${index}].id`);
    const public_path = candidate.public_path === null ? null : readString(candidate.public_path, `links[${index}].public_path`);
    const lifecycle = readString(candidate.lifecycle, `links[${index}].lifecycle`) as RuntimeLifecycle;
    if (!SAFE_ID.test(id) || ids.has(id) || (public_path !== null && (!SAFE_PATH.test(public_path) || paths.has(public_path)))) throw new Error(`invalid manifest: links[${index}] identity`);
    if (!LIFECYCLES.has(lifecycle) || (production && !PRODUCTION_LIFECYCLES.includes(lifecycle as (typeof PRODUCTION_LIFECYCLES)[number]))) throw new Error(`invalid manifest: links[${index}].lifecycle`);
    if (!Number.isInteger(candidate.revision) || (candidate.revision as number) < 1) throw new Error(`invalid manifest: links[${index}].revision`);
    const url = readDestination(candidate.url, `links[${index}].url`);
    const fallback_url = candidate.fallback_url === undefined ? undefined : readDestination(candidate.fallback_url, `links[${index}].fallback_url`);
    ids.add(id); if (public_path) paths.add(public_path);
    return { id, public_path, revision: candidate.revision as number, lifecycle, url, ...(fallback_url ? { fallback_url } : {}) };
  });
  return { schema_version: MANIFEST_SCHEMA, registry_id: "niran_storytime_kit", registry_checksum, provenance: EXPECTED_PROVENANCE, links };
}

/** Canonicalizes JSON exactly as the marketing compiler does (sorted, compact, newline-terminated). */
export function canonicalJson(value: unknown): string {
  const sort = (input: unknown): unknown => Array.isArray(input) ? input.map(sort) : isRecord(input) ? Object.fromEntries(Object.keys(input).sort().map((key) => [key, sort(input[key])])) : input;
  return `${JSON.stringify(sort(value))}\n`;
}

export async function verifyEnvelopeChecksum(value: unknown, expectedSha256: string, production = false): Promise<LinkManifest> {
  const manifest = validateManifest(value, production);
  const bytes = new TextEncoder().encode(canonicalJson(manifest));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const actual = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (actual !== expectedSha256) throw new Error("invalid manifest: envelope checksum");
  return manifest;
}

/** Resolves a pathname only. Queries/fragments are intentionally absent from this API. */
export function resolvePath(manifest: LinkManifest, pathname: string, preview = false): Resolution {
  const link = manifest.links.find((entry) => entry.public_path === pathname);
  if (!link) return { kind: "not-found", recovery: "generic" };
  const redirect = (): Resolution => link.url ? { kind: "redirect", location: link.url } : { kind: "not-found", recovery: "generic" };
  switch (link.lifecycle) {
    case "shipped": case "active": return redirect();
    case "approved-preview": case "approved": return preview ? redirect() : { kind: "gone", recovery: "niran" };
    case "disabled": return "fallback_url" in link && link.fallback_url ? { kind: "redirect", location: link.fallback_url } : { kind: "gone", recovery: "niran" };
    case "deprecated": return { kind: "gone", recovery: "niran" };
  }
}
