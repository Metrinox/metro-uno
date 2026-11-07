import { applyAction, createGame, isPlayable, lineChoices, normalizeRules, viewFor, type Action, type GameState } from './game';
import { card, hk, scenario } from './test-helpers';

const ok = (s: GameState, player: string, action: Action) => {
  const r = applyAction(s, player, action);
  if (!r.ok) throw new Error(`Rejected: ${r.reason}`);
  return r;
};

// ISL 3 = Sai Ying Pun, ISL 9 = Tai Koo, TML 3 = Heng On, TML 8 = Che Kung Temple, KTL 5 = Choi Hung
const filler = ['st:jordan', 'st:whampoa', 'st:olympic'];

describe('isPlayable', () => {
  const isl3 = { kind: 'number', n: 3 } as const;

  it('matches by line', () => {
    expect(isPlayable(card('st:tai-koo'), 'ISL', isl3)).toBe(true);
  });
  it('matches by number on another line', () => {
    expect(isPlayable(card('st:heng-on'), 'ISL', isl3)).toBe(true);
  });
  it('rejects a different line and number', () => {
    expect(isPlayable(card('st:che-kung-temple'), 'ISL', isl3)).toBe(false);
  });
  it('matches an interchange only by its lines', () => {
    expect(isPlayable(card('st:admiralty'), 'ISL', isl3)).toBe(true);
    expect(isPlayable(card('st:admiralty'), 'KTL', isl3)).toBe(false);
  });
  it('matches a line action by line or by action type', () => {
    expect(isPlayable(card('act:signal-fault:ISL'), 'ISL', isl3)).toBe(true);
    expect(isPlayable(card('act:signal-fault:TWL'), 'ISL', { kind: 'action', action: 'signal-fault' })).toBe(true);
    expect(isPlayable(card('act:signal-fault:TWL'), 'ISL', { kind: 'action', action: 'terminus' })).toBe(false);
    expect(isPlayable(card('act:signal-fault:TWL'), 'ISL', isl3)).toBe(false);
  });
  it('always allows wilds', () => {
    expect(isPlayable(card('wild:octopus:1'), 'KTL', { kind: 'none' })).toBe(true);
    expect(isPlayable(card('wild:typhoon:1'), 'TML', isl3)).toBe(true);
  });
  it('offers the right line choices', () => {
    const all = hk.lines.map((l) => l.code);
    // Interchanges never offer the current line.
    expect(lineChoices(card('st:admiralty'), all, 'ISL')).toEqual(['TWL', 'EAL', 'SIL']);
    expect(lineChoices(card('st:north-point'), all, 'ISL')).toEqual(['TKL']);
    expect(lineChoices(card('wild:octopus:1'), ['A', 'B'], 'A')).toEqual(['A', 'B']);
    expect(lineChoices(card('st:tai-koo'), ['A'], 'A')).toBeNull();
  });
});

describe('createGame', () => {
  const players = [0, 1, 2, 3].map((i) => ({ id: `p${i}`, name: `P${i}`, isHuman: i === 0 }));

  it('deals 7 each and starts on a single-line station card', () => {
    for (const seed of [1, 2, 3, 'abc', 'xyz']) {
      const g = createGame({ network: hk, players, seed });
      expect(g.players.map((p) => p.hand.length)).toEqual([7, 7, 7, 7]);
      const top = g.discard[0]!;
      expect(g.discard).toHaveLength(1);
      expect(top.kind).toBe('station');
      if (top.kind === 'station') {
        expect(g.currentLine).toBe(top.line);
        expect(g.face).toEqual({ kind: 'number', n: top.number });
      }
      expect(g.drawPile.length + 28 + 1).toBe(130);
    }
  });

  it('is reproducible by seed', () => {
    expect(createGame({ network: hk, players, seed: 9 })).toEqual(createGame({ network: hk, players, seed: 9 }));
  });

  it('requires 2–4 players', () => {
    expect(() => createGame({ network: hk, players: players.slice(0, 1), seed: 1 })).toThrow();
    expect(() => createGame({ network: hk, players: [...players, { id: 'p4', name: 'P4', isHuman: false }], seed: 1 })).toThrow();
  });
});

