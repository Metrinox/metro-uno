import type { Page } from '@playwright/test';
import type { HouseRules } from '../src/engine/game';

export interface Arrange {
  /** Exact hands by player id (p0 = human, ai1.. = computers). */
  hands?: Record<string, string[]>;
  /** Card to put on top of the discard pile. */
  top?: string;
  currentLine?: string;
  face?: { kind: 'number'; n: number } | { kind: 'none' } | { kind: 'action'; action: string };
  /** Cards to put on top of the draw pile, in order. */
  drawTop?: string[];
  turn?: number;
}

/** Starts a round from the setup screen with a fixed seed and no AI pause. */
export async function startGame(
  page: Page,
  opts: { opponents?: number; seed?: string; aiDelay?: number; lang?: 'en' | 'zh'; rules?: Partial<HouseRules> } = {},
) {
  if (opts.rules) {
    const rules = opts.rules;
    await page.addInitScript((r) => localStorage.setItem('metro-uno.rules', JSON.stringify(r)), rules);
  }
  await page.goto(`/?seed=${opts.seed ?? 'e2e'}&aiDelay=${opts.aiDelay ?? 0}`);
  if (opts.lang === 'zh') await page.locator('.segmented label', { hasText: '繁體中文' }).click();
  if (opts.opponents) await page.locator('.segmented label', { has: page.locator(`input[name="opponents"][value="${opts.opponents}"]`) }).click();
  await page.getByTestId('start').click();
  await page.getByTestId('hand').waitFor();
}

/**
 * Rearranges the live game through the dev-only test hook. Every card stays in
 * the game exactly once: named cards are moved, the rest keep their place.
 */
export async function arrange(page: Page, spec: Arrange) {
  await page.evaluate((spec) => {
    const hook = window.__metroTest!;
    const s = structuredClone(hook.getState());
    type C = (typeof s.drawPile)[number];
    const all = new Map<string, C>();
    for (const p of s.players) for (const c of p.hand) all.set(c.id, c);
    for (const c of [...s.drawPile, ...s.discard]) all.set(c.id, c);
    const take = (id: string) => {
      const c = all.get(id);
      if (!c) throw new Error(`card ${id} not available`);
      all.delete(id);
      return c;
    };
    const hands: Record<string, C[]> = {};
    for (const [pid, ids] of Object.entries(spec.hands ?? {})) hands[pid] = ids.map(take);
    const top = spec.top ? take(spec.top) : null;
    const drawTop = (spec.drawTop ?? []).map(take);
    for (const p of s.players) {
      p.hand = hands[p.id] ?? p.hand.filter((c) => all.has(c.id)).map((c) => take(c.id));
    }
    const oldTop = s.discard[s.discard.length - 1]!;
    const newTop = top ?? (all.has(oldTop.id) ? take(oldTop.id) : oldTop);
    s.discard = [newTop];
    s.drawPile = [...drawTop, ...all.values()];
    if (newTop.kind === 'station') {
      s.currentLine = newTop.line;
      s.face = { kind: 'number', n: newTop.number };
    } else if (newTop.kind === 'action') {
      s.currentLine = newTop.line;
      s.face = { kind: 'action', action: newTop.action };
    }
    if (spec.currentLine) s.currentLine = spec.currentLine;
    if (spec.face) s.face = spec.face as typeof s.face;
    s.turn = spec.turn ?? 0;
    s.drawnCardId = null;
    hook.setState(s);
  }, spec);
}

export const handCount = (page: Page) => page.getByTestId('hand').locator('.card').count();

/**
 * Plays the human's turns with a simple strategy until the round ends:
 * play the first playable card (choosing the first offered line), calling UNO
 * when available; otherwise draw, then play or pass.
 */
export async function playToEnd(page: Page, maxSteps = 4000) {
  const end = page.getByTestId('end-screen');
  for (let step = 0; step < maxSteps; step++) {
    if (await end.isVisible()) return;
    const mine = await page.evaluate(() => {
      const s = window.__metroTest!.getState();
      return s.phase === 'playing' && s.players[s.turn]!.id === 'p0';
    });
    if (!mine) {
      await page.waitForTimeout(5);
      continue;
    }
    const uno = page.getByTestId('uno');
    if (await uno.isEnabled()) {
      if ((await uno.getAttribute('aria-pressed')) !== 'true') await uno.click();
    }
    const playable = page.getByTestId('hand').locator('.card.is-playable');
    if ((await playable.count()) > 0) {
      await playable.first().click();
      const same = page.getByTestId('same-number');
      if (await same.isVisible()) await same.getByTestId('play-selected').click();
      const chooser = page.getByTestId('line-chooser');
      if (await chooser.isVisible()) await chooser.locator('.line-option').first().click();
    } else if (await page.getByTestId('pass').isEnabled()) {
      await page.getByTestId('pass').click();
    } else {
      await page.getByTestId('draw').click();
    }
  }
  throw new Error('Round did not finish');
}
