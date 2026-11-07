import { expect, test } from '@playwright/test';
import { playToEnd, startGame } from './helpers';

for (const lang of ['en', 'zh'] as const) {
  test(`plays a full seeded game against 1 computer (${lang})`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await startGame(page, { opponents: 1, seed: `full-${lang}`, lang });
    await expect(page.getByTestId('turn')).toHaveText(lang === 'zh' ? '輪到你' : 'Your turn');
    await playToEnd(page);
    const end = page.getByTestId('end-screen');
    await expect(end).toBeVisible();
    await expect(end.getByRole('heading')).toHaveText(
      lang === 'zh' ? /你贏了！|電腦 1贏了/ : /You win!|Computer 1 wins/,
    );
    const s = await page.evaluate(() => window.__metroTest!.getState());
    expect(s.phase).toBe('ended');
    expect(s.players.find((p) => p.id === s.winner)!.hand).toHaveLength(0);
    expect(errors).toEqual([]);
  });
}
