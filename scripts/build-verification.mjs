import { spawnSync } from 'node:child_process';

const npmCli = process.env.npm_execpath;
const verificationEnvironment = {
  ...process.env,
  VITE_PUBLIC_MAILBOX_ADDRESS: 'TEST ONLY — NOT FOR PUBLICATION',
};

function run(command, args) {
  const result = spawnSync(command, args, {
    env: verificationEnvironment,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runNpm(args) {
  if (!npmCli) {
    throw new Error('npm_execpath is required; run this verification through npm run build:verify.');
  }
  run(process.execPath, [npmCli, ...args]);
}

console.log('Building a non-publishable verification artifact with test-only privacy data.');
runNpm(['run', 'sitemap']);
runNpm(['run', 'build:dev']);
run(process.execPath, ['scripts/generate-book-pages.mjs']);
