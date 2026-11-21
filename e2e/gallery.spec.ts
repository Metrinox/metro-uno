import { expect, test, type Page } from '@playwright/test';
import { networkById } from '../src/data/networks';
import { buildDeck } from '../src/engine/cards';

/** London's deck, read from the data so the test follows changes to the station list. */
const london = networkById('london-underground')!;
const londonDeck = buildDeck(london);

async function cardIds(page: Page) {
  return page.locator('.gallery-cards .card').evaluateAll((els) => els.map((e) => e.getAttribute('data-card')));
}

/** Checks that the London map is shown: 8 lines with diagrams and every card in its deck once. */
async function expectLondon(page: Page) {
  await expect(page.getByTestId('gallery-map-london-underground')).toBeChecked();
  const lines = page.getByTestId('gallery-line');
  await expect(lines).toHaveCount(8);
  await expect(lines.getByTestId('line-strip')).toHaveCount(8);
  await expect(page.getByTestId('gallery-intro')).toHaveText(`All ${londonDeck.length} cards in the deck and all 8 lines.`);
  const ids = await cardIds(page);
  expect(ids.toSorted()).toEqual(londonDeck.map((c) => c.id).toSorted());
  await expect(page.locator('[data-group="wilds"] .card')).toHaveCount(8);
  await expect(page.locator('[data-group="wilds"]')).toContainText('Oyster');
  await expect(page.locator('[data-group="wilds"]')).toContainText('Tube Strike');
}

test.describe('/gallery page', () => {
  test('shows every line with its diagram and every card once', async ({ page }) => {
    await page.goto('/gallery');
    await expect(page).toHaveURL(/\/gallery\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Card & line gallery');
    const lines = page.getByTestId('gallery-line');
    await expect(lines).toHaveCount(8);
    await expect(lines.getByTestId('line-strip')).toHaveCount(8);
    const ids = await cardIds(page);
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

  test('has a map menu at the top with Hong Kong selected', async ({ page }) => {
    await page.goto('/gallery/');
    const menu = page.getByTestId('gallery-map-menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('radio')).toHaveCount(2);
    await expect(page.getByRole('radio', { name: 'Hong Kong MTR' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'London Underground' })).not.toBeChecked();
    // The menu comes before the back link, the lines and the cards.
    const menuBox = (await menu.boundingBox())!;
    const backBox = (await page.getByRole('link', { name: '← Back to the game' }).boundingBox())!;
    const linesBox = (await page.getByTestId('gallery-line').first().boundingBox())!;
    expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(backBox.y);
    expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(linesBox.y);
    await expect(page.getByTestId('gallery-intro')).toHaveText('All 130 cards in the deck and all 8 lines.');
  });

  test('switches to the London map from the menu', async ({ page }) => {
    await page.goto('/gallery/');
    await page.getByTestId('gallery-map-menu').locator('label', { hasText: 'London Underground' }).click();
    await expect(page).toHaveURL(/\/gallery\/\?map=london-underground$/);
    await expectLondon(page);
    await expect(page.locator('[data-line="ISL"]')).toHaveCount(0);

    // Reloading keeps the chosen map; choosing Hong Kong again switches back.
    await page.reload();
    await expectLondon(page);
    await page.getByTestId('gallery-map-menu').locator('label', { hasText: 'Hong Kong MTR' }).click();
    await expect(page).toHaveURL(/\/gallery\/\?map=hk-mtr$/);
    await expect(page.getByTestId('gallery-intro')).toHaveText('All 130 cards in the deck and all 8 lines.');
    expect(await cardIds(page)).toHaveLength(130);
  });

  test('opens on London from a link', async ({ page }) => {
    await page.goto('/gallery?map=london-underground');
    await expect(page).toHaveURL(/\/gallery\/\?map=london-underground$/);
    await expect(page.getByRole('radio', { name: 'London Underground' })).toBeChecked();
    await expectLondon(page);
  });

  test('opens on Hong Kong for an unknown map', async ({ page }) => {
    await page.goto('/gallery/?map=atlantis');
    await expect(page.getByRole('radio', { name: 'Hong Kong MTR' })).toBeChecked();
    expect(await cardIds(page)).toHaveLength(130);
  });

  test('shows London in English names in Chinese mode, without repeating line names', async ({ page }) => {
    await page.goto('/gallery/?map=london-underground');
    await page.getByTestId('lang-zh').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('卡牌及路綫一覽');
    await expect(page.getByTestId('gallery-intro')).toHaveText(`牌堆全部 ${londonDeck.length} 張牌及全部 8 條路綫。`);
    const lines = page.getByTestId('gallery-line');
    await expect(lines).toHaveCount(8);
    // London has no Chinese names: each line shows its English name once, with no alternate-language copy.
    await expect(page.locator('.gallery-line-alt')).toHaveCount(0);
    await expect(lines.locator('.line-name')).toHaveText(london.lines.map((l) => l.name.en));
    // Hong Kong still shows its English names alongside the Chinese ones.
    await page.getByTestId('gallery-map-menu').locator('label', { hasText: '香港港鐵' }).click();
    await expect(page.locator('.gallery-line-alt')).toHaveCount(8);
  });

  test('does not scroll sideways on a phone with London selected', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/gallery/?map=london-underground');
    await expect(page.getByTestId('gallery-map-menu')).toBeVisible();
    await expect(page.getByTestId('gallery-line')).toHaveCount(8);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
    expect(m.sw).toBeLessThanOrEqual(m.w);
  });

  test('does not scroll sideways on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/gallery/');
    await page.locator('.gallery').waitFor();
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
    expect(m.sw).toBeLessThanOrEqual(m.w);
  });
});
