import react from '@vitejs/plugin-react';
import { defineBrowserCommand, playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import type { EmulatedMedia } from './src/test/media';

// Tests run in real browsers (Vitest Browser Mode), never in jsdom:
// focus, scrolling and virtualization only behave correctly in a real engine.
// `npm test` runs Chromium; CI and `npm run test:all-browsers` run all three.
const browsers = ['chromium', 'firefox', 'webkit'] as const;

const emulateMedia = defineBrowserCommand<[EmulatedMedia]>(({ page }, media) => page.emulateMedia(media));

const contrastTests = 'src/styles/contrast.test.tsx';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        test: { name: 'node', include: ['eslint-rules/**/*.test.js'], environment: 'node' },
      },
      ...browsers.map((browser) => ({
        extends: true,
        test: {
          name: browser,
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [contrastTests],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser }],
            commands: { emulateMedia },
          },
        },
      })),
      {
        extends: true,
        test: {
          name: 'contrast',
          include: [contrastTests],
          // A minute of axe runs on every story; alongside the browser projects it starved
          // their pages, so it runs on its own once they are done.
          sequence: { groupOrder: 1 },
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            // Stories are written for the Storybook canvas; at the default 414px some demo text
            // runs past the viewport with Linux fonts, which axe reports as obscured.
            viewport: { width: 1280, height: 800 },
          },
        },
      },
    ],
  },
});
