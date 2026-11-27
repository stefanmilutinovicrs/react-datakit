import { expect, test, type Locator } from '@playwright/test';

const problems: string[] = [];

test.beforeEach(async ({ page }) => {
  problems.length = 0;
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  // Before hydration, clicks and keys would reach only the server markup; once the client
  // chunks have loaded and run, the network is idle.
  await page.goto('/', { waitUntil: 'networkidle' });
});

test.afterEach(() => {
  expect(problems, 'console errors, warnings or uncaught errors').toEqual([]);
});

test('the server renders every component', async ({ request }) => {
  const html = await (await request.get('/')).text();
  for (const part of ['combobox-input', 'multiselect-input', 'daterangepicker-trigger', 'daterangepicker-value']) {
    expect(html).toContain(`data-dk-part="${part}"`);
  }
});

test('a DateRangePicker with a value hydrates with the text from the server', async ({ page, request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('Mar 10 – 14, 2026');
  await expect(page.getByRole('button', { name: /^Sprint/ })).toHaveText('Mar 10 – 14, 2026');
});

test('Combobox opens and selects a value', async ({ page }) => {
  const input = page.getByRole('combobox', { name: 'Assignee' });
  await input.click();
  await input.fill('Ele');
  await page.getByRole('option', { name: 'Elena Kim', exact: true }).click();
  await expect(input).toHaveValue('Elena Kim');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
});

test('grouped Combobox shows named groups and selects inside one', async ({ page }) => {
  const input = page.getByRole('combobox', { name: 'Owner' });
  await input.click();
  await input.press('ArrowDown');
  const platform = page.getByRole('group', { name: 'Platform' });
  await expect(page.getByRole('group', { name: 'Design' }).getByRole('option')).toHaveCount(2);
  await platform.getByRole('option', { name: 'Elena Kim', exact: true }).click();
  await expect(input).toHaveValue('Elena Kim');
});

test('MultiSelect opens and selects values', async ({ page }) => {
  const input = page.getByRole('combobox', { name: 'Labels' });
  await input.click();
  await input.press('ArrowDown');
  await page.getByRole('option', { name: 'frontend', exact: true }).click();
  await page.getByRole('option', { name: 'accessibility', exact: true }).click();
  const chips = page.getByRole('list', { name: 'Selected' }).getByRole('listitem');
  await expect(chips).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Remove frontend' })).toBeVisible();
});

test('DateRangePicker opens and selects a range', async ({ page }) => {
  const trigger = page.getByRole('button', { name: /^Period/ });
  await expect(trigger).toContainText('Pick a period');
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Period' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Last 7 days' }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).not.toContainText('Pick a period');
});

// Next.js transpiles light-dark() for its default browser targets; the theme must not depend on it.
test('data-dk-theme forces light or dark over the OS setting', async ({ page }) => {
  const background = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).backgroundColor);
  const control = page.locator('[data-dk-part="combobox-control"]').first();
  const main = page.locator('main');

  await expect.poll(() => background(control)).toBe('rgb(255, 255, 255)');
  await main.evaluate((element) => element.setAttribute('data-dk-theme', 'dark'));
  await expect.poll(() => background(control)).toBe('rgb(24, 24, 27)');
  await main.evaluate((element) => element.removeAttribute('data-dk-theme'));
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => background(control)).toBe('rgb(255, 255, 255)');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => background(control)).toBe('rgb(24, 24, 27)');
});
