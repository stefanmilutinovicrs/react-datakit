import type { NextConfig } from 'next';

// The repo's package-lock.json one level up would otherwise make Next.js treat the repo
// root as the workspace root and warn about multiple lockfiles.
const config: NextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  turbopack: { root: import.meta.dirname },
};

export default config;