describe('playing station cards', () => {
  it('sets line and face (Kwun Tong 5)', () => {
    const s = scenario({ hands: [['st:choi-hung', ...filler], filler], top: 'st:kowloon-bay' });
    const r = ok(s, 'p0', { type: 'play', cardId: 'st:choi-hung' });
    expect(r.state.currentLine).toBe('KTL');
    expect(r.state.face).toEqual({ kind: 'number', n: 5 });
  });

  it('changes line on a number match', () => {
    const s = scenario({ hands: [['st:heng-on', ...filler], filler], top: 'st:sai-ying-pun' });
    const r = ok(s, 'p0', { type: 'play', cardId: 'st:heng-on' });
    expect(r.state.currentLine).toBe('TML');
    expect(r.events).toContainEqual({ type: 'lineChanged', player: 'p0', line: 'TML' });
  });

  it('rejects a non-matching card and leaves state unchanged', () => {
    const s = scenario({ hands: [['st:che-kung-temple', ...filler], filler], top: 'st:sai-ying-pun' });
    const before = structuredClone(s);
    const r = applyAction(s, 'p0', { type: 'play', cardId: 'st:che-kung-temple' });
    expect(r).toEqual({ ok: false, reason: 'not-playable' });
    expect(s).toEqual(before);
  });
});

describe('interchange plays', () => {
  it('lets the player choose among its lines; face becomes none', () => {
    const s = scenario({ hands: [['st:admiralty', ...filler], filler], top: 'st:sai-ying-pun' });
    const r = ok(s, 'p0', { type: 'play', cardId: 'st:admiralty', chosenLine: 'SIL' });
    expect(r.state.currentLine).toBe('SIL');
    expect(r.state.face).toEqual({ kind: 'none' });
  });

  it('changes a 2-line interchange to its other line without a choice', () => {
    const s = scenario({ hands: [['st:north-point', ...filler], filler], top: 'st:sai-ying-pun' });
    const r = ok(s, 'p0', { type: 'play', cardId: 'st:north-point' });
    expect(r.state.currentLine).toBe('TKL');
    expect(r.state.face).toEqual({ kind: 'none' });
  });

  it('cannot stay on the current line', () => {
    const s = scenario({ hands: [['st:admiralty', ...filler], filler], top: 'st:sai-ying-pun' });
    const before = structuredClone(s);
    expect(applyAction(s, 'p0', { type: 'play', cardId: 'st:admiralty', chosenLine: 'ISL' })).toEqual({
      ok: false,
      reason: 'invalid-line',
    });
    expect(applyAction(s, 'p0', { type: 'play', cardId: 'st:central', chosenLine: 'ISL' })).toEqual({
      ok: false,
      reason: 'card-not-in-hand',
    });
    expect(s).toEqual(before);
  });

  it('cannot be played off its lines', () => {
    const s = scenario({ hands: [['st:admiralty', ...filler], filler], top: 'st:choi-hung' });
    expect(applyAction(s, 'p0', { type: 'play', cardId: 'st:admiralty', chosenLine: 'ISL' })).toEqual({
      ok: false,
      reason: 'not-playable',
    });
  });

  it('rejects a line the station is not on, or no choice', () => {
    const s = scenario({ hands: [['st:admiralty', ...filler], filler], top: 'st:sai-ying-pun' });
    expect(applyAction(s, 'p0', { type: 'play', cardId: 'st:admiralty', chosenLine: 'KTL' })).toEqual({
      ok: false,
      reason: 'invalid-line',
    });
    expect(applyAction(s, 'p0', { type: 'play', cardId: 'st:admiralty' })).toEqual({
      ok: false,
      reason: 'line-choice-required',
    });
  });
});

