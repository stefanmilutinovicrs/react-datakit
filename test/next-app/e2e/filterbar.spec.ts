import { expect, test, type Page } from '@playwright/test';

const problems: string[] = [];
const march = 'filter=status.is.open&filter=created.between.2026-03-01..2026-03-14';

test.beforeEach(async ({ page }) => {
  problems.length = 0;
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
});

test.afterEach(() => {
  expect(problems, 'console errors, warnings or uncaught errors').toEqual([]);
});

const issues = (page: Page) => page.getByRole('list', { name: 'Issues' }).getByRole('listitem');

test('the server parses the URL and renders the chips and the filtered issues', async ({ request }) => {
  const html = (await (await request.get(`/issues?${march}`)).text()).replaceAll('<!-- -->', '');
  expect(html).toContain('aria-label="Status is Open"');
  expect(html).toMatch(/aria-label="Created is between Mar 1\s*–\s*14, 2026"/);
  expect(html).toContain('<li>Checkout fails</li>');
  expect(html).not.toContain('<li>Dark mode</li>');
  expect(html).toContain('Left out: 0');
});

// The browser runs in America/New_York and the server in UTC: the date chip must not change on hydration.
test('hydrates without errors and edits update the URL and the server-rendered issues', async ({ page }) => {
  await page.goto(`/issues?${march}`, { waitUntil: 'networkidle' });
  await expect(issues(page)).toHaveText(['Checkout fails']);

  await page.getByRole('button', { name: 'Status is Open', exact: true }).click();
  await page.getByRole('option', { name: 'Done', exact: true }).click();
  await expect(page).toHaveURL(/filter=status\.is\.done/);
  await expect(issues(page)).toHaveText(['Dark mode']);

  await page.getByRole('button', { name: 'Remove filter Status is Done' }).click();
  await expect(page).toHaveURL(/\/issues\?filter=created\.between\.2026-03-01\.\.2026-03-14$/);
  await expect(issues(page)).toHaveText(['Checkout fails', 'Dark mode']);
});

test('adds a multi-enum and a number filter', async ({ page }) => {
  await page.goto('/issues', { waitUntil: 'networkidle' });
  const picker = page.getByRole('combobox', { name: 'Add filter' });

  await picker.click();
  await page.getByRole('option', { name: 'Owner', exact: true }).click();
  await page.getByRole('option', { name: 'Bojan', exact: true }).click();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/filter=owner\.isAnyOf\.bojan/);
  await expect(issues(page)).toHaveText(['Dark mode', 'Slow search']);

  await picker.click();
  await page.getByRole('option', { name: 'Estimate', exact: true }).click();
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/filter=owner\.isAnyOf\.bojan&filter=estimate\.eq\.5/);
  await expect(issues(page)).toHaveText(['Dark mode']);
});

test('Back restores the previous chips', async ({ page }) => {
  await page.goto(`/issues?${march}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Remove filter Status is Open' }).click();
  await expect(page.getByRole('group', { name: 'Status is Open' })).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('group', { name: 'Status is Open' })).toBeVisible();
  await expect(issues(page)).toHaveText(['Checkout fails']);
});

test('an unknown entry is left out and counted', async ({ page }) => {
  await page.goto('/issues?filter=status.is.open&filter=priority.is.high&filter=estimate.gt.-1', {
    waitUntil: 'networkidle',
  });
  await expect(page.getByTestId('errors')).toHaveText('Left out: 2');
  await expect(page.getByRole('group')).toHaveCount(1);
});
