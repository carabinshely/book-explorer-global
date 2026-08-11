import { describe, expect, it } from "vitest";
import worker, { handle } from "./index";
import fixture from "./manifest.fixture.json";
import { validateManifest } from "./resolver";

const base = "https://r.bronerbooks.com";
const path = "/r/niran-storytime-kit-v1-en-p5-book";
const securityHeaders = ["cache-control", "content-security-policy", "permissions-policy", "referrer-policy", "x-content-type-options", "x-frame-options"];
const manifest = (lifecycle: string, extra: Record<string, unknown> = {}) => validateManifest({ ...fixture, links: [{ ...fixture.links[0], lifecycle, public_path: path, ...extra }] });
const assertHeaders = (response: Response) => { for (const header of securityHeaders) expect(response.headers.get(header)).toBeTruthy(); };

describe("Worker HTTP adapter", () => {
  it("returns exact clean GET/HEAD 302 and drops hostile query input", async () => {
    for (const method of ["GET", "HEAD"]) {
      const response = handle(new Request(`${base}${path}?next=https://evil.test/&x=<script>`, { method }), manifest("shipped"));
      expect(response.status).toBe(302); expect(response.headers.get("location")).toBe(fixture.links[0].url); expect(response.headers.get("location")).not.toContain("evil"); expect(await response.text()).toBe(""); assertHeaders(response);
    }
  });

  it("uses a safe disabled fallback 302 and branded 410/404 recovery headers", async () => {
    const fallback = handle(new Request(`${base}${path}`), manifest("disabled", { fallback_url: "https://bronerbooks.com/books/the-lost-umbrella-of-niran-en" }));
    expect(fallback.status).toBe(302); expect(fallback.headers.get("location")).toBe("https://bronerbooks.com/books/the-lost-umbrella-of-niran-en"); assertHeaders(fallback);
    const gone = handle(new Request(`${base}${path}`), manifest("disabled"));
    expect(gone.status).toBe(410); expect(gone.headers.get("content-type")).toBe("text/html; charset=utf-8"); assertHeaders(gone); expect(await gone.text()).toContain("Niran link is no longer available");
    const missing = handle(new Request(`${base}/r/no-such-link?name=<img>`), manifest("shipped"));
    expect(missing.status).toBe(404); expect(missing.headers.get("content-type")).toBe("text/html; charset=utf-8"); assertHeaders(missing); expect(await missing.text()).not.toContain("<img>");
  });

  it("returns empty HEAD recovery bodies and fully headed 405 responses", async () => {
    const head = handle(new Request(`${base}/r/no-such-link`, { method: "HEAD" }), manifest("shipped"));
    expect(head.status).toBe(404); expect(await head.text()).toBe(""); assertHeaders(head);
    const post = handle(new Request(`${base}${path}`, { method: "POST" }), manifest("shipped"));
    expect(post.status).toBe(405); expect(post.headers.get("allow")).toBe("GET, HEAD"); expect(await post.text()).toBe(""); assertHeaders(post);
  });

  it("serves semantically complete, keyboard-focusable, mobile, asset-free recovery HTML", async () => {
    const html = await handle(new Request(`${base}/r/no-such-link`), manifest("shipped")).text();
    expect(html).toMatch(/<main[ >]/); expect(html).toMatch(/<h1>/); expect(html).toMatch(/<a href="\/"/); expect(html).toContain("a:focus"); expect(html).toContain('meta name="viewport"'); expect(html).toContain("@media(max-width:480px)");
    expect(html).not.toMatch(/<script|<img|<link|https?:\/\//i);
  });

  it("keeps compiler-approved links non-production-routable but allows preview recovery-free redirect", async () => {
    const production = await worker.fetch(new Request(`${base}${path}`), {});
    expect(production.status).toBe(404); assertHeaders(production);
    const preview = await worker.fetch(new Request(`${base}${path}`), { LINK_ENVIRONMENT: "preview" });
    expect(preview.status).toBe(302); expect(preview.headers.get("location")).toBe(fixture.links[0].url); assertHeaders(preview);
  });
});
