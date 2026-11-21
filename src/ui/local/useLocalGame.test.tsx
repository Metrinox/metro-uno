// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { buildDeck } from '../../engine/cards';
import { DEFAULT_RULES } from '../../engine/game';
import { networkById } from '../../data/networks';
import { HUMAN_ID, useLocalGame } from './useLocalGame';

const config = { opponents: 2, seed: 'local-test', rules: { ...DEFAULT_RULES }, map: 'hk-mtr' };
// A long pause so computer turns never run during the test.
const options = { aiDelay: [60_000, 60_000] as [number, number] };

describe('useLocalGame', () => {
  it('exposes only the human view and the seats', () => {
    const { result } = renderHook(() => useLocalGame(config, options));
    const { view, seats } = result.current;
    expect(view.me).toBe(HUMAN_ID);
    expect(view.hand).toHaveLength(7);
    expect(view).not.toHaveProperty('drawPile');
    expect(seats.map((s) => [s.id, s.kind, s.isMe, s.botNumber])).toEqual([
      ['p0', 'human', true, 0],
      ['ai1', 'bot', false, 1],
      ['ai2', 'bot', false, 2],
    ]);
  });

  it('logs a rejected move and leaves the game unchanged', () => {
    const { result } = renderHook(() => useLocalGame(config, options));
    const before = result.current.view;
    // Passing before drawing is never allowed.
    act(() => result.current.send({ type: 'pass' }));
    expect(result.current.view).toBe(before);
    expect(result.current.log.at(-1)).toMatchObject({ type: 'rejected', reason: 'cannot-pass' });
  });

  it('plays a round on the chosen map', () => {
    const london = networkById('london-underground')!;
    const londonIds = new Set(buildDeck(london).map((c) => c.id));
    const hkIds = new Set(buildDeck(networkById('hk-mtr')!).map((c) => c.id));
    // A small table, so the round can be dealt from any deck size.
    const londonConfig = { ...config, opponents: 1, rules: { ...DEFAULT_RULES, handSize: 5 }, map: 'london-underground' };
    const { result } = renderHook(() => useLocalGame(londonConfig, options));
    const { view } = result.current;
    expect(view.hand).toHaveLength(5);
    const cards = [...view.hand, view.topCard];
    for (const card of cards) expect(londonIds.has(card.id)).toBe(true);
    // At least one card is a London station card that Hong Kong's deck doesn't have.
    expect(cards.some((c) => c.id.startsWith('st:') && !hkIds.has(c.id))).toBe(true);
  });
});
