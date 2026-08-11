#!/usr/bin/env bash
set -euo pipefail
npx --yes --package typescript@5.8.3 tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --resolveJsonModule --lib ES2022,WebWorker worker/index.ts worker/resolver.ts worker/manifest.integrity.ts
