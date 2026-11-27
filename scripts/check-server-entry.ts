import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const problems: string[] = [];

// The filter schema must run in React Server Components: no "use client", no React and no shared
// chunk (the client build's chunks all start with "use client").
const serverFiles = ['dist/filterbar/schema/index.js', 'dist/filterbar/schema/index.cjs'];
for (const file of serverFiles) {
  const code = readFileSync(file, 'utf8');
  if (code.includes('use client')) problems.push(`${file} contains "use client"`);
  const imports = [...code.matchAll(/(?:from\s*|import\s*\(?|require\()\s*["']([^"']+)["']/g)].map((match) => match[1]);
  if (imports.length > 0) problems.push(`${file} imports ${imports.join(', ')}`);
}

// The client build imports the schema as `react-datakit/filterbar/schema` instead of bundling a
// second copy; a dev message that only the schema has gives a copy away.
const schemaOnly = 'may only use letters, digits';
const clientFiles = readdirSync('dist', { recursive: true, encoding: 'utf8' })
  .map((file) => join('dist', file).split('\\').join('/'))
  .filter((file) => /\.c?js$/.test(file) && !file.startsWith('dist/filterbar/schema/'));
for (const file of clientFiles)
  if (readFileSync(file, 'utf8').includes(schemaOnly)) problems.push(`${file} bundles a copy of the filter schema`);
for (const file of ['dist/filterbar/index.js', 'dist/filterbar/index.cjs'])
  if (!readFileSync(file, 'utf8').includes('react-datakit/filterbar/schema'))
    problems.push(`${file} does not import react-datakit/filterbar/schema`);

if (problems.length > 0) {
  console.error(`Server entry check failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(
  `Server entry check passed: ${serverFiles.join(', ')}; ${clientFiles.length} client files use the schema entry`,
);
