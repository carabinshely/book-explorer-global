import { describe, expect, it } from "vitest";
import worker, { handle } from "./index";
import fixture from "./manifest.fixture.json";
import { validateManifest } from "./resolver";

const base = "https://r.bronerbooks.com";
const securityHeaders = ["cache-control", "content-security-policy", "permissions-policy", "referrer-policy", "x-content-type-options", "x-frame-options"];

describe("Worker HTTP adapter", () => {
  it("returns the exact clean 302 for GET and HEAD without reflecting hostile query input", async () => {
    for (const method of ["GET", "HEAD"]) {
      const response = handle(new Request(`${base}/r/niran-storytime-kit-v1-en-p5-book?next=https://evil.test/&x=<script>`, { method }), validateManifest(fixture, true));
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(fixture.links[0].url);
      expect(response.headers.get("location")).not.toContain("evil");
      expect(await response.text()).toBe("");
      for (const header of securityHeaders) expect(response.headers.get(header)).toBeTruthy();
    }
  });

  it("returns a safe fallback 302 for a known disabled link", () => {
    const response = handle(new Request(`${base}/r/niran-disabled-with-fallback?utm_source=attacker`), validateManifest(fixture, true));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://bronerbooks.com/books/the-lost-umbrella-of-niran-en");
  });

  it("returns branded Niran 410 for disabled without fallback and generic branded 404 for unknown", async () => {
    const gone = handle(new Request(`${base}/r/niran-disabled-without-fallback`), validateManifest(fixture, true));
    const missing = handle(new Request(`${base}/r/no-such-link?name=<img>`), validateManifest(fixture, true));
    expect(gone.status).toBe(410);
    expect(await gone.text()).toContain("Niran link is no longer available");
    expect(missing.status).toBe(404);
    const html = await missing.text();
    expect(html).toContain("We couldn't find that link");
    expect(html).not.toContain("<img>");
  });

  it("returns empty HEAD recovery bodies and 405 only with the fixed allow header", async () => {
    const head = handle(new Request(`${base}/r/no-such-link`, { method: "HEAD" }), validateManifest(fixture, true));
    expect(head.status).toBe(404);
    expect(await head.text()).toBe("");
    const post = handle(new Request(`${base}/r/niran-storytime-kit-v1-en-p5-book`, { method: "POST" }), validateManifest(fixture, true));
    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET, HEAD");
  });

  it("has dependency-free, accessible recovery HTML with no scripts, assets, or network URLs", async () => {
    const response = handle(new Request(`${base}/r/no-such-link`), validateManifest(fixture, true));
    const html = await response.text();
    expect(html).toMatch(/<main[ >]/);
    expect(html).toMatch(/<h1>/);
    expect(html).toContain('meta name="viewport"');
    expect(html).toContain("@media(max-width:480px)");
    expect(html).not.toMatch(/<script|<img|<link|https?:\/\//i);
  });

  it("fails closed when the runtime manifest is malformed and keeps non-GET methods at 405", async () => {
    const malformed = await worker.fetch(new Request(`${base}/r/niran-storytime-kit-v1-en-p5-book`), { LINK_MANIFEST: { nope: true } });
    expect(malformed.status).toBe(404);
    const method = await worker.fetch(new Request(`${base}/r/anything`, { method: "DELETE" }), { LINK_MANIFEST: { nope: true } });
    expect(method.status).toBe(405);
  });
});
