import manifestSource from "./manifest.fixture.json";
import { resolvePath, validateManifest, type LinkManifest, type Resolution } from "./resolver";

export interface WorkerEnvironment {
  /** Preview is the only place where an approved-preview compiler record may resolve. */
  LINK_ENVIRONMENT?: "preview" | "production";
  LINK_MANIFEST?: unknown;
}

const COMMON_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Security-Policy": "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; style-src 'unsafe-inline'",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function recoveryHtml(kind: "niran" | "generic"): string {
  const niran = kind === "niran";
  const title = niran ? "This Niran link is no longer available" : "We couldn't find that link";
  const message = niran
    ? "The storytime link has changed or is no longer active. You can safely return to The Lost Umbrella of Niran."
    : "This link is not available. You can safely continue to the Broner Books home page.";
  const href = niran ? "/books/the-lost-umbrella-of-niran-en" : "/";
  const label = niran ? "Open The Lost Umbrella of Niran" : "Visit Broner Books";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{margin:0;background:#fffaf3;color:#251c15;font-family:system-ui,sans-serif;line-height:1.5}.card{box-sizing:border-box;max-width:42rem;margin:12vh auto;padding:2rem}a{display:inline-block;background:#5c3c21;color:#fff;padding:.8rem 1rem;border-radius:.4rem;text-decoration:none;font-weight:700}a:focus{outline:3px solid #145da0;outline-offset:3px}@media(max-width:480px){.card{margin:2rem auto;padding:1.25rem}}</style></head><body><main class="card"><h1>${title}</h1><p>${message}</p><p><a href="${href}">${label}</a></p></main></body></html>`;
}

function responseFor(resolution: Resolution, method: string): Response {
  if (resolution.kind === "redirect") return new Response(null, { status: 302, headers: { ...COMMON_HEADERS, Location: resolution.location } });
  const status = resolution.kind === "gone" ? 410 : 404;
  const body = method === "HEAD" ? null : recoveryHtml(resolution.recovery);
  return new Response(body, { status, headers: { ...COMMON_HEADERS, "Content-Type": "text/html; charset=utf-8" } });
}

export function handle(request: Request, manifest: LinkManifest, preview = false): Response {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { ...COMMON_HEADERS, Allow: "GET, HEAD" } });
  }
  // URL.pathname drops hostile caller query data before resolving or generating a Location header.
  return responseFor(resolvePath(manifest, new URL(request.url).pathname, preview), request.method);
}

export default {
  fetch(request: Request, env: WorkerEnvironment): Response {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { ...COMMON_HEADERS, Allow: "GET, HEAD" } });
    }
    const preview = env.LINK_ENVIRONMENT === "preview";
    const source = env.LINK_MANIFEST ?? manifestSource;
    try {
      return handle(request, validateManifest(source, !preview), preview);
    } catch {
      // A malformed manifest must never redirect. It receives the generic recovery response.
      return responseFor({ kind: "not-found", recovery: "generic" }, request.method);
    }
  },
};
