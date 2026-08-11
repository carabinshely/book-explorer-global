#!/usr/bin/env bash
set -euo pipefail
out="${TMPDIR:-/tmp}/broner-worker.mjs"
npx --yes --package esbuild@0.25.9 esbuild worker/index.ts --bundle --platform=browser --format=esm --outfile="$out" >/dev/null
bytes=$(wc -c < "$out")
test "$bytes" -le 25000
echo "OK: Worker bundle is ${bytes} bytes (limit 25000)"
