#!/usr/bin/env bash
set -euo pipefail
node worker/verify-fixture.mjs
npx --yes --package vitest@3.2.4 vitest run --config worker/vitest.config.mjs worker
