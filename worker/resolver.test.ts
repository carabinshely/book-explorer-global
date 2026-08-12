import { describe, expect, it } from "vitest";
import fixture from "./manifest.fixture.json";
import { canonicalJson, resolvePath, validateManifest, verifyEnvelopeChecksum } from "./resolver";
import { EMBEDDED_MANIFEST_SHA256 } from "./manifest.integrity";

const path = "/r/niran-storytime-kit-v1-en-p5-book";
const first = fixture.links[0];
const withLifecycle = (lifecycle: string, extra: Record<string, unknown> = {}) => ({ ...fixture, links: [{ ...first, lifecycle, public_path: path, route_eligible: true, ...extra }] });

describe("link manifest resolver", () => {
  it("accepts the exact compiler fixture in production when its route is eligible and verifies its payload digest", async () => {
    expect(validateManifest(fixture).links).toHaveLength(2);
    expect(validateManifest(fixture).links[0].route_eligible).toBe(true);
    await expect(verifyEnvelopeChecksum(fixture, EMBEDDED_MANIFEST_SHA256)).resolves.toMatchObject({ registry_checksum: fixture.registry_checksum });
    expect(canonicalJson(fixture)).toBe(`${JSON.stringify(fixture)}\n`);
  });

  it("dispatches every lifecycle and mode", () => {
    const shipped = validateManifest(withLifecycle("shipped"));
    expect(resolvePath(shipped, path)).toMatchObject({ kind: "redirect" });
    const active = validateManifest(withLifecycle("active"));
    expect(resolvePath(active, path)).toMatchObject({ kind: "redirect" });
    const preview = validateManifest(withLifecycle("approved-preview"));
    expect(resolvePath(preview, path)).toEqual({ kind: "gone", recovery: "niran" });
    expect(resolvePath(preview, path, true)).toMatchObject({ kind: "redirect" });
    const approved = validateManifest(withLifecycle("approved"));
    expect(resolvePath(approved, path)).toMatchObject({ kind: "redirect" });
    expect(resolvePath(approved, path, true)).toMatchObject({ kind: "redirect" });
    const routeIneligible = validateManifest(withLifecycle("approved", { route_eligible: false }));
    expect(resolvePath(routeIneligible, path)).toEqual({ kind: "gone", recovery: "niran" });
    const deprecated = validateManifest(withLifecycle("deprecated"));
    expect(resolvePath(deprecated, path)).toEqual({ kind: "gone", recovery: "niran" });
    const fallback = validateManifest(withLifecycle("disabled", { fallback_url: "https://bronerbooks.com/books/the-lost-umbrella-of-niran-en" }));
    expect(resolvePath(fallback, path)).toMatchObject({ kind: "redirect" });
    const disabled = validateManifest(withLifecycle("disabled"));
    expect(resolvePath(disabled, path)).toEqual({ kind: "gone", recovery: "niran" });
    expect(resolvePath(disabled, "/r/missing")).toEqual({ kind: "not-found", recovery: "generic" });
  });

  it("rejects malformed compiled provenance before runtime resolution", () => {
    const malformed = { ...fixture, provenance: { ...fixture.provenance, marketing_source_commit: "not-a-commit" } };
    expect(() => validateManifest(malformed)).toThrow("provenance");
  });

  it("fails closed for valid-hex checksum tampering, provenance changes, duplicate routes, and unsafe locations", async () => {
    const hexTampered = { ...fixture, registry_checksum: "b".repeat(64) };
    await expect(verifyEnvelopeChecksum(hexTampered, EMBEDDED_MANIFEST_SHA256)).rejects.toThrow("envelope checksum");
    expect(() => validateManifest({ ...fixture, provenance: { ...fixture.provenance, book_id: "book_other" } })).toThrow("provenance");
    expect(() => validateManifest({ ...fixture, links: [first, first] })).toThrow("identity");
    expect(() => validateManifest(withLifecycle("approved", { url: "https://example.test/" }))).toThrow("url");
  });
});
