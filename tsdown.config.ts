import { dirname, resolve } from 'node:path';
import { defineConfig, type UserConfig } from 'tsdown';

const common = {
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
} satisfies UserConfig;

const schemaDir = resolve('src/filterbar/schema');

// The client entries import the filter schema as the package's own subpath instead of bundling a
// copy, so an app that parses the URL on the server and renders FilterBar ships the schema once.
const schemaAsPackage = {
  name: 'filterbar-schema-as-package',
  // Before the declaration bundler's resolver, which would inline the schema's types otherwise.
  resolveId: {
    order: 'pre' as const,
    handler(source: string, importer: string | undefined) {
      if (!importer || !source.startsWith('.')) return null;
      const from = dirname(resolve(importer));
      if (from.startsWith(schemaDir)) return null;
      const target = resolve(from, source)
        .replace(/\.ts$/, '')
        .replace(/[\\/]index$/, '');
      return target === schemaDir ? { id: 'react-datakit/filterbar/schema', external: true } : null;
    },
  },
  // Type-only imports of an external come out as inline `import("./schema")` types that keep the
  // source's relative path.
  renderChunk(code: string, chunk: { fileName: string }) {
    if (!/\.d\.c?ts$/.test(chunk.fileName)) return null;
    return code.replace(
      /import\("\.\.?\/(?:filterbar\/)?schema(?:\/index)?"\)/g,
      'import("react-datakit/filterbar/schema")',
    );
  },
};

export default defineConfig([
  {
    ...common,
    // One entry per public subpath, each with a matching "exports" key in package.json
    // and a line in .size-limit.json.
    entry: {
      index: 'src/index.ts',
      'combobox/index': 'src/combobox/index.ts',
      'multiselect/index': 'src/multiselect/index.ts',
      'daterangepicker/index': 'src/daterangepicker/index.ts',
      'filterbar/index': 'src/filterbar/index.ts',
      'sparkline/index': 'src/sparkline/index.ts',
    },
    plugins: [schemaAsPackage],
    // Components use hooks and browser APIs, so every entry is a client module
    // for React Server Components (Next.js App Router) out of the box.
    banner: { js: '"use client";' },
    // The empty declaration lets `import 'react-datakit/styles.css'` type-check without
    // bundler CSS types (TypeScript 6 checks side-effect imports by default).
    copy: [
      { from: 'src/styles/theme.css', to: 'dist', rename: 'styles.css' },
      { from: 'src/styles/styles.css.d.cts', to: 'dist' },
    ],
  },
  {
    ...common,
    // Server code imports the filter schema to read the URL, so it is built on its own, without
    // "use client": a chunk shared with the client entries (the date helpers) would carry the
    // directive, and a server component would get a client reference instead of the function.
    // scripts/check-server-entry.ts checks the output.
    entry: { 'filterbar/schema/index': 'src/filterbar/schema/index.ts' },
  },
]);
