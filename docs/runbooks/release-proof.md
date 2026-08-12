# Link release-proof operator checklist

This checklist creates **local proof only**. It does not deploy, contact a
remote service, generate a QR code, write media, scan a physical item, or
reconcile an Issue. The authoritative attribution registry remains in
`bronerbooks-marketing-ops`; this site fixture must be byte-for-byte identical
to the compiler output pinned by its `marketing_source_commit`.

## Safe local gate

```sh
npm run links:proof:check
npm run links:proof:test
npm run links:preview:parity -- --check
npm run links:destination-health -- --check
npm run links:canonical-smoke -- --check
```

`links:proof:check` compiles the fixture's pinned marketing Git source into a
temporary system directory and compares it exactly with
`worker/manifest.fixture.json`. It also confirms that the present `approved`,
`route_eligible` record can serve the owned stable link. Route eligibility is
an approval boundary, separate from physical shipment; it does not write the
registry or a website artifact.

The preview parity command is intentionally a plan in local check mode. Its
actual Wrangler/Miniflare process is operator-gated and compares preview and
production-local responses for exact `GET`/`HEAD` behavior, statuses, security
headers, `Cache-Control`, query dropping, and `Location`. It uses a locally
installed, pinned CLI; the tool never downloads one.

## Release evidence and deferred physical work

The protected promotion workflow persists a sanitized route-release artifact
containing the commit, previous and new Worker version IDs, manifest digest, and
canonical route. Its production smoke validates status, security/cache headers,
and the exact redirect destination, but those response values are not persisted
in that artifact. This stable-link activation task explicitly excludes physical
PDF/QR hashes, freeze records, device scans, and shipment proof. Those artifacts
remain deferred to the separate physical-release process; do not infer shipment
from an approved, route-eligible record.

## Stop: protected external steps

Do **not** continue from this repository without the appropriate authorization:

1. Protected preview deployment and remote destination health check.
2. Protected production deployment and canonical browser smoke.
3. Separate physical-release evidence and shipment reconciliation, when that
   work is authorized.
4. GitHub Issue/Project reconciliation with route-release evidence, decisions,
   blockers, and next action.

These steps are deliberately external to this local tool. Do not mark the
physical release proven or shipped until its separate source-of-truth flow is
complete.
