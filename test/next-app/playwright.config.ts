import { defineConfig, devices } from '@playwright/test';

// Production is what users ship. Development runs the same spec because production React
// reports only structural hydration mismatches; attribute mismatches, such as a useId that
// differs between server and client, are logged in development only.
const servers = [
  { name: 'production', command: 'npx next start -p 3100', port: 3100 },
  { name: 'development', command: 'npx next dev -p 3101', port: 3101 },
];

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    // Both differ from the defaults on purpose: a dark OS checks data-dk-theme, and a time zone
    // other than the server's UTC catches dates rendered differently on each side.
    colorScheme: 'dark',
    timezoneId: 'America/New_York',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: servers.map(({ name, port }) => ({ name, use: { baseURL: `http://localhost:${port}` } })),
  webServer: servers.map(({ command, port }) => ({
    command,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  })),
});
