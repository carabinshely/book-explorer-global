import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const configPath = resolve(process.cwd(), 'src/config/public-identity.json');
let publicIdentity;

try {
  publicIdentity = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error(`Production build blocked: cannot read approved public identity at ${configPath}.`);
  process.exit(1);
}

const publicPostalAddress = publicIdentity.publicPostalAddress?.trim();
const approvalDate = publicIdentity.privacyNoticeApprovalDate?.trim();
const effectiveDate = publicIdentity.privacyNoticeEffectiveDate?.trim();

if (!publicPostalAddress || publicPostalAddress.includes('{{') || publicPostalAddress.includes('}}')) {
  console.error('Production build blocked: publicPostalAddress must contain the approved public PO box or commercial mailbox.');
  process.exit(1);
}

if (publicIdentity.privacyNoticeApproved !== true) {
  console.error('Production build blocked: privacyNoticeApproved must be true only after owner/legal review is recorded.');
  process.exit(1);
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(approvalDate || '')) {
  console.error('Production build blocked: privacyNoticeApprovalDate must be a recorded YYYY-MM-DD approval date.');
  process.exit(1);
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate || '')) {
  console.error('Production build blocked: privacyNoticeEffectiveDate must be a recorded YYYY-MM-DD effective date.');
  process.exit(1);
}

console.log(`Privacy publication configuration is complete: ${publicPostalAddress}; approved ${approvalDate}.`);
