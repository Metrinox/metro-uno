import { expect, test, type Page } from '@playwright/test';
import { networkById } from '../src/data/networks';
import { buildDeck } from '../src/engine/cards';

const LONDON = 'london-underground';
const london = networkById(LONDON)!;
const londonDeck = new Set(buildDeck(london).map((c) => c.id));
const hongKongDeck = new Set(buildDeck(networkById('hk-mtr')!).map((c) => c.id));

/** Card labels in the hand, in order. */
const handCards = (page: Page) => page.getByTestId('hand').locator('.card').allTextContents();

const myTurn = (page: Page) => page.getByTestId('turn').filter({ hasText: 'Your turn' });

/** Takes one turn: plays a playable card if there is one (when `play`), otherwise draws. */
async function takeTurn(page: Page, play: boolean) {
  const playable = page.getByTestId('hand').locator('.card.is-playable');
  if (play && (await playable.count()) > 0) {
    await playable.first().click();
    const same = page.getByTestId('same-number');
    if (await same.isVisible()) await same.getByTestId('play-selected').click();
    const chooser = page.getByTestId('line-chooser');
    if (await chooser.isVisible()) await chooser.locator('.line-option').first().click();
    return;
  }
  await page.getByTestId('draw').click();
  if (await page.getByTestId('pass').isEnabled()) await page.getByTestId('pass').click();
}

test('two players and a computer play online', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  // The host creates a room.
  await host.goto('/');
  await host.getByTestId('play-online').click();
  await host.getByTestId('online-name').fill('Mei');
  await host.getByTestId('create-room').click();
  await expect(host.getByTestId('lobby-code')).toHaveText(/^[2-9A-HJKMNP-Z]{4}$/);
  const link = await host.getByTestId('share-link').inputValue();
  expect(link).toMatch(/\?room=[2-9A-HJKMNP-Z]{4}$/);

  // The guest joins by the link.
  await guest.goto(link);
  await guest.getByTestId('online-name').fill('Ka Ho');
  await guest.getByTestId('join-room').click();
  await expect(guest.getByTestId('seat-1')).toContainText('Ka Ho');
  await expect(guest.getByTestId('start-online')).toHaveCount(0);
  await expect(host.getByTestId('seat-1')).toContainText('Ka Ho');

  // The host adds a computer and starts.
  await host.getByTestId('add-bot-2').click();
  await expect(guest.getByTestId('seat-2')).toContainText('Computer 1');
  await host.getByTestId('start-online').click();

  for (const [page, other] of [
    [host, 'Ka Ho'],
    [guest, 'Mei'],
  ] as const) {
    await expect(page.getByTestId('hand').locator('.card')).toHaveCount(7);
    // Opponents are listed in seat order.
    await expect(page.locator('.opponent-name')).toHaveText([other, 'Computer 1']);
  }

  // A reload returns the guest to the same seat and hand.
  const before = await handCards(guest);
  await guest.reload();
  await expect(guest.getByTestId('hand').locator('.card')).toHaveCount(before.length);
  expect(await handCards(guest)).toEqual(before);

  // Play until the guest has played a card, which the host then sees.
  let guestPlayed = false;
  for (let i = 0; i < 60 && !guestPlayed; i++) {
    if (await myTurn(host).isVisible()) await takeTurn(host, false);
    if (await myTurn(guest).isVisible()) {
      guestPlayed = (await guest.getByTestId('hand').locator('.card.is-playable').count()) > 0;
      await takeTurn(guest, true);
    }
    await host.waitForTimeout(100);
  }
  expect(guestPlayed).toBe(true);
  await expect(host.getByTestId('log')).toContainText('Ka Ho played');

  await hostContext.close();
  await guestContext.close();
});

test('the lobby fits a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');
  await page.getByTestId('play-online').click();
  await page.getByTestId('online-name').fill('Mei');
  await page.getByTestId('create-room').click();
  await expect(page.getByTestId('lobby-code')).toBeVisible();
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  expect(m.sw).toBeLessThanOrEqual(m.w);
  for (const id of ['share-link', 'copy-link', 'add-bot-3', 'start-online', 'leave-room']) {
    await page.getByTestId(id).scrollIntoViewIfNeeded();
    await expect(page.getByTestId(id)).toBeInViewport();
  }
});

/** Checks that the hand and line strip on `page` come from the London map. */
async function expectLondonTable(page: Page) {
  await expect(page.getByTestId('hand').locator('.card')).toHaveCount(7);
  const cards = await page
    .getByTestId('hand')
    .locator('[data-card]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-card')!));
  expect(cards.every((id) => londonDeck.has(id))).toBe(true);
  // At least one card exists only in the London deck (shared ids are wilds and same-named actions).
  expect(cards.some((id) => !hongKongDeck.has(id)) || cards.every((id) => id.startsWith('wild:'))).toBe(true);
  const stops = await page
    .getByTestId('line-strip')
    .locator('[data-station]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-station')!));
  expect(stops.length).toBeGreaterThan(0);
  expect(stops.every((id) => id in london.stations)).toBe(true);
}

test('the host plays a round on the London map', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await host.goto('/');
  await host.getByTestId('play-online').click();
  await host.getByTestId('online-name').fill('Mei');
  await host.getByTestId('create-room').click();
  await expect(host.getByTestId('lobby-map-name')).toHaveText(networkById('hk-mtr')!.name.en);
  const link = await host.getByTestId('share-link').inputValue();

  await guest.goto(link);
  await guest.getByTestId('online-name').fill('Ka Ho');
  await guest.getByTestId('join-room').click();
  await expect(host.getByTestId('seat-1')).toContainText('Ka Ho');
  // Only the host gets the map picker.
  await expect(guest.getByTestId('lobby-map-picker')).toHaveCount(0);

  // The host picks London; the guest's lobby follows.
  await host.getByTestId(`lobby-map-${LONDON}`).click();
  await expect(host.getByTestId('lobby-map-name')).toHaveText(london.name.en);
  await expect(guest.getByTestId('lobby-map-name')).toHaveText(london.name.en);

  await host.getByTestId('start-online').click();
  await expectLondonTable(host);
  await expectLondonTable(guest);

  // A reload returns the guest to the London table.
  const before = await guest
    .getByTestId('hand')
    .locator('[data-card]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-card')));
  await guest.reload();
  await expectLondonTable(guest);
  expect(
    await guest
      .getByTestId('hand')
      .locator('[data-card]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-card'))),
  ).toEqual(before);

  await hostContext.close();
  await guestContext.close();
});

test('a room starts on the map chosen on the setup screen', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId(`map-${LONDON}`).click();
  await page.getByTestId('play-online').click();
  await page.getByTestId('online-name').fill('Mei');
  await page.getByTestId('create-room').click();
  await expect(page.getByTestId('lobby-map-name')).toHaveText(london.name.en);
  await expect(page.getByTestId(`lobby-map-${LONDON}`)).toHaveClass(/is-selected/);
});
