/** A small, untrusted-input-free adapter around the marketing compiler envelope. */
export const MANIFEST_SCHEMA = "attribution_links/v1";
export const PRODUCTION_LIFECYCLES = ["shipped", "deprecated", "disabled"] as const;

export type RuntimeLifecycle =
  | "shipped"
  | "active"
  | "approved-preview"
  | "approved"
  | "deprecated"
  | "disabled";

export type ManifestLink = Readonly<{
  id: string;
  public_path: string | null;
  revision: number;
  lifecycle: RuntimeLifecycle;
  url?: string;
  fallback_url?: string;
}>;

export type LinkManifest = Readonly<{
  schema_version: string;
  registry_id: string;
  registry_checksum: string;
  provenance: Readonly<Record<string, unknown>>;
  links: readonly ManifestLink[];
}>;

export type Resolution =
  | Readonly<{ kind: "redirect"; location: string }>
  | Readonly<{ kind: "gone"; recovery: "niran" }>
  | Readonly<{ kind: "not-found"; recovery: "generic" }>;

const SAFE_PATH = /^\/r\/[a-z0-9-]+$/;
const SAFE_ID = /^[a-z][a-z0-9_]{2,79}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const HTTPS_URL = /^https:\/\/bronerbooks\.com(?:\/|$)/;
const LIFECYCLES = new Set<RuntimeLifecycle>([
  "shipped", "active", "approved-preview", "approved", "deprecated", "disabled",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`invalid manifest: ${field}`);
  return value;
}

function readDestination(value: unknown, field: string): string {
  const destination = readString(value, field);
  if (!HTTPS_URL.test(destination)) throw new Error(`invalid manifest: ${field}`);
  const parsed = new URL(destination);
  if (parsed.hostname !== "bronerbooks.com" || parsed.username || parsed.password || parsed.hash) {
    throw new Error(`invalid manifest: ${field}`);
  }
  return destination;
}

/** Validates data before it is allowed to influence the HTTP adapter. */
export function validateManifest(value: unknown, production = false): LinkManifest {
  if (!isRecord(value)) throw new Error("invalid manifest: expected object");
  if (value.schema_version !== MANIFEST_SCHEMA) throw new Error("invalid manifest: schema_version");
  const registry_id = readString(value.registry_id, "registry_id");
  const registry_checksum = readString(value.registry_checksum, "registry_checksum");
  if (!SHA256.test(registry_checksum)) throw new Error("invalid manifest: registry_checksum");
  if (!isRecord(value.provenance)) throw new Error("invalid manifest: provenance");
  if (!Array.isArray(value.links)) throw new Error("invalid manifest: links");

  const paths = new Set<string>();
  const ids = new Set<string>();
  const links = value.links.map((candidate, index): ManifestLink => {
    if (!isRecord(candidate)) throw new Error(`invalid manifest: links[${index}]`);
    const id = readString(candidate.id, `links[${index}].id`);
    const public_path = candidate.public_path === null ? null : readString(candidate.public_path, `links[${index}].public_path`);
    const lifecycle = readString(candidate.lifecycle, `links[${index}].lifecycle`) as RuntimeLifecycle;
    if (!SAFE_ID.test(id) || ids.has(id) || public_path === null || !SAFE_PATH.test(public_path) || paths.has(public_path)) {
      throw new Error(`invalid manifest: links[${index}] identity`);
    }
    if (!LIFECYCLES.has(lifecycle) || (production && !PRODUCTION_LIFECYCLES.includes(lifecycle as (typeof PRODUCTION_LIFECYCLES)[number]))) {
      throw new Error(`invalid manifest: links[${index}].lifecycle`);
    }
    if (!Number.isInteger(candidate.revision) || (candidate.revision as number) < 1) throw new Error(`invalid manifest: links[${index}].revision`);
    const url = candidate.url === undefined ? undefined : readDestination(candidate.url, `links[${index}].url`);
    const fallback_url = candidate.fallback_url === undefined ? undefined : readDestination(candidate.fallback_url, `links[${index}].fallback_url`);
    if (["shipped", "active", "approved-preview", "approved"].includes(lifecycle) && !url) throw new Error(`invalid manifest: links[${index}].url`);
    ids.add(id); paths.add(public_path);
    return { id, public_path, revision: candidate.revision as number, lifecycle, ...(url ? { url } : {}), ...(fallback_url ? { fallback_url } : {}) };
  });
  return { schema_version: MANIFEST_SCHEMA, registry_id, registry_checksum, provenance: value.provenance, links };
}

/** Resolves a pathname only. Queries/fragments are intentionally absent from this API. */
export function resolvePath(manifest: LinkManifest, pathname: string, preview = false): Resolution {
  const link = manifest.links.find((entry) => entry.public_path === pathname);
  if (!link) return { kind: "not-found", recovery: "generic" };
  const redirect = (): Resolution => link.url ? { kind: "redirect", location: link.url } : { kind: "not-found", recovery: "generic" };
  switch (link.lifecycle) {
    case "shipped":
    case "active":
      return redirect();
    case "approved-preview":
    case "approved":
      return preview ? redirect() : { kind: "gone", recovery: "niran" };
    case "disabled":
      return link.fallback_url ? { kind: "redirect", location: link.fallback_url } : { kind: "gone", recovery: "niran" };
    case "deprecated":
      return { kind: "gone", recovery: "niran" };
  }
}
