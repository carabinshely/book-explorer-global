import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const validator = resolve('scripts/validate-public-config.mjs');

function runValidator(cwd, overrides = {}) {
  const env = { ...process.env };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  return spawnSync(process.execPath, [validator], { cwd, env, encoding: 'utf8' });
}

function withProductionEnv(t, contents) {
  const cwd = mkdtempSync(join(tmpdir(), 'bronerbooks-public-config-'));
  writeFileSync(join(cwd, '.env.production'), contents);
  t.after(() => rmSync(cwd, { force: true, recursive: true }));
  return cwd;
}

test('privacy validator loads approved values from .env.production', (t) => {
  const cwd = withProductionEnv(t, [
    'VITE_PUBLIC_MAILBOX_ADDRESS=PO Box 123',
    'PRIVACY_NOTICE_APPROVED=true',
  ].join('\n'));

  const result = runValidator(cwd, {
    VITE_PUBLIC_MAILBOX_ADDRESS: undefined,
    PRIVACY_NOTICE_APPROVED: undefined,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Privacy publication configuration is complete/);
});

test('privacy validator gives explicit process environment precedence', (t) => {
  const cwd = withProductionEnv(t, [
    'VITE_PUBLIC_MAILBOX_ADDRESS={{PUBLIC_MAILBOX_ADDRESS}}',
    'PRIVACY_NOTICE_APPROVED=false',
  ].join('\n'));

  const result = runValidator(cwd, {
    VITE_PUBLIC_MAILBOX_ADDRESS: 'PO Box 456',
    PRIVACY_NOTICE_APPROVED: 'true',
  });
  assert.equal(result.status, 0, result.stderr);
});
