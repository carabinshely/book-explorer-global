import { spawnSync } from 'node:child_process';

const npmCli = process.env.npm_execpath;

function run(command, args) {
  const result = spawnSync(command, args, {
    env: process.env,
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

console.log('Building the pull-request verification artifact. Public legal identity is versioned in the repository.');
runNpm(['run', 'sitemap']);
runNpm(['run', 'build:dev']);
run(process.execPath, ['scripts/generate-book-pages.mjs']);
