import type { HouseRules } from './game';
import { simulateRound } from './simulate';
import { hk } from './test-helpers';

// Max rounds (of 1,000) allowed to hit the safety limit. Only the default rules are held to a
// balance target; "draw until playable" makes rounds far longer (hands grow), which is a
// property of that house rule, not a rules bug.
const ruleSets: [string, Partial<HouseRules>, number][] = [
  ['default rules', {}, 10],
  ['all on', { drawUntilPlayable: true, playDrawnCard: true, mixDrawStacking: true, playSameNumbers: true, handSize: 10 }, 1000],
  ['all off', { drawUntilPlayable: false, playDrawnCard: false, mixDrawStacking: false, playSameNumbers: false, handSize: 3 }, 10],
  ['play drawn card', { playDrawnCard: true }, 10],
];

describe.each(ruleSets)('AI-only simulation (%s)', (_name, rules, maxLimitHits) => {
  it('plays 1,000 seeded rounds with no rejected actions', () => {
    let rejections = 0;
    let finished = 0;
    let hitLimit = 0;
    const started = Date.now();
    for (let seed = 0; seed < 1000; seed++) {
      const r = simulateRound(hk, 2 + (seed % 3), seed, rules);
      rejections += r.rejections;
      if (r.state.phase === 'ended') finished++;
      if (r.hitLimit) hitLimit++;
      // Cards are conserved: 130 in total.
      const total =
        r.state.drawPile.length + r.state.discard.length + r.state.players.reduce((n, p) => n + p.hand.length, 0);
      expect(total).toBe(130);
    }
    expect(rejections).toBe(0);
    // Spec: every round ends with a winner or reaches the safety turn limit.
    // Very long rounds are a balance concern (design.md Risks), not a rules bug.
    expect(finished + hitLimit).toBe(1000);
    expect(hitLimit).toBeLessThanOrEqual(maxLimitHits);
    expect(Date.now() - started).toBeLessThan(30_000);
  }, 60_000);
});
