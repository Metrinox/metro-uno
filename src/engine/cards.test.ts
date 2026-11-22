import { hongKongMtr } from '../data/hk-mtr';
import { londonUnderground } from '../data/london-underground';
import { loadNetwork } from '../data/network';
import { tinyDef } from '../data/tiny-network';
import { buildDeck, cardLines, type Card } from './cards';
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

describe('buildDeck (London Underground)', () => {
  const lu = loadNetwork(londonUnderground);
  const luDeck = buildDeck(lu);
  const s = Object.keys(lu.stations).length;

  it('has S station cards, one per station', () => {
    const stationCards = luDeck.filter((c) => c.kind === 'station' || c.kind === 'interchange');
    expect(stationCards).toHaveLength(s);
    expect(new Set(stationCards.map((c) => ('stationId' in c ? c.stationId : ''))).size).toBe(s);
  });

  it('has 30 action cards, one of each action per line', () => {
    const actions = luDeck.filter((c) => c.kind === 'action');
    expect(lu.lines).toHaveLength(10);
    expect(actions).toHaveLength(30);
    for (const line of lu.lines) {
      for (const a of ['signal-fault', 'terminus', 'rush-hour']) {
        expect(actions.filter((c) => c.kind === 'action' && c.line === line.code && c.action === a)).toHaveLength(1);
      }
    }
  });

  it('has 4 Oyster and 4 Tube Strike cards, with the same engine roles as Hong Kong', () => {
    const wilds = luDeck.filter((c) => c.kind === 'wild');
    expect(wilds.filter((c) => c.kind === 'wild' && c.wild === 'octopus')).toHaveLength(4);
    expect(wilds.filter((c) => c.kind === 'wild' && c.wild === 'typhoon')).toHaveLength(4);
    expect(wilds).toEqual(byKind('wild'));
    expect([lu.wilds.wild.name.en, lu.wilds.draw4.name.en]).toEqual(['Oyster', 'Tube Strike']);
  });

  it('totals S + 30 + 8 cards with unique ids', () => {
    expect(luDeck).toHaveLength(s + 30 + 8);
    expect(new Set(luDeck.map((c) => c.id)).size).toBe(luDeck.length);
  });

  const card = (id: string) => luDeck.find((c) => c.id === `st:${id}`)!;

  it('gives a multi-line station card all its lines and its number (Goldhawk Road, Aldgate)', () => {
    expect(card('goldhawk-road')).toEqual({
      id: 'st:goldhawk-road',
      kind: 'station',
      stationId: 'goldhawk-road',
      line: 'CIR',
      lines: ['CIR', 'H&C'],
      number: 2,
    });
    expect(card('aldgate')).toMatchObject({ kind: 'station', lines: ['CIR', 'MET'], number: 5 });
    // Shared-track order, not network order: H&C before the District.
    expect(card('whitechapel')).toMatchObject({ lines: ['H&C', 'DIS'], number: 2 });
    expect(cardLines(card('goldhawk-road'))).toEqual(['CIR', 'H&C']);
    expect(cardLines(card('parsons-green'))).toEqual(['DIS']);
  });

  it('makes Victoria an interchange card with no number', () => {
    expect(card('victoria')).toEqual({ id: 'st:victoria', kind: 'interchange', stationId: 'victoria', lines: ['CIR', 'DIS', 'VIC'] });
  });

  it('has 174 cards: 34 interchange, 29 multi-line and 73 single-line station cards', () => {
    expect(luDeck).toHaveLength(174);
    const stations = luDeck.filter((c) => c.kind === 'station');
    expect(luDeck.filter((c) => c.kind === 'interchange')).toHaveLength(34);
    expect(stations.filter((c) => c.lines)).toHaveLength(29);
    expect(stations.filter((c) => !c.lines)).toHaveLength(73);
  });

  it('gives transfer cards their transfer lines (Hammersmith, Bank)', () => {
    expect(luDeck.find((c) => c.id === 'st:hammersmith-hc')).toEqual({
      id: 'st:hammersmith-hc',
      kind: 'station',
      stationId: 'hammersmith-hc',
      line: 'CIR',
      lines: ['CIR', 'H&C'],
      number: 1,
      transferLines: ['DIS', 'PIC'],
    });
    expect(luDeck.find((c) => c.id === 'st:bank')).toEqual({
      id: 'st:bank',
      kind: 'interchange',
      stationId: 'bank',
      lines: ['CEN', 'NOR'],
      transferLines: ['CIR', 'DIS'],
    });
  });
});