describe('action cards', () => {
  it('matches an action by type and changes line', () => {
    const s = scenario({
      hands: [['act:signal-fault:TWL', ...filler], filler, filler],
      top: 'act:signal-fault:ISL',
      currentLine: 'ISL',
      face: { kind: 'action', action: 'signal-fault' },
    });
    const r = ok(s, 'p0', { type: 'play', cardId: 'act:signal-fault:TWL' });
    expect(r.state.currentLine).toBe('TWL');
    expect(r.state.face).toEqual({ kind: 'action', action: 'signal-fault' });
  });

  it('Signal Fault skips the next player', () => {
    const s = scenario({ hands: [['act:signal-fault:ISL', ...filler], filler, filler] });
    const r = ok(s, 'p0', { type: 'play', cardId: 'act:signal-fault:ISL' });
    expect(r.state.turn).toBe(2);
    expect(r.events).toContainEqual({ type: 'skipped', player: 'p1' });
  });

  it('Terminus reverses direction', () => {
    const s = scenario({ hands: [['act:terminus:ISL', ...filler], filler, filler] });
    const r = ok(s, 'p0', { type: 'play', cardId: 'act:terminus:ISL' });
    expect(r.state.direction).toBe(-1);
    expect(r.state.turn).toBe(2);
  });

  it('Terminus with 2 players gives the same player another turn', () => {
    const s = scenario({ hands: [['act:terminus:ISL', ...filler], filler] });
    const r = ok(s, 'p0', { type: 'play', cardId: 'act:terminus:ISL' });
    expect(r.state.turn).toBe(0);
  });

  it('Rush Hour makes the next player draw 2 and lose their turn', () => {
    const s = scenario({
      hands: [['act:rush-hour:ISL', ...filler], filler, filler],
      drawPile: ['st:lok-fu', 'st:lam-tin', 'st:kwun-tong'],
    });
    const r = ok(s, 'p0', { type: 'play', cardId: 'act:rush-hour:ISL' });
    expect(r.state.players[1]!.hand).toHaveLength(5);
    expect(r.state.turn).toBe(2);
  });
});

describe('wild cards', () => {
  it('Octopus sets any line with face none', () => {
    const s = scenario({ hands: [['wild:octopus:1', ...filler], filler] });
    const r = ok(s, 'p0', { type: 'play', cardId: 'wild:octopus:1', chosenLine: 'EAL' });
    expect(r.state.currentLine).toBe('EAL');
    expect(r.state.face).toEqual({ kind: 'none' });
  });

  it('Typhoon Signal No. 8 makes the next player draw 4 and lose their turn', () => {
    const s = scenario({
      hands: [['wild:typhoon:1', ...filler], filler, filler],
      drawPile: ['st:lok-fu', 'st:lam-tin', 'st:kwun-tong', 'st:hku', 'st:tin-hau'],
    });
    const r = ok(s, 'p0', { type: 'play', cardId: 'wild:typhoon:1', chosenLine: 'TML' });
    expect(r.state.players[1]!.hand).toHaveLength(7);
    expect(r.state.turn).toBe(2);
    expect(r.state.currentLine).toBe('TML');
  });

  it('rejects an unknown line', () => {
    const s = scenario({ hands: [['wild:octopus:1', ...filler], filler] });
    expect(applyAction(s, 'p0', { type: 'play', cardId: 'wild:octopus:1', chosenLine: 'XXX' })).toEqual({
      ok: false,
      reason: 'invalid-line',
    });
  });
});

