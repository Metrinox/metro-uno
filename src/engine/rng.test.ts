import { nextFloat, seedFrom, shuffle } from './rng';

describe('seeded rng', () => {
  const items = Array.from({ length: 50 }, (_, i) => i);

  it('gives the same order for the same seed', () => {
    expect(shuffle(items, 42)[0]).toEqual(shuffle(items, 42)[0]);
  });

  it('gives different orders for different seeds', () => {
    expect(shuffle(items, 1)[0]).not.toEqual(shuffle(items, 2)[0]);
  });

  it('keeps every item exactly once and leaves the input alone', () => {
    const copy = items.slice();
    const [out] = shuffle(items, 7);
    expect([...out].sort((a, b) => a - b)).toEqual(items);
    expect(items).toEqual(copy);
  });

  it('produces floats in [0, 1) and advances state', () => {
    let s = seedFrom('metro');
    for (let i = 0; i < 1000; i++) {
      const [r, next] = nextFloat(s);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
      expect(next).not.toBe(s);
      s = next;
    }
  });
});
