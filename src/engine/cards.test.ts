import { hongKongMtr } from '../data/hk-mtr';
import { loadNetwork } from '../data/network';
import { tinyDef } from '../data/tiny-network';
import { buildDeck, type Card } from './cards';
import { shuffle } from './rng';

const hk = loadNetwork(hongKongMtr);
const deck = buildDeck(hk);
const byKind = (k: Card['kind']) => deck.filter((c) => c.kind === k);

describe('buildDeck (Hong Kong)', () => {
  it('has one station card per station', () => {
    const stationCards = deck.filter((c) => c.kind === 'station' || c.kind === 'interchange');
    expect(stationCards).toHaveLength(Object.keys(hk.stations).length);
    expect(new Set(stationCards.map((c) => ('stationId' in c ? c.stationId : ''))).size).toBe(stationCards.length);
  });

  it('gives a single-line card its line and number (Chai Wan)', () => {
    const chaiWan = deck.find((c) => c.id === 'st:chai-wan');
    expect(chaiWan).toEqual({ id: 'st:chai-wan', kind: 'station', stationId: 'chai-wan', line: 'ISL', number: 13 });
  });

  it('gives a transfer station card its transfer lines (Hong Kong)', () => {
    expect(deck.find((c) => c.id === 'st:hong-kong')).toEqual({
      id: 'st:hong-kong',
      kind: 'station',
      stationId: 'hong-kong',
      line: 'TCL',
      number: 1,
      transferLines: ['ISL', 'TWL'],
    });
  });

  it('gives an interchange card all its lines and no number (Admiralty)', () => {
    const adm = deck.find((c) => c.id === 'st:admiralty')!;
    expect(adm.kind).toBe('interchange');
    expect(adm.kind === 'interchange' && [...adm.lines].sort()).toEqual(['EAL', 'ISL', 'SIL', 'TWL']);
    expect('number' in adm).toBe(false);
  });

  it('has one of each line action per line, without numbers', () => {
    const actions = byKind('action');
    expect(actions).toHaveLength(hk.lines.length * 3);
    for (const line of hk.lines) {
      for (const a of ['signal-fault', 'terminus', 'rush-hour']) {
        expect(actions.filter((c) => c.kind === 'action' && c.line === line.code && c.action === a)).toHaveLength(1);
      }
    }
    expect(actions.every((c) => !('number' in c))).toBe(true);
  });

  it('has 4 Octopus and 4 Typhoon Signal No. 8 cards', () => {
    const wilds = byKind('wild');
    expect(wilds.filter((c) => c.kind === 'wild' && c.wild === 'octopus')).toHaveLength(4);
    expect(wilds.filter((c) => c.kind === 'wild' && c.wild === 'typhoon')).toHaveLength(4);
  });

  it('totals 130 cards with unique ids (98 stations + 24 actions + 8 wilds)', () => {
    expect(deck).toHaveLength(130);
    expect(new Set(deck.map((c) => c.id)).size).toBe(130);
  });

  it('shuffles reproducibly by seed', () => {
    expect(shuffle(deck, 99)[0].map((c) => c.id)).toEqual(shuffle(deck, 99)[0].map((c) => c.id));
  });
});

describe('buildDeck (other networks)', () => {
  it('builds from any network', () => {
    const tiny = buildDeck(loadNetwork(tinyDef));
    expect(tiny.filter((c) => c.kind === 'interchange')).toHaveLength(1);
    expect(tiny).toHaveLength(6 + 2 * 3 + 8);
  });
});
