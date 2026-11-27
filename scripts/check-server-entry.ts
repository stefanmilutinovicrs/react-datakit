import { readFileSync } from 'node:fs';

// The filter schema must run in React Server Components: no "use client", no React and no shared
// chunk (the client build's chunks all start with "use client").
const files = ['dist/filterbar/schema/index.js', 'dist/filterbar/schema/index.cjs'];
const problems: string[] = [];
for (const file of files) {
  const code = readFileSync(file, 'utf8');
  if (code.includes('use client')) problems.push(`${file} contains "use client"`);
  const imports = [...code.matchAll(/(?:from\s*|import\s*\(?|require\()\s*["']([^"']+)["']/g)].map((match) => match[1]);
  if (imports.length > 0) problems.push(`${file} imports ${imports.join(', ')}`);
}
if (problems.length > 0) {
  console.error(`Server entry check failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`Server entry check passed: ${files.join(', ')}`);
