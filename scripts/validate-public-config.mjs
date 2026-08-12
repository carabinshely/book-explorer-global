import { loadEnv } from 'vite';

const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
const publicMailboxAddress = env.VITE_PUBLIC_MAILBOX_ADDRESS?.trim();
const privacyNoticeApproved = env.PRIVACY_NOTICE_APPROVED?.trim().toLowerCase();

if (!publicMailboxAddress || publicMailboxAddress.includes('{{') || publicMailboxAddress.includes('}}')) {
  console.error(
    'Production build blocked: set VITE_PUBLIC_MAILBOX_ADDRESS to the approved public PO box or commercial mailbox.'
  );
  process.exit(1);
}

if (privacyNoticeApproved !== 'true') {
  console.error(
    'Production build blocked: set PRIVACY_NOTICE_APPROVED=true only after owner/legal review is recorded.'
  );
  process.exit(1);
}

console.log('Privacy publication configuration is complete.');
