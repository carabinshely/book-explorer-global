import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localSecretFile = path.join(
  root,
  'signup-worker',
  '.dev.vars.preview'
);
const outputFile = path.join(
  root,
  'signup-worker',
  'worker-configuration.d.ts'
);
const createdPlaceholder = !existsSync(localSecretFile);

if (createdPlaceholder) {
  await writeFile(
    localSecretFile,
    'MAILERLITE_API_TOKEN=type-generation-placeholder-not-a-secret\n',
    { encoding: 'utf8', flag: 'wx' }
  );
}

try {
  const wranglerBin = path.join(
    root,
    'node_modules',
    'wrangler',
    'bin',
    'wrangler.js'
  );
  const result = spawnSync(
    process.execPath,
    [
      wranglerBin,
      'types',
      'signup-worker/worker-configuration.d.ts',
      '--config',
      'signup-worker/wrangler.jsonc',
      '--env',
      'preview',
      '--strict-vars',
      'false',
    ],
    { cwd: root, stdio: 'inherit' }
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Wrangler type generation failed with status ${result.status}`);
  }

  const generatedTypes = await readFile(outputFile, 'utf8');
  await writeFile(
    outputFile,
    generatedTypes.replace(/[ \t]+(?=\r?$)/gm, ''),
    'utf8'
  );
} finally {
  if (createdPlaceholder) {
    await rm(localSecretFile, { force: true });
  }
}
