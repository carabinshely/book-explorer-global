# Link release-proof operator checklist

This checklist creates **local proof only**. It does not deploy, contact a
remote service, generate a QR code, write media, scan a physical item, or
reconcile an Issue. The authoritative attribution registry remains in
`bronerbooks-marketing-ops`; this site fixture must be byte-for-byte identical
to that compiler output.

## Safe local gate

```sh
npm run links:proof:check
npm run links:proof:test
npm run links:preview:parity -- --check
npm run links:destination-health -- --check
npm run links:canonical-smoke -- --check
```

`links:proof:check` compiles the authoritative registry into a temporary
system directory and compares it exactly with `worker/manifest.fixture.json`.
It also confirms that the present `approved` record cannot production-route
before shipment. It does not write the registry or a website artifact.

The preview parity command is intentionally a plan in local check mode. Its
actual Wrangler/Miniflare process is operator-gated and must compare preview
and production-local responses for exact `GET`/`HEAD` behavior, statuses,
security headers, `Cache-Control`, query dropping, and `Location`. It must use
a locally installed, pinned CLI; the tool never downloads one.

## Evidence schema

After a **real physical-device browser scan**, save a JSON record outside this
repository and validate it:

```sh
npm run links:proof:evidence -- --input /secure/path/release-evidence.json
```

Required values are: `device`, `browser`, UTC `timestamp`, query-free owned
`decoded_url`, exact `final_destination`, `status`, response `headers`, and
`qr_sha256`. The schema requires `evidence_source` to be
`physical-device-browser-scan`; it rejects absent fields, placeholders,
synthetic source labels, wrong route/destination, incomplete headers, and a
zero/invalid SHA-256. Passing validation establishes schema completeness, not
that a scan occurred—retain the original protected evidence with the release
record.

## Stop: protected external steps

Do **not** continue from this repository without the appropriate authorization:

1. Protected preview deployment and remote destination health check.
2. Protected production deployment and canonical browser smoke.
3. Physical QR scan on the printed proof and retention of the original record.
4. GitHub Issue/Project reconciliation with the evidence, decision, blockers,
   and next action.

Those four steps are deliberately external to this local tool. Do not mark the
release proven or shipped until they are complete and the authoritative
lifecycle has been updated through its approved source-of-truth flow.
