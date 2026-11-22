import { defineConfig } from 'tsdown';

export default defineConfig({
  // One entry per public subpath. New components add their own entry here
  // (e.g. 'combobox/index': 'src/combobox/index.ts') and a matching "exports" key.
  entry: {
    index: 'src/index.ts',
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
  copy: [{ from: 'src/styles/theme.css', to: 'dist', rename: 'styles.css' }],
});