describe('drawing', () => {
  it('draws an unplayable card and passes the turn', () => {
    const s = scenario({ hands: [filler, filler], top: 'st:sai-ying-pun', drawPile: ['st:che-kung-temple'] });
    const r = ok(s, 'p0', { type: 'draw' });
    expect(r.state.players[0]!.hand).toHaveLength(4);
    expect(r.state.turn).toBe(1);
  });

  it('draws one and passes even when it is playable (default)', () => {
    const s = scenario({ hands: [filler, filler], top: 'st:sai-ying-pun', drawPile: ['st:tai-koo'] });
    const r = ok(s, 'p0', { type: 'draw' });
    expect(r.state.turn).toBe(1);
    expect(r.state.players[0]!.hand.map((c) => c.id)).toContain('st:tai-koo');
  });

  it('may play the drawn card when "play the drawn card" is on', () => {
    const s = scenario({
      hands: [filler, filler],
      top: 'st:sai-ying-pun',
      drawPile: ['st:tai-koo'],
      rules: { playDrawnCard: true },
    });
    const r = ok(s, 'p0', { type: 'draw' });
    expect(r.state.turn).toBe(0);
    expect(r.state.drawnCardId).toBe('st:tai-koo');
    expect(applyAction(r.state, 'p0', { type: 'play', cardId: 'st:jordan' })).toMatchObject({
      ok: false,
      reason: 'must-play-drawn-card-or-pass',
    });
    expect(applyAction(r.state, 'p0', { type: 'draw' })).toMatchObject({ ok: false, reason: 'already-drew' });
    const played = ok(r.state, 'p0', { type: 'play', cardId: 'st:tai-koo' });
    expect(played.state.turn).toBe(1);
  });

  it('may keep the drawn card and pass when "play the drawn card" is on', () => {
    const s = scenario({
      hands: [filler, filler],
      top: 'st:sai-ying-pun',
      drawPile: ['st:tai-koo'],
      rules: { playDrawnCard: true },
    });
    const r = ok(ok(s, 'p0', { type: 'draw' }).state, 'p0', { type: 'pass' });
    expect(r.state.players[0]!.hand.map((c) => c.id)).toContain('st:tai-koo');
    expect(r.state.turn).toBe(1);
  });

  it('draws until playable, then must play that card', () => {
    const s = scenario({
      hands: [filler, filler],
      top: 'st:sai-ying-pun',
      drawPile: ['st:che-kung-temple', 'st:lam-tin', 'st:tai-koo', 'st:hku'],
      rules: { drawUntilPlayable: true },
    });
    const r = ok(s, 'p0', { type: 'draw' });
    expect(r.state.players[0]!.hand).toHaveLength(6);
    expect(r.events).toContainEqual({ type: 'drew', player: 'p0', count: 3, reason: 'turn' });
    expect(r.state.drawnCardId).toBe('st:tai-koo');
    expect(r.state.turn).toBe(0);
    expect(applyAction(r.state, 'p0', { type: 'pass' })).toEqual({ ok: false, reason: 'must-play-drawn-card' });
    expect(applyAction(r.state, 'p0', { type: 'play', cardId: 'st:jordan' })).toEqual({
      ok: false,
      reason: 'must-play-drawn-card',
    });
    expect(ok(r.state, 'p0', { type: 'play', cardId: 'st:tai-koo' }).state.turn).toBe(1);
  });

  it('draws until playable takes every card left when none is playable', () => {
    const s = scenario({
      hands: [filler, filler],
      top: 'st:sai-ying-pun',
      drawPile: ['st:che-kung-temple', 'st:lam-tin'],
      rules: { drawUntilPlayable: true },
    });
    const r = ok(s, 'p0', { type: 'draw' });
    expect(r.state.players[0]!.hand).toHaveLength(5);
    expect(r.state.turn).toBe(1);
  });

  it('cannot pass without drawing', () => {
    const s = scenario({ hands: [filler, filler] });
    expect(applyAction(s, 'p0', { type: 'pass' })).toEqual({ ok: false, reason: 'cannot-pass' });
  });

  it('reshuffles the discard pile (except the top) when the draw pile is empty', () => {
    const below = ['st:hku', 'st:tin-hau', 'st:lok-fu', 'st:lam-tin', 'st:kwun-tong', 'st:austin', 'st:shek-mun', 'st:heng-on', 'st:kai-tak'];
    const s = scenario({ hands: [filler, filler], top: 'st:sai-ying-pun', discardBelow: below });
    const r = ok(s, 'p0', { type: 'draw' });
    expect(r.state.discard.map((c) => c.id)).toEqual(['st:sai-ying-pun']);
    expect(r.state.drawPile.length + 1).toBe(9);
    expect(r.state.players[0]!.hand).toHaveLength(4);
    expect(r.events).toContainEqual({ type: 'reshuffled', count: 9 });
  });

  it('skips the draw when no cards are left anywhere', () => {
    const s = scenario({ hands: [filler, filler] });
    const r = ok(s, 'p0', { type: 'draw' });
    expect(r.state.players[0]!.hand).toHaveLength(3);
    expect(r.state.turn).toBe(1);
  });
});

describe('UNO call', () => {
  const s = () =>
    scenario({ hands: [['st:tai-koo', 'st:jordan'], filler], top: 'st:sai-ying-pun', drawPile: ['st:lok-fu', 'st:lam-tin'] });

  it('no penalty when called', () => {
    const r = ok(s(), 'p0', { type: 'play', cardId: 'st:tai-koo', callUno: true });
    expect(r.state.players[0]!.hand).toHaveLength(1);
    expect(r.events).toContainEqual({ type: 'unoCalled', player: 'p0' });
  });

  it('1 penalty card when missed', () => {
    const r = ok(s(), 'p0', { type: 'play', cardId: 'st:tai-koo' });
    expect(r.state.players[0]!.hand).toHaveLength(2);
    expect(r.events).toContainEqual({ type: 'penalty', player: 'p0', count: 1 });
  });
});

