import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Tests run in real browsers (Vitest Browser Mode), never in jsdom:
// focus, scrolling and virtualization only behave correctly in a real engine.
// `npm test` runs Chromium; CI and `npm run test:all-browsers` run all three.
const browsers = ['chromium', 'firefox', 'webkit'] as const;

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
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser }],
          },
        },
      })),
    ],
  },
});
