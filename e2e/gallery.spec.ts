import { expect, test } from '@playwright/test';

test.describe('/gallery page', () => {
  test('shows every line with its diagram and every card once', async ({ page }) => {
    await page.goto('/gallery');
    await expect(page).toHaveURL(/\/gallery\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Card & line gallery');
    const lines = page.getByTestId('gallery-line');
    await expect(lines).toHaveCount(8);
    await expect(lines.getByTestId('line-strip')).toHaveCount(8);
    const ids = await page.locator('.gallery-cards .card').evaluateAll((els) => els.map((e) => e.getAttribute('data-card')));
    expect(ids).toHaveLength(130);
    expect(new Set(ids).size).toBe(130);
    await expect(page.locator('[data-group="interchanges"] .card')).toHaveCount(17);
    await expect(page.locator('[data-group="wilds"] .card')).toHaveCount(8);
    await expect(page.getByRole('link', { name: '← Back to the game' })).toHaveAttribute('href', '../');
  });

  test('switches to Chinese', async ({ page }) => {
    await page.goto('/gallery/');
    await page.getByTestId('lang-zh').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('卡牌及路綫一覽');
    await expect(page.locator('[data-line="ISL"] .line-name').first()).toHaveText('港島綫');
    await expect(page.locator('.gallery-cards [data-card="st:chai-wan"]')).toContainText('柴灣');
  });

  test('does not scroll sideways on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/gallery/');
    await page.locator('.gallery').waitFor();
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
    expect(m.sw).toBeLessThanOrEqual(m.w);
  });
});
