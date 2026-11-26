import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Installs what `npm publish` would ship, not the source: the test must catch a broken
// "exports" map, a missing "use client" banner or a styles.css left out of the tarball.
// --no-save keeps react-datakit out of package.json and the lockfile, whose integrity
// hash would change with every build.
const fixture = import.meta.dirname;
const root = resolve(fixture, '../..');

// npm sets npm_execpath to its own CLI script; running that with node avoids spawning
// npm.cmd through a shell on Windows.
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this through npm: `npm run test:next` in the repo root.');

const run = (args: string[], cwd: string) =>
  execFileSync(process.execPath, [npm, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

console.log(run(['run', 'build'], root));
const destination = mkdtempSync(join(tmpdir(), 'react-datakit-'));
const [packed] = JSON.parse(run(['pack', '--json', '--pack-destination', destination], root)) as { filename: string }[];
if (!packed) throw new Error('npm pack did not report a tarball.');
run(['install', '--no-save', '--no-audit', '--no-fund', join(destination, packed.filename)], fixture);
console.log(`Installed ${packed.filename} into ${fixture}`);
