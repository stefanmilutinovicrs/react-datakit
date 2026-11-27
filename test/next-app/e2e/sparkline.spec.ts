import { expect, test } from '@playwright/test';

const problems: string[] = [];

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

// fr-FR groups digits with a narrow no-break space in Node's ICU; the name must use plain spaces
// so the server's aria-label matches the browser's.
const checkout = 'Erreurs Paiement: up from 1 210,5 to 2 240, low 1 210,5, high 2 240';

test('the server renders a named SVG in every row', async ({ request }) => {
  const html = await (await request.get('/sparkline')).text();
  expect(html.match(/data-dk-part="sparkline"/g)).toHaveLength(6);
  expect(html.match(/data-dk-part="sparkline-line"/g)?.length).toBeGreaterThanOrEqual(4);
  expect(html).toContain(`aria-label="${checkout}"`);
  expect(html).not.toMatch(/aria-label="[^"]*[\u00a0\u202f\u2009]/);
});

test('hydrates without errors, with every part', async ({ page }) => {
  await page.goto('/sparkline', { waitUntil: 'networkidle' });
  const table = page.getByRole('table', { name: 'Erreurs par page' });
  await expect(table.getByRole('img')).toHaveCount(3);
  await expect(page.getByRole('img', { name: checkout })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Erreurs Profil: up from 520 to 790, low 520, high 805' })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Inscriptions: / })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Variation nette: up from 4 to 6/ })).toBeVisible();
  await expect(page.locator('[data-dk-part="sparkline-marker"]')).toHaveCount(3);
  await expect(page.locator('[data-dk-part="sparkline-reference-line"]')).toHaveCount(2);
  await expect(page.locator('[data-dk-part="sparkline"][aria-hidden="true"]')).toHaveCount(1);
});
