import { chooseAction, chooseLine } from './ai';
import { applyAction, lineChoices, viewFor } from './game';
import { card, lu, scenario } from './test-helpers';

// None of these match ISL or the number 3 used below.
const filler = ['st:jordan', 'st:whampoa', 'st:kwai-fong'];

describe('chooseAction', () => {
  it('chooses the line it holds most of for a wild', () => {
    // Current line TML, face 20 (Siu Hong): nothing but the Octopus matches.
    const s = scenario({
      hands: [['wild:octopus:1', 'st:lok-fu', 'st:lam-tin', 'st:kwun-tong', 'st:hku'], filler],
      top: 'st:siu-hong',
    });
    expect(chooseAction(viewFor(s, 'p0'))).toEqual({ type: 'play', cardId: 'wild:octopus:1', chosenLines: ['KTL'] });
  });

  it('breaks line ties in network order', () => {
    expect(chooseLine([['TML'], ['ISL']], [card('st:hku'), card('st:heng-on')], ['ISL', 'TML'])).toEqual(['ISL']);
  });

  it('keeps wilds when a station card is playable', () => {
    const s = scenario({ hands: [['wild:octopus:1', 'st:tai-koo', 'st:jordan'], filler], top: 'st:sai-ying-pun' });
    expect(chooseAction(viewFor(s, 'p0'))).toMatchObject({ type: 'play', cardId: 'st:tai-koo' });
  });

  it('blocks a next player who is close to winning', () => {
    const s = scenario({
      hands: [['act:rush-hour:ISL', 'st:tai-koo', 'st:jordan'], ['st:hku']],
      top: 'st:sai-ying-pun',
    });
    expect(chooseAction(viewFor(s, 'p0'))).toMatchObject({ type: 'play', cardId: 'act:rush-hour:ISL' });
  });

  it('draws when nothing is playable, then plays a playable drawn card', () => {
    const s = scenario({ hands: [filler, filler], top: 'st:sai-ying-pun', drawPile: ['st:tai-koo'] });
    expect(chooseAction(viewFor(s, 'p0'))).toEqual({ type: 'draw' });
    const r = applyAction(s, 'p0', { type: 'draw' });
    if (!r.ok) throw new Error(r.reason);
    expect(chooseAction(viewFor(r.state, 'p0'))).toMatchObject({ type: 'play', cardId: 'st:tai-koo' });
  });

  it('always calls UNO when playing down to one card', () => {
    const s = scenario({ hands: [['st:tai-koo', 'st:jordan'], filler], top: 'st:sai-ying-pun' });
    const action = chooseAction(viewFor(s, 'p0'));
    expect(action).toMatchObject({ type: 'play', callUno: true });
    const r = applyAction(s, 'p0', action);
    expect(r.ok && r.events.some((e) => e.type === 'penalty')).toBe(false);
  });

  it('plays a 2-line interchange to its other line', () => {
    // On ISL 3, only Central is playable; it must go to TWL.
    const s = scenario({ hands: [['st:central', 'st:jordan', 'st:whampoa'], filler], top: 'st:sai-ying-pun' });
    const action = chooseAction(viewFor(s, 'p0'));
    expect(action).toMatchObject({ type: 'play', cardId: 'st:central', chosenLines: ['TWL'] });
    const r = applyAction(s, 'p0', action);
    expect(r.ok && r.state.currentLines).toEqual(['TWL']);
  });

  it('stacks a draw card when one is pending, saving the Typhoon', () => {
    const s = scenario({
      hands: [['wild:typhoon:1', 'act:rush-hour:KTL', 'st:jordan'], filler],
      top: 'act:rush-hour:ISL',
      pendingDraw: { count: 2, last: 'rush-hour' },
    });
    expect(chooseAction(viewFor(s, 'p0'))).toMatchObject({ type: 'play', cardId: 'act:rush-hour:KTL' });
  });

  it('takes the draw when it cannot stack (mixing off)', () => {
    const s = scenario({
      hands: [['wild:typhoon:1', 'st:jordan'], filler],
      top: 'act:rush-hour:ISL',
      pendingDraw: { count: 2, last: 'rush-hour' },
      rules: { mixDrawStacking: false },
    });
    expect(chooseAction(viewFor(s, 'p0'))).toEqual({ type: 'draw' });
  });

  it('plays all same-number station cards together, ending on its best line', () => {
    // ISL 3 is playable; TML 3 also held; two more TML cards make TML the best line.
    const s = scenario({
      hands: [['st:sai-ying-pun', 'st:heng-on', 'st:hin-keng', 'st:kai-tak'], filler],
      top: 'st:hku',
    });
    expect(chooseAction(viewFor(s, 'p0'))).toEqual({
      type: 'play',
      cardId: 'st:sai-ying-pun',
      extraCardIds: ['st:heng-on'],
    });
  });

  it('plays one card at a time when the rule is off', () => {
    const s = scenario({
      hands: [['st:sai-ying-pun', 'st:heng-on', 'st:hin-keng', 'st:kai-tak'], filler],
      top: 'st:hku',
      rules: { playSameNumbers: false },
    });
    expect(chooseAction(viewFor(s, 'p0'))).not.toHaveProperty('extraCardIds');
  });

  it('plays a drawn card it must play', () => {
    const s = scenario({
      hands: [filler, filler],
      top: 'st:sai-ying-pun',
      drawPile: ['st:che-kung-temple', 'st:tai-koo'],
      rules: { drawUntilPlayable: true },
    });
    const r = applyAction(s, 'p0', { type: 'draw' });
    if (!r.ok) throw new Error(r.reason);
    expect(chooseAction(viewFor(r.state, 'p0'))).toMatchObject({ type: 'play', cardId: 'st:tai-koo' });
  });

  it('plays Hong Kong with a Central line, choosing the one it holds most of', () => {
    const s = scenario({ hands: [['st:hong-kong', 'st:tai-koo', 'st:hku', 'st:jordan'], filler], top: 'st:kowloon' });
    const action = chooseAction(viewFor(s, 'p0'));
    expect(action).toMatchObject({ type: 'play', cardId: 'st:hong-kong', chosenLines: ['ISL'] });
    expect(applyAction(s, 'p0', action).ok).toBe(true);
  });

  it('scores an option of several shared-track lines by every card on any of them', () => {
    // On the Northern: one Piccadilly card, a Circle card (Sloane Square) and a Met card (Aldgate).
    const s = scenario({
      network: lu,
      hands: [['st:kings-cross-st-pancras', 'st:caledonian-road', 'st:sloane-square', 'st:aldgate'], ['st:borough', 'st:oval']],
      top: 'st:angel',
      face: { kind: 'none' },
    });
    expect(chooseAction(viewFor(s, 'p0'))).toEqual({
      type: 'play',
      cardId: 'st:kings-cross-st-pancras',
      chosenLines: ['CIR', 'H&C', 'MET'],
    });
    // Cards count on any line of the option, not just its first: Whitechapel (H&C) and
    // Finchley Road (Met) outnumber one Piccadilly card, though neither is on the Circle.
    const offCircle = ['st:whitechapel', 'st:finchley-road', 'st:caledonian-road'].map((id) => card(id, lu));
    const options = lineChoices(card('st:kings-cross-st-pancras', lu), viewFor(s, 'p0'))!;
    expect(chooseLine(options, offCircle, lu.lines.map((l) => l.code))).toEqual(['CIR', 'H&C', 'MET']);
    // With two Piccadilly cards and one subsurface card, it takes the Piccadilly.
    const rest = ['st:caledonian-road', 'st:holloway-road', 'st:sloane-square'].map((id) => card(id, lu));
    expect(chooseLine(options, rest, lu.lines.map((l) => l.code))).toEqual(['PIC']);
  });

  it('chooses a legal interchange line', () => {
    const s = scenario({ hands: [['st:admiralty', 'st:ocean-park', 'st:lei-tung'], filler], top: 'st:sai-ying-pun' });
    const action = chooseAction(viewFor(s, 'p0'));
    expect(action).toMatchObject({ type: 'play', cardId: 'st:admiralty', chosenLines: ['SIL'] });
  });
});