describe('winning', () => {
  it('ends the round when a player plays their last card', () => {
    const s = scenario({ hands: [['st:tai-koo'], filler], top: 'st:sai-ying-pun' });
    const r = ok(s, 'p0', { type: 'play', cardId: 'st:tai-koo' });
    expect(r.state.phase).toBe('ended');
    expect(r.state.winner).toBe('p0');
    expect(applyAction(r.state, 'p1', { type: 'draw' })).toEqual({ ok: false, reason: 'game-over' });
  });

  it('still applies the final card’s effect on others', () => {
    const s = scenario({ hands: [['act:rush-hour:ISL'], filler], drawPile: ['st:lok-fu', 'st:lam-tin'] });
    const r = ok(s, 'p0', { type: 'play', cardId: 'act:rush-hour:ISL' });
    expect(r.state.players[1]!.hand).toHaveLength(5);
    expect(r.state.winner).toBe('p0');
  });
});

describe('rejections leave state unchanged', () => {
  const cases: [string, Action, string][] = [
    ['p1', { type: 'play', cardId: 'st:jordan' }, 'not-your-turn'],
    ['p9', { type: 'draw' }, 'unknown-player'],
    ['p0', { type: 'play', cardId: 'st:lok-fu' }, 'card-not-in-hand'],
    ['p0', { type: 'play', cardId: 'st:jordan' }, 'not-playable'],
    ['p0', { type: 'play', cardId: 'st:admiralty', chosenLine: 'KTL' }, 'invalid-line'],
  ];
  it.each(cases)('%s %j → %s', (player, action, reason) => {
    const s = scenario({ hands: [['st:admiralty', ...filler], filler], top: 'st:sai-ying-pun', drawPile: ['st:hku'] });
    const before = structuredClone(s);
    expect(applyAction(s, player, action)).toEqual({ ok: false, reason });
    expect(s).toEqual(before);
  });
});

describe('viewFor', () => {
  it('shows own hand and counts only for others, and hides the draw pile order', () => {
    const s = scenario({ hands: [['st:admiralty', ...filler], ['st:hku', 'st:tin-hau']], drawPile: ['st:lok-fu'] });
    const v = viewFor(s, 'p0');
    const json = JSON.stringify(v);
    expect(v.hand.map((c) => c.id)).toEqual(['st:admiralty', ...filler]);
    expect(v.players[1]).toEqual({ id: 'p1', name: 'P1', isHuman: false, cardCount: 2 });
    expect(json).not.toContain('st:hku');
    expect(json).not.toContain('st:tin-hau');
    expect(json).not.toContain('st:lok-fu');
    expect(v.drawPileCount).toBe(1);
  });
});

describe('house rules', () => {
  it('deals the chosen hand size and defaults to 7', () => {
    const players = [0, 1].map((i) => ({ id: `p${i}`, name: `P${i}`, isHuman: i === 0 }));
    expect(createGame({ network: hk, players, seed: 1 }).players[0]!.hand).toHaveLength(7);
    expect(createGame({ network: hk, players, seed: 1, rules: { handSize: 5 } }).players[1]!.hand).toHaveLength(5);
    expect(createGame({ network: hk, players, seed: 1, rules: { handSize: 99 } }).rules.handSize).toBe(15);
  });

  it('has the agreed defaults', () => {
    expect(normalizeRules()).toEqual({
      handSize: 7,
      drawUntilPlayable: false,
      playDrawnCard: false,
      mixDrawStacking: true,
      playSameNumbers: true,
    });
  });
});

