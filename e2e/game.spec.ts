import { expect, test, type Page } from '@playwright/test';
import { arrange, handCount, playToEnd, startGame } from './helpers';

const PHONE = { width: 360, height: 640 };
const DESKTOP = { width: 1280, height: 800 };

async function noPageScroll(page: Page) {
  const m = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
    w: window.innerWidth,
    h: window.innerHeight,
  }));
  expect(m.sw).toBeLessThanOrEqual(m.w);
  expect(m.sh).toBeLessThanOrEqual(m.h);
}

async function noHorizontalScroll(page: Page) {
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  expect(m.sw).toBeLessThanOrEqual(m.w);
}

test.describe('setup', () => {
  test('starting with 2 opponents gives a 3-player table', async ({ page }) => {
    await page.goto('/?seed=setup&aiDelay=0');
    await page.locator('.segmented label', { has: page.locator('input[name="opponents"][value="2"]') }).click();
    await page.getByTestId('start').click();
    await expect(page.locator('.opponent')).toHaveCount(2);
    expect(await page.evaluate(() => window.__metroTest!.getState().players.length)).toBe(3);
    await expect(page.getByTestId('hand').locator('.card')).toHaveCount(7);
  });
});

test.describe('table', () => {
  for (const [name, size] of [['phone', PHONE], ['desktop', DESKTOP]] as const) {
    test(`shows every table item without scrolling on ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await startGame(page, { opponents: 3 });
      for (const id of ['hand', 'discard-top', 'draw-pile', 'turn', 'direction', 'current-line', 'line-strip']) {
        await expect(page.getByTestId(id)).toBeInViewport();
      }
      for (const id of ['ai1', 'ai2', 'ai3']) {
        await expect(page.getByTestId(`count-${id}`)).toBeInViewport();
        await expect(page.getByTestId(`count-${id}`)).toHaveText('7 cards');
      }
      await expect(page.getByTestId('current-line')).toContainText(/Line|Express/);
      await noPageScroll(page);
    });
  }

  test('marks playable cards and refuses unplayable ones', async ({ page }) => {
    await startGame(page);
    await arrange(page, { hands: { p0: ['st:tai-koo', 'st:che-kung-temple', 'st:jordan'] }, top: 'st:sai-ying-pun' });
    const hand = page.getByTestId('hand');
    await expect(hand.locator('[data-card="st:tai-koo"]')).toHaveClass(/is-playable/);
    await expect(hand.locator('[data-card="st:che-kung-temple"]')).not.toHaveClass(/is-playable/);
    await hand.locator('[data-card="st:che-kung-temple"]').click();
    await expect(page.getByTestId('log')).toContainText('doesn’t match');
    expect(await handCount(page)).toBe(3);
  });
});

test.describe('cards', () => {
  test('Admiralty shows its 4 lines and no number', async ({ page }) => {
    await startGame(page);
    await arrange(page, { hands: { p0: ['st:admiralty', 'st:jordan'] }, top: 'st:sai-ying-pun' });
    const card = page.getByTestId('hand').locator('[data-card="st:admiralty"]');
    await expect(card.locator('.card-band')).toHaveText(['ISL', 'TWL', 'EAL', 'SIL']);
    await expect(card.locator('.card-number')).toHaveCount(0);
    await expect(card).toContainText('Admiralty');
  });

  test('Tung Chung Line cards and badge show TCL, DRL and AEL', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { hands: { p0: ['st:airport', 'st:jordan'] }, top: 'st:olympic' });
    const card = page.getByTestId('hand').locator('[data-card="st:airport"]');
    await expect(card.locator('.card-band-part')).toHaveText(['TCL', 'DRL', 'AEL']);
    await expect(card.locator('.card-number')).toHaveText('8');
    await expect(page.getByTestId('current-line').locator('.line-code')).toHaveText(['TCL', 'DRL', 'AEL']);
    const colours = await card
      .locator('.card-band-part')
      .evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
    expect(new Set(colours).size).toBe(3);
  });

  test('a station card shows its line code, number and name', async ({ page }) => {
    await startGame(page);
    await arrange(page, { hands: { p0: ['st:chai-wan', 'st:jordan'] } });
    const card = page.getByTestId('hand').locator('[data-card="st:chai-wan"]');
    await expect(card.locator('.card-band')).toHaveText('ISL');
    await expect(card.locator('.card-number')).toHaveText('13');
    await expect(card).toContainText('Chai Wan');
  });
});

test.describe('line strip', () => {
  test('highlights Mong Kok on the Tsuen Wan Line', async ({ page }) => {
    await startGame(page);
    await arrange(page, { top: 'st:mong-kok', currentLine: 'TWL', face: { kind: 'none' } });
    const strip = page.getByTestId('line-strip');
    await expect(strip).toHaveAttribute('aria-label', 'Tsuen Wan Line');
    await expect(strip.locator('[aria-current="location"]')).toHaveAttribute('data-station', 'mong-kok');
    await expect(strip.locator('.stop')).toHaveCount(16);
    // Interchanges are marked, not numbered.
    await expect(strip.locator('[data-station="central"] .stop-dot')).toHaveClass(/interchange/);
    await expect(strip.locator('[data-station="tsim-sha-tsui"] .stop-dot')).toHaveText('1');
  });
});

test.describe('line strip branches and colours', () => {
  const stopX = (page: Page, id: string) =>
    page.getByTestId('line-strip').locator(`[data-station="${id}"] .stop-circle`).evaluate((el) => Number(el.getAttribute('cx')));

  test('LOHAS Park branches off at Tseung Kwan O, beside Hang Hau', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { top: 'st:hang-hau' });
    const strip = page.getByTestId('line-strip');
    await expect(strip.locator('[data-station="lohas-park"]')).toHaveAttribute('data-row', '-1');
    expect(await stopX(page, 'lohas-park')).toBe(await stopX(page, 'hang-hau'));
    expect(await stopX(page, 'lohas-park')).toBeLessThan(await stopX(page, 'po-lam'));
  });

  test('Racecourse loops from Sha Tin to University, beside Fo Tan', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { top: 'st:sha-tin' });
    const strip = page.getByTestId('line-strip');
    expect(await stopX(page, 'racecourse')).toBe(await stopX(page, 'fo-tan'));
    await expect(strip.locator('line.track[data-from="sha-tin"][data-to="racecourse"]')).toHaveCount(1);
    await expect(strip.locator('line.track[data-from="racecourse"][data-to="university"]')).toHaveCount(1);
  });

  test('Tung Chung Line shows orange and green side by side to Tsing Yi', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { top: 'st:sunny-bay' });
    const strip = page.getByTestId('line-strip');
    const colours = (from: string, to: string) =>
      strip.locator(`line.track[data-from="${from}"][data-to="${to}"]`).evaluateAll((els) => els.map((e) => e.getAttribute('stroke')));
    expect(await colours('hong-kong', 'kowloon')).toEqual(['#F7943E', '#00888A']);
    expect(await colours('tsing-yi', 'sunny-bay')).toEqual(['#F7943E']);
    expect(await colours('sunny-bay', 'disneyland-resort')).toEqual(['#E777CB']);
    expect(await colours('tsing-yi', 'airport')).toEqual(['#00888A']);
  });
});

test.describe('controls', () => {
  test('interchange prompt offers exactly its lines and applies the choice', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { hands: { p0: ['st:admiralty', 'st:jordan'] }, top: 'st:sai-ying-pun' });
    await page.getByTestId('hand').locator('[data-card="st:admiralty"]').click();
    const chooser = page.getByTestId('line-chooser');
    // On the Island Line, Admiralty must change line: ISL is not offered.
    expect(await chooser.locator('.line-option').evaluateAll((els) => els.map((e) => e.getAttribute('data-line')))).toEqual([
      'TWL',
      'EAL',
      'SIL',
    ]);
    await chooser.locator('button[data-line="SIL"]').click();
    await expect(page.getByTestId('current-line')).toHaveAttribute('data-line', 'SIL');
    await expect(page.getByTestId('discard-top')).toHaveAttribute('data-card', 'st:admiralty');
  });

  test('a 2-line interchange changes line with no prompt', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { hands: { p0: ['st:north-point', 'st:jordan'] }, top: 'st:sai-ying-pun' });
    await page.getByTestId('hand').locator('[data-card="st:north-point"]').click();
    await expect(page.getByTestId('line-chooser')).toHaveCount(0);
    await expect(page.getByTestId('current-line')).toHaveAttribute('data-line', 'TKL');
    await expect(page.getByTestId('discard-top')).toHaveAttribute('data-card', 'st:north-point');
  });

  test('cancelling the line prompt plays nothing', async ({ page }) => {
    await startGame(page);
    await arrange(page, { hands: { p0: ['wild:octopus:1', 'st:jordan'] }, top: 'st:sai-ying-pun' });
    await page.getByTestId('hand').locator('[data-card="wild:octopus:1"]').click();
    await expect(page.getByTestId('line-chooser').locator('.line-option')).toHaveCount(8);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('line-chooser')).toHaveCount(0);
    expect(await handCount(page)).toBe(2);
  });

  test('by default, drawing one card ends the turn even if it is playable', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { hands: { p0: ['st:jordan', 'st:whampoa'] }, top: 'st:sai-ying-pun', drawTop: ['st:tai-koo'] });
    await page.getByTestId('draw').click();
    await expect(page.getByTestId('turn')).toHaveText('Computer 1’s turn');
    expect(await handCount(page)).toBe(3);
  });

  test('draw a playable card then pass keeps it and moves the turn', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000, rules: { playDrawnCard: true } });
    await arrange(page, { hands: { p0: ['st:jordan', 'st:whampoa'] }, top: 'st:sai-ying-pun', drawTop: ['st:tai-koo'] });
    await page.getByTestId('draw').click();
    await expect(page.getByTestId('pass')).toBeEnabled();
    await expect(page.getByTestId('hand').locator('[data-card="st:tai-koo"]')).toHaveClass(/is-drawn/);
    await page.getByTestId('pass').click();
    await expect(page.getByTestId('hand').locator('[data-card="st:tai-koo"]')).toBeVisible();
    await expect(page.getByTestId('turn')).toHaveText('Computer 1’s turn');
  });

  test('UNO! called: no penalty', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { hands: { p0: ['st:tai-koo', 'st:jordan'] }, top: 'st:sai-ying-pun' });
    await page.getByTestId('uno').click();
    await expect(page.getByTestId('uno')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('hand').locator('[data-card="st:tai-koo"]').click();
    expect(await handCount(page)).toBe(1);
    await expect(page.getByTestId('log')).toContainText('You called UNO!');
  });

  test('UNO! missed: 1 penalty card and a message', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { hands: { p0: ['st:tai-koo', 'st:jordan'] }, top: 'st:sai-ying-pun' });
    await page.getByTestId('hand').locator('[data-card="st:tai-koo"]').click();
    expect(await handCount(page)).toBe(2);
    await expect(page.getByTestId('log')).toContainText('forgot to call UNO!');
  });

  test('a computer’s Rush Hour is reported and adds 2 cards', async ({ page }) => {
    // Long enough between computer moves to read the Rush Hour messages.
    await startGame(page, { opponents: 1, aiDelay: 1500 });
    await arrange(page, {
      hands: { p0: ['st:jordan', 'st:whampoa', 'st:olympic'], ai1: ['act:rush-hour:ISL', 'st:hku', 'st:tin-hau'] },
      top: 'st:sai-ying-pun',
      turn: 1,
    });
    await expect(page.getByTestId('log')).toContainText('Computer 1 played ISL Rush Hour');
    await expect(page.getByTestId('log')).toContainText('You drew 2 cards');
    expect(await handCount(page)).toBe(5);
  });

  test('switching to Chinese mid-round keeps the round', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { hands: { p0: ['st:chai-wan', 'st:jordan'] }, top: 'st:sai-ying-pun' });
    await page.getByTestId('lang-zh').click();
    await expect(page.getByTestId('turn')).toHaveText('輪到你');
    await expect(page.getByTestId('current-line')).toContainText('港島綫');
    await expect(page.getByTestId('hand').locator('[data-card="st:chai-wan"]')).toContainText('柴灣');
    expect(await handCount(page)).toBe(2);
    await page.reload();
    await expect(page.getByTestId('start')).toHaveText('開始');
  });
});

test.describe('end of round', () => {
  test('announces the winner; Play Again keeps opponents and reshuffles', async ({ page }) => {
    await startGame(page, { opponents: 3, aiDelay: 60_000 });
    const before = await page.evaluate(() => window.__metroTest!.getState().players[1]!.hand.map((c) => c.id));
    await arrange(page, { hands: { p0: ['st:tai-koo'] }, top: 'st:sai-ying-pun' });
    await page.getByTestId('hand').locator('[data-card="st:tai-koo"]').click();
    await expect(page.getByTestId('end-screen')).toContainText('You win!');
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.locator('.opponent')).toHaveCount(3);
    expect(await handCount(page)).toBe(7);
    const after = await page.evaluate(() => window.__metroTest!.getState().players[1]!.hand.map((c) => c.id));
    expect(after).not.toEqual(before);
  });

  test('Back to setup returns to the setup screen', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { hands: { p0: ['st:tai-koo'] }, top: 'st:sai-ying-pun' });
    await page.getByTestId('hand').locator('[data-card="st:tai-koo"]').click();
    await page.getByRole('button', { name: 'Back to setup' }).click();
    await expect(page.getByTestId('start')).toBeVisible();
  });
});

test.describe('keyboard and phone width', () => {
  test('no horizontal scroll at 360px, and the game is playable by keyboard', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto('/?seed=kbd&aiDelay=60000');
    // The setup screen may scroll vertically (house rules), never sideways.
    await noHorizontalScroll(page);
    // Setup by keyboard: focus Start and press Enter.
    await page.getByTestId('start').focus();
    await page.keyboard.press('Enter');
    await arrange(page, { hands: { p0: ['st:admiralty', 'st:tai-koo', 'st:jordan'] }, top: 'st:sai-ying-pun' });
    await noPageScroll(page);

    // Tab until the Admiralty card has focus, then choose a line with the keyboard.
    let found = false;
    for (let i = 0; i < 30 && !found; i++) {
      await page.keyboard.press('Tab');
      found = await page.evaluate(() => document.activeElement?.getAttribute('data-card') === 'st:admiralty');
    }
    expect(found).toBe(true);
    await page.keyboard.press('Enter');
    const chooser = page.getByTestId('line-chooser');
    await expect(chooser.locator('button[data-line="TWL"]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(chooser.locator('button[data-line="EAL"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('current-line')).toHaveAttribute('data-line', 'EAL');
    await noPageScroll(page);
  });
});

test.describe('full round', () => {
  test('a whole round can be played to the end against 2 computers', async ({ page }) => {
    test.setTimeout(180_000);
    await startGame(page, { opponents: 2, seed: 'full-round' });
    await playToEnd(page);
    await expect(page.getByTestId('end-screen')).toBeVisible();
  });
});

test.describe('walkway transfers', () => {
  test('Hong Kong shows its transfer and offers ISL or TWL', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { hands: { p0: ['st:hong-kong', 'st:jordan'] }, top: 'st:kowloon' });
    const card = page.getByTestId('hand').locator('[data-card="st:hong-kong"]');
    await expect(card.getByTestId('card-transfer')).toContainText('ISL');
    await expect(card.getByTestId('card-transfer')).toContainText('TWL');
    await expect(card.locator('.card-number')).toHaveText('1');
    await card.click();
    const chooser = page.getByTestId('line-chooser');
    expect(await chooser.locator('.line-option').evaluateAll((els) => els.map((e) => e.getAttribute('data-line')))).toEqual([
      'ISL',
      'TWL',
    ]);
    await chooser.locator('button[data-line="TWL"]').click();
    await expect(page.getByTestId('current-line')).toHaveAttribute('data-line', 'TWL');
  });

  test('Central offers TWL or TCL from the Island Line', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { hands: { p0: ['st:central', 'st:jordan'] }, top: 'st:sai-ying-pun' });
    await page.getByTestId('hand').locator('[data-card="st:central"]').click();
    const chooser = page.getByTestId('line-chooser');
    expect(await chooser.locator('.line-option').evaluateAll((els) => els.map((e) => e.getAttribute('data-line')))).toEqual([
      'TWL',
      'TCL',
    ]);
    await chooser.locator('button[data-line="TCL"]').click();
    await expect(page.getByTestId('current-line')).toHaveAttribute('data-line', 'TCL');
  });

  test('East TST switches to the Tsuen Wan Line with no prompt', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { hands: { p0: ['st:east-tsim-sha-tsui', 'st:jordan'] }, top: 'st:austin' });
    await page.getByTestId('hand').locator('[data-card="st:east-tsim-sha-tsui"]').click();
    await expect(page.getByTestId('line-chooser')).toHaveCount(0);
    await expect(page.getByTestId('current-line')).toHaveAttribute('data-line', 'TWL');
  });
});
