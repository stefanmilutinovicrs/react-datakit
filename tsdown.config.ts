import { defineConfig, type UserConfig } from 'tsdown';

const common = {
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
} satisfies UserConfig;

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
    },
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
