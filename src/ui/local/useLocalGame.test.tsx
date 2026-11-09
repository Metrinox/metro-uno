// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { DEFAULT_RULES } from '../../engine/game';
import { HUMAN_ID, useLocalGame } from './useLocalGame';

const config = { opponents: 2, seed: 'local-test', rules: { ...DEFAULT_RULES } };
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
});
