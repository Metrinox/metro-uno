import { expect, test } from '@playwright/test';
import { arrange, handCount, startGame } from './helpers';

test.describe('house rules', () => {
  test('setup shows the defaults', async ({ page }) => {
    await page.goto('/?seed=hr&aiDelay=0');
    await expect(page.getByTestId('hand-size')).toHaveText('7');
    await expect(page.getByTestId('rule-drawUntilPlayable')).not.toBeChecked();
    await expect(page.getByTestId('rule-playDrawnCard')).not.toBeChecked();
    await expect(page.getByTestId('rule-mixDrawStacking')).toBeChecked();
    await expect(page.getByTestId('rule-playSameNumbers')).toBeChecked();
    await expect(page.getByTestId('rule-playUntilLast')).toBeChecked();
  });

  test('starting cards changes the deal and is remembered', async ({ page }) => {
    await page.goto('/?seed=hr&aiDelay=60000');
    await page.getByRole('button', { name: 'Fewer starting cards' }).click();
    await page.getByRole('button', { name: 'Fewer starting cards' }).click();
    await expect(page.getByTestId('hand-size')).toHaveText('5');
    await page.getByTestId('start').click();
    await expect(page.getByTestId('hand').locator('.card')).toHaveCount(5);
    await expect(page.getByTestId('count-ai1')).toHaveText('5 cards');
    await page.reload();
    await expect(page.getByTestId('hand-size')).toHaveText('5');
  });

  test('"play the drawn card" is not applicable while drawing until playable', async ({ page }) => {
    await page.goto('/?seed=hr&aiDelay=0');
    await page.locator('label.rule', { has: page.getByTestId('rule-drawUntilPlayable') }).click();
    await expect(page.getByTestId('rule-drawUntilPlayable')).toBeChecked();
    await expect(page.getByTestId('rule-playDrawnCard')).toBeDisabled();
    await expect(page.getByTestId('house-rules')).toContainText('Not used when drawing until you can play');
    await page.reload();
    await expect(page.getByTestId('rule-drawUntilPlayable')).toBeChecked();
  });

  test('draw until playable: keeps drawing, then the card must be played', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000, rules: { drawUntilPlayable: true } });
    await arrange(page, {
      hands: { p0: ['st:jordan', 'st:whampoa'] },
      top: 'st:sai-ying-pun',
      drawTop: ['st:che-kung-temple', 'st:lam-tin', 'st:tai-koo'],
    });
    await page.getByTestId('draw').click();
    expect(await handCount(page)).toBe(5);
    await expect(page.getByTestId('pass')).toBeDisabled();
    await expect(page.getByTestId('turn')).toContainText('Play the card you drew.');
    await page.getByTestId('hand').locator('[data-card="st:jordan"]').click();
    await expect(page.getByTestId('log')).toContainText('You must play the card you drew.');
    await page.getByTestId('hand').locator('[data-card="st:tai-koo"]').click();
    await expect(page.getByTestId('discard-top')).toHaveAttribute('data-card', 'st:tai-koo');
  });

  test('a pending Rush Hour can be stacked, and Draw shows the total', async ({ page }) => {
    await startGame(page, { opponents: 1, aiDelay: 1500 });
    await arrange(page, {
      hands: { p0: ['act:rush-hour:KTL', 'st:jordan', 'st:whampoa'], ai1: ['act:rush-hour:ISL', 'st:hku', 'st:tin-hau'] },
      top: 'st:sai-ying-pun',
      turn: 1,
    });
    await expect(page.getByTestId('pending')).toContainText('2 cards coming your way');
    await expect(page.getByTestId('draw')).toHaveText('Draw 2');
    const hand = page.getByTestId('hand');
    await expect(hand.locator('[data-card="act:rush-hour:KTL"]')).toHaveClass(/is-playable/);
    await expect(hand.locator('[data-card="st:jordan"]')).not.toHaveClass(/is-playable/);
    await hand.locator('[data-card="act:rush-hour:KTL"]').click();
    // The computer can't stack, so it takes 4 and the turn comes back to the human.
    await expect(page.getByTestId('count-ai1')).toHaveText('6 cards');
    await expect(page.getByTestId('turn')).toHaveText('Your turn');
  });

  test('play same numbers together, ending on the chosen line', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000 });
    await arrange(page, { hands: { p0: ['st:sai-ying-pun', 'st:heng-on', 'st:jordan'] }, top: 'st:hku' });
    await page.getByTestId('hand').locator('[data-card="st:sai-ying-pun"]').click();
    const dialog = page.getByTestId('same-number');
    await expect(dialog).toContainText('Play other 3s too?');
    await expect(dialog.locator('[data-pick="st:heng-on"]')).toHaveAttribute('aria-pressed', 'true');
    await dialog.locator('[data-end="st:heng-on"]').check();
    await dialog.getByTestId('play-selected').click();
    await expect(page.getByTestId('discard-top')).toHaveAttribute('data-card', 'st:heng-on');
    await expect(page.getByTestId('current-line')).toHaveAttribute('data-line', 'TML');
    // Two cards played from three without calling UNO: 1 penalty card.
    expect(await handCount(page)).toBe(2);
  });

  test('same numbers off: a station card plays on its own', async ({ page }) => {
    await startGame(page, { aiDelay: 60_000, rules: { playSameNumbers: false } });
    await arrange(page, { hands: { p0: ['st:sai-ying-pun', 'st:heng-on', 'st:jordan'] }, top: 'st:hku' });
    await page.getByTestId('hand').locator('[data-card="st:sai-ying-pun"]').click();
    await expect(page.getByTestId('same-number')).toHaveCount(0);
    await expect(page.getByTestId('discard-top')).toHaveAttribute('data-card', 'st:sai-ying-pun');
  });
});