describe('draw stacking', () => {
  const pending2 = { count: 2, last: 'rush-hour' } as const;

  it('stacks Rush Hour on Rush Hour (any line)', () => {
    const s = scenario({
      hands: [['act:rush-hour:KTL', ...filler], filler, filler],
      top: 'act:rush-hour:ISL',
      pendingDraw: pending2,
      drawPile: ['st:hku', 'st:tin-hau', 'st:lok-fu', 'st:lam-tin'],
    });
    const r = ok(s, 'p0', { type: 'play', cardId: 'act:rush-hour:KTL' });
    // p1 holds nothing to stack, so they take all 4 and p2 plays next.
    expect(r.state.players[1]!.hand).toHaveLength(7);
    expect(r.state.pendingDraw).toBeNull();
    expect(r.state.turn).toBe(2);
    expect(r.events).toContainEqual({ type: 'drew', player: 'p1', count: 4, reason: 'stack' });
  });

  it('passes the stack on when the next player can stack', () => {
    const s = scenario({
      hands: [['act:rush-hour:KTL', ...filler], ['act:rush-hour:TML', ...filler], filler],
      top: 'act:rush-hour:ISL',
      pendingDraw: pending2,
    });
    const r = ok(s, 'p0', { type: 'play', cardId: 'act:rush-hour:KTL' });
    expect(r.state.pendingDraw).toEqual({ count: 4, last: 'rush-hour' });
    expect(r.state.turn).toBe(1);
  });

  it('allows mixing a Typhoon on a Rush Hour by default', () => {
    const s = scenario({
      hands: [['wild:typhoon:1', ...filler], ['act:rush-hour:TML', ...filler], filler],
      top: 'act:rush-hour:ISL',
      pendingDraw: pending2,
    });
    const r = ok(s, 'p0', { type: 'play', cardId: 'wild:typhoon:1', chosenLine: 'EAL' });
    expect(r.state.pendingDraw).toEqual({ count: 6, last: 'typhoon' });
    expect(r.state.currentLine).toBe('EAL');
  });

  it('rejects mixing when "mix +2 and +4" is off', () => {
    const s = scenario({
      hands: [['wild:typhoon:1', ...filler], filler],
      top: 'act:rush-hour:ISL',
      pendingDraw: pending2,
      rules: { mixDrawStacking: false },
    });
    expect(applyAction(s, 'p0', { type: 'play', cardId: 'wild:typhoon:1', chosenLine: 'EAL' })).toEqual({
      ok: false,
      reason: 'not-playable',
    });
  });

  it('only stack cards are playable while a draw is pending', () => {
    const s = scenario({ hands: [['st:tai-koo', ...filler], filler], top: 'act:rush-hour:ISL', pendingDraw: pending2 });
    expect(applyAction(s, 'p0', { type: 'play', cardId: 'st:tai-koo' })).toEqual({ ok: false, reason: 'not-playable' });
  });

  it('taking the draw draws the total and passes the turn', () => {
    const s = scenario({
      hands: [['act:rush-hour:KTL', ...filler], filler, filler],
      top: 'act:rush-hour:ISL',
      pendingDraw: { count: 4, last: 'rush-hour' },
      drawPile: ['st:hku', 'st:tin-hau', 'st:lok-fu', 'st:lam-tin'],
    });
    const r = ok(s, 'p0', { type: 'draw' });
    expect(r.state.players[0]!.hand).toHaveLength(8);
    expect(r.state.pendingDraw).toBeNull();
    expect(r.state.turn).toBe(1);
  });
});

