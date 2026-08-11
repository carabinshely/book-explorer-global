import { describe, expect, it } from "vitest";
import fixture from "./manifest.fixture.json";
import { canonicalJson, resolvePath, validateManifest, verifyEnvelopeChecksum } from "./resolver";
import { EMBEDDED_MANIFEST_SHA256 } from "./manifest.integrity";

const path = "/r/niran-storytime-kit-v1-en-p5-book";
const first = fixture.links[0];
const withLifecycle = (lifecycle: string, extra: Record<string, unknown> = {}) => ({ ...fixture, links: [{ ...first, lifecycle, public_path: path, ...extra }] });

describe("link manifest resolver", () => {
  it("accepts the exact compiler fixture only outside production and verifies its payload digest", async () => {
    expect(validateManifest(fixture).links).toHaveLength(2);
    expect(() => validateManifest(fixture, true)).toThrow("lifecycle");
    await expect(verifyEnvelopeChecksum(fixture, EMBEDDED_MANIFEST_SHA256)).resolves.toMatchObject({ registry_checksum: "d09fb0f19d80b0900aaf9d7a26526cad1757e0cc468c983af9d77a0303d487ad" });
    expect(canonicalJson(fixture)).toBe(`${JSON.stringify(fixture)}\n`);
  });

  it("dispatches every lifecycle and mode", () => {
    const shipped = validateManifest(withLifecycle("shipped"), true);
    expect(resolvePath(shipped, path)).toMatchObject({ kind: "redirect" });
    const active = validateManifest(withLifecycle("active"));
    expect(resolvePath(active, path)).toMatchObject({ kind: "redirect" });
    const preview = validateManifest(withLifecycle("approved-preview"));
    expect(resolvePath(preview, path)).toEqual({ kind: "gone", recovery: "niran" });
    expect(resolvePath(preview, path, true)).toMatchObject({ kind: "redirect" });
    const approved = validateManifest(withLifecycle("approved"));
    expect(resolvePath(approved, path)).toEqual({ kind: "gone", recovery: "niran" });
    expect(resolvePath(approved, path, true)).toMatchObject({ kind: "redirect" });
    const deprecated = validateManifest(withLifecycle("deprecated"), true);
    expect(resolvePath(deprecated, path)).toEqual({ kind: "gone", recovery: "niran" });
    const fallback = validateManifest(withLifecycle("disabled", { fallback_url: "https://bronerbooks.com/books/the-lost-umbrella-of-niran-en" }), true);
    expect(resolvePath(fallback, path)).toMatchObject({ kind: "redirect" });
    const disabled = validateManifest(withLifecycle("disabled"), true);
    expect(resolvePath(disabled, path)).toEqual({ kind: "gone", recovery: "niran" });
    expect(resolvePath(disabled, "/r/missing")).toEqual({ kind: "not-found", recovery: "generic" });
  });

  it("fails closed for valid-hex checksum tampering, provenance changes, duplicate routes, and unsafe locations", async () => {
    const hexTampered = { ...fixture, registry_checksum: "b".repeat(64) };
    await expect(verifyEnvelopeChecksum(hexTampered, EMBEDDED_MANIFEST_SHA256)).rejects.toThrow("envelope checksum");
    expect(() => validateManifest({ ...fixture, provenance: { ...fixture.provenance, book_id: "book_other" } })).toThrow("provenance");
    expect(() => validateManifest({ ...fixture, links: [first, first] })).toThrow("identity");
    expect(() => validateManifest(withLifecycle("approved", { url: "https://example.test/" }))).toThrow("url");
  });
});
