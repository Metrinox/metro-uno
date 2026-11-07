/**
 * Seeded pseudo-random numbers (mulberry32). The generator state is a single
 * 32-bit integer kept inside GameState, so every shuffle can be replayed.
 */

export type RngState = number;

/** Returns a float in [0, 1) and the next state. */
export function nextFloat(state: RngState): [number, RngState] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Fisher–Yates shuffle. Returns a new array and the next state; input is untouched. */
export function shuffle<T>(items: readonly T[], state: RngState): [T[], RngState] {
  const out = items.slice();
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    let r: number;
    [r, s] = nextFloat(s);
    const j = Math.floor(r * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return [out, s];
}

/** Turns any string or number into a 32-bit seed. */
export function seedFrom(value: string | number): RngState {
  const str = String(value);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h | 0;
}
