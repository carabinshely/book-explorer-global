import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const validator = resolve('scripts/validate-public-config.mjs');

function runValidator(cwd) {
  return spawnSync(process.execPath, [validator], { cwd, encoding: 'utf8' });
}

function withPublicIdentity(t, identity) {
  const cwd = mkdtempSync(join(tmpdir(), 'bronerbooks-public-config-'));
  const configPath = join(cwd, 'src/config/public-identity.json');
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(identity, null, 2)}\n`);
  t.after(() => rmSync(cwd, { force: true, recursive: true }));
  return cwd;
}

const approvedIdentity = {
  controller: 'Michael Broner, operating as Broner Books',
  brand: 'Broner Books',
  contactEmail: 'hello@bronerbooks.com',
  publicPostalAddress: 'P.O. Box 4244, Haifa, Israel',
  privacyNoticeApproved: true,
  privacyNoticeApprovalDate: '2026-08-19',
  privacyNoticeEffectiveDate: '2026-08-19',
  authority: 'carabinshely/bronerbooks-marketing-ops#28',
};

test('privacy validator accepts the approved versioned public identity', (t) => {
  const result = runValidator(withPublicIdentity(t, approvedIdentity));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /P\.O\. Box 4244, Haifa, Israel/);
  assert.match(result.stdout, /approved 2026-08-19/);
});

test('privacy validator rejects an unresolved public mailbox', (t) => {
  const result = runValidator(withPublicIdentity(t, {
    ...approvedIdentity,
    publicPostalAddress: '{{PUBLIC_MAILBOX_ADDRESS}}',
  }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /approved public PO box or commercial mailbox/);
});

test('privacy validator rejects publication before approval', (t) => {
  const result = runValidator(withPublicIdentity(t, {
    ...approvedIdentity,
    privacyNoticeApproved: false,
  }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /privacyNoticeApproved must be true/);
});

test('privacy validator rejects a missing approval date', (t) => {
  const result = runValidator(withPublicIdentity(t, {
    ...approvedIdentity,
    privacyNoticeApprovalDate: '',
  }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /privacyNoticeApprovalDate/);
});