describe('playing same numbers together', () => {
  it('plays two threes and ends on the last one', () => {
    const s = scenario({ hands: [['st:sai-ying-pun', 'st:heng-on', ...filler], filler], top: 'st:hku' });
    const r = ok(s, 'p0', { type: 'play', cardId: 'st:sai-ying-pun', extraCardIds: ['st:heng-on'] });
    expect(r.state.discard.slice(-2).map((c) => c.id)).toEqual(['st:sai-ying-pun', 'st:heng-on']);
    expect(r.state.currentLine).toBe('TML');
    expect(r.state.face).toEqual({ kind: 'number', n: 3 });
    expect(r.state.players[0]!.hand).toHaveLength(3);
  });

  it('is rejected when the rule is off', () => {
    const s = scenario({
      hands: [['st:sai-ying-pun', 'st:heng-on', ...filler], filler],
      top: 'st:hku',
      rules: { playSameNumbers: false },
    });
    expect(applyAction(s, 'p0', { type: 'play', cardId: 'st:sai-ying-pun', extraCardIds: ['st:heng-on'] })).toEqual({
      ok: false,
      reason: 'cannot-play-together',
    });
  });

  it('is rejected for different numbers or non-station cards', () => {
    const s = scenario({ hands: [['st:sai-ying-pun', 'st:sheung-wan', 'st:admiralty', ...filler], filler], top: 'st:hku' });
    for (const extra of ['st:sheung-wan', 'st:admiralty', 'st:sai-ying-pun']) {
      expect(applyAction(s, 'p0', { type: 'play', cardId: 'st:sai-ying-pun', extraCardIds: [extra] })).toEqual({
        ok: false,
        reason: 'cannot-play-together',
      });
    }
  });

  it('counts all cards for UNO', () => {
    const s = scenario({ hands: [['st:sai-ying-pun', 'st:heng-on', 'st:jordan'], filler], top: 'st:hku' });
    const r = ok(s, 'p0', { type: 'play', cardId: 'st:sai-ying-pun', extraCardIds: ['st:heng-on'] });
    // 3 cards, 2 played without calling UNO: 1 left, so the penalty applies.
    expect(r.events.some((e) => e.type === 'penalty' && e.player === 'p0')).toBe(true);
  });
});

describe('walkway transfers', () => {
  it('Hong Kong switches to the chosen Central line and keeps its number', () => {
    const s = scenario({ hands: [['st:hong-kong', ...filler], filler], top: 'st:kowloon' });
    const r = ok(s, 'p0', { type: 'play', cardId: 'st:hong-kong', chosenLine: 'TWL' });
    expect(r.state.currentLine).toBe('TWL');
    expect(r.state.face).toEqual({ kind: 'number', n: 1 });
  });

  it('Hong Kong needs a choice and only offers ISL or TWL', () => {
    const s = scenario({ hands: [['st:hong-kong', ...filler], filler], top: 'st:kowloon' });
    expect(applyAction(s, 'p0', { type: 'play', cardId: 'st:hong-kong' })).toEqual({
      ok: false,
      reason: 'line-choice-required',
    });
    expect(applyAction(s, 'p0', { type: 'play', cardId: 'st:hong-kong', chosenLine: 'TCL' })).toEqual({
      ok: false,
      reason: 'invalid-line',
    });
  });

  it('Hong Kong can be played by number', () => {
    // Kennedy Town is ISL 1.
    const s = scenario({ hands: [['st:hong-kong', ...filler], filler], top: 'st:kennedy-town' });
    const r = ok(s, 'p0', { type: 'play', cardId: 'st:hong-kong', chosenLine: 'ISL' });
    expect(r.state.currentLine).toBe('ISL');
    expect(r.state.face).toEqual({ kind: 'number', n: 1 });
  });

  it('Central offers its other line and the Tung Chung Line, but is not playable on TCL', () => {
    expect(lineChoices(card('st:central'), hk.lines.map((l) => l.code), 'ISL')).toEqual(['TWL', 'TCL']);
    const s = scenario({ hands: [['st:central', ...filler], filler], top: 'st:sai-ying-pun' });
    const r = ok(s, 'p0', { type: 'play', cardId: 'st:central', chosenLine: 'TCL' });
    expect(r.state.currentLine).toBe('TCL');
    expect(r.state.face).toEqual({ kind: 'none' });
    expect(isPlayable(card('st:central'), 'TCL', { kind: 'none' })).toBe(false);
  });

  it('East TST switches to the Tsuen Wan Line automatically, and TST to Tuen Ma', () => {
    // Austin is TML 14, so East TST (TML 13) matches by line.
    const s = scenario({ hands: [['st:east-tsim-sha-tsui', ...filler], filler], top: 'st:austin' });
    const r = ok(s, 'p0', { type: 'play', cardId: 'st:east-tsim-sha-tsui' });
    expect(r.state.currentLine).toBe('TWL');
    expect(r.state.face).toEqual({ kind: 'number', n: 13 });
    const s2 = scenario({ hands: [['st:tsim-sha-tsui', ...filler], filler], top: 'st:sham-shui-po' });
    expect(ok(s2, 'p0', { type: 'play', cardId: 'st:tsim-sha-tsui' }).state.currentLine).toBe('TML');
  });
});
