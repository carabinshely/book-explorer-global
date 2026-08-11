import { describe, expect, it } from "vitest";
import fixture from "./manifest.fixture.json";
import { resolvePath, validateManifest } from "./resolver";

describe("link manifest resolver", () => {
  const manifest = validateManifest(fixture, true);

  it("resolves shipped, disabled fallback, disabled gone, deprecated, and unknown paths exhaustively", () => {
    expect(resolvePath(manifest, "/r/niran-storytime-kit-v1-en-p5-book")).toMatchObject({ kind: "redirect", location: expect.stringContaining("utm_campaign=niran_storytime_kit") });
    expect(resolvePath(manifest, "/r/niran-disabled-with-fallback")).toEqual({ kind: "redirect", location: "https://bronerbooks.com/books/the-lost-umbrella-of-niran-en" });
    expect(resolvePath(manifest, "/r/niran-disabled-without-fallback")).toEqual({ kind: "gone", recovery: "niran" });
    expect(resolvePath(manifest, "/r/niran-deprecated")).toEqual({ kind: "gone", recovery: "niran" });
    expect(resolvePath(manifest, "/r/missing")).toEqual({ kind: "not-found", recovery: "generic" });
  });

  it("allows active and approved-preview only through the preview resolver", () => {
    const path = "/r/niran-storytime-kit-v1-en-p5-book";
    const preview = validateManifest({ ...fixture, links: [{ ...fixture.links[0], lifecycle: "approved-preview" }] });
    expect(resolvePath(preview, path, true)).toMatchObject({ kind: "redirect" });
    expect(resolvePath(preview, path)).toEqual({ kind: "gone", recovery: "niran" });
    const active = validateManifest({ ...fixture, links: [{ ...fixture.links[0], lifecycle: "active" }] });
    expect(resolvePath(active, path)).toMatchObject({ kind: "redirect" });
    expect(() => validateManifest(preview, true)).toThrow("lifecycle");
    expect(() => validateManifest(active, true)).toThrow("lifecycle");
  });

  it("fails closed for malformed schema, duplicate routes, unsafe locations, and production-only violations", () => {
    expect(() => validateManifest({})).toThrow("schema_version");
    expect(() => validateManifest({ ...fixture, links: [fixture.links[0], fixture.links[0]] })).toThrow("identity");
    expect(() => validateManifest({ ...fixture, links: [{ ...fixture.links[0], url: "https://example.test/" }] })).toThrow("url");
    expect(() => validateManifest({ ...fixture, registry_checksum: "bad" })).toThrow("registry_checksum");
  });
});
