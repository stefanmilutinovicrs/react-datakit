import { defineConfig } from 'tsdown';

export default defineConfig({
  // One entry per public subpath, each with a matching "exports" key in package.json
  // and a line in .size-limit.json.
  entry: {
    index: 'src/index.ts',
    'combobox/index': 'src/combobox/index.ts',
    'multiselect/index': 'src/multiselect/index.ts',
    'daterangepicker/index': 'src/daterangepicker/index.ts',
  },
  format: ['esm', 'cjs'],
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
  // Components use hooks and browser APIs, so every entry is a client module
  // for React Server Components (Next.js App Router) out of the box.
  banner: { js: '"use client";' },
  // The empty declaration lets `import 'react-datakit/styles.css'` type-check without
  // bundler CSS types (TypeScript 6 checks side-effect imports by default).
  copy: [
    { from: 'src/styles/theme.css', to: 'dist', rename: 'styles.css' },
    { from: 'src/styles/styles.css.d.cts', to: 'dist' },
  ],
});
