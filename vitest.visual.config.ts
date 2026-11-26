import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Screenshots depend on the fonts and the renderer of the OS, so the baselines come from
// one Linux image: `npm run test:visual` runs this config inside it, locally and in CI.
if (process.platform !== 'linux' && !process.env.DK_VISUAL_ANY_OS) {
  throw new Error('Visual tests compare Linux screenshots. Run `npm run test:visual`, which uses Docker.');
}

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'visual',
    include: ['src/**/*.visual.tsx'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      viewport: { width: 1200, height: 720 },
      screenshotFailures: false,
      expect: {
        toMatchScreenshot: {
          comparatorName: 'pixelmatch',
          comparatorOptions: { threshold: 0.1, allowedMismatchedPixelRatio: 0 },
          resolveScreenshotPath: ({ arg, ext, root, testFileDirectory }) =>
            `${root}/${testFileDirectory}/screenshots/${arg}${ext}`,
          resolveDiffPath: ({ arg, ext, root }) => `${root}/.vitest/visual/${arg}${ext}`,
        },
      },
    },
  },
});
