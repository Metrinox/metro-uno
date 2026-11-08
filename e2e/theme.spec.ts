import { expect, test, type Page } from '@playwright/test';

const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const LIGHT_BG = 'rgb(243, 241, 236)';
const DARK_BG = 'rgb(21, 24, 28)';

test.describe('light and dark mode', () => {
  test('follows the system until the player picks', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    expect(await bodyBg(page)).toBe(DARK_BG);
    await page.getByLabel('☀ Light').check({ force: true });
    expect(await bodyBg(page)).toBe(LIGHT_BG);
    await page.reload();
    expect(await bodyBg(page)).toBe(LIGHT_BG);
    await expect(page.getByLabel('☀ Light')).toBeChecked();
  });

  test('gallery toggle flips the theme and remembers it', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/gallery/');
    expect(await bodyBg(page)).toBe(LIGHT_BG);
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    expect(await bodyBg(page)).toBe(DARK_BG);
    await page.reload();
    expect(await bodyBg(page)).toBe(DARK_BG);
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    expect(await bodyBg(page)).toBe(LIGHT_BG);
  });
});
