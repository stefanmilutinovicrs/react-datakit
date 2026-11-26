import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Runs the visual tests in the Playwright image that matches the installed Playwright, so
// screenshots come from the same Linux, fonts and Chromium on every machine and in CI.
// Linux node_modules live in a Docker volume, apart from the host's. The version comes from
// the lockfile, so CI needs no install on the host.
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
  packages: Record<string, { version?: string } | undefined>;
};
const version = lock.packages['node_modules/playwright']?.version;
if (!version) throw new Error('playwright is missing from package-lock.json.');
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const update = process.argv.includes('--update');

const install = [
  'lock="$(sha256sum package-lock.json)"',
  'if [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$lock" ]; then',
  '  npm install --ignore-scripts --no-audit --no-fund --no-save && echo "$lock" > node_modules/.lock-hash || exit 1',
  'fi',
].join('\n');
const test = `npx vitest run -c vitest.visual.config.ts${update ? ' --update' : ''}`;

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--ipc=host',
    '--env',
    'CI',
    '--volume',
    `${process.cwd()}:/work`,
    '--volume',
    `react-datakit-visual-modules-${version}:/work/node_modules`,
    '--workdir',
    '/work',
    image,
    'bash',
    '-c',
    `${install}\n${test}`,
  ],
  { stdio: 'inherit' },
);

if (result.error) {
  console.error(`Could not start Docker (${result.error.message}). Install Docker, start it, and run this again.`);
  process.exit(1);
}
process.exit(result.status ?? 1);
