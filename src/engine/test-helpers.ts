import { hongKongMtr } from '../data/hk-mtr';
import { londonUnderground } from '../data/london-underground';
import { loadNetwork, type Network } from '../data/network';
import { buildDeck, cardLines, type Card } from './cards';
import { normalizeRules, type Face, type GameState, type HouseRules, type PendingDraw } from './game';

export const hk = loadNetwork(hongKongMtr);
export const lu = loadNetwork(londonUnderground);
const deck = buildDeck(hk);
const decks = new Map<Network, Map<string, Card>>();
const byIdIn = (net: Network) => {
  if (!decks.has(net)) decks.set(net, new Map(buildDeck(net).map((c) => [c.id, c])));
  return decks.get(net)!;
};

/** Looks up a card by id, e.g. `card('st:chai-wan')`, `card('act:rush-hour:ISL')`; Hong Kong unless `net` is given. */
export function card(id: string, net: Network = hk): Card {
  const c = byIdIn(net).get(id);
  if (!c) throw new Error(`No card ${id}`);
  return structuredClone(c);
}

/** A Hong Kong station card for a single-line station with this number on this line. */
export function stationCard(line: string, n: number): Card {
  const c = deck.find((d) => d.kind === 'station' && d.line === line && d.number === n);
  if (!c) throw new Error(`No ${line} station numbered ${n}`);
  return structuredClone(c);
}

export interface ScenarioOptions {
  hands: string[][];
  top?: string;
  /** One current line; shorthand for `currentLines: [line]`. */
  currentLine?: string;
  /** Several current lines (shared-track lines current together). */
  currentLines?: string[];
  face?: Face;
  drawPile?: string[];
  discardBelow?: string[];
  turn?: number;
  direction?: 1 | -1;
  rules?: Partial<HouseRules>;
  pendingDraw?: PendingDraw;
  /** Network the cards come from; Hong Kong by default. */
  network?: Network;
}

/** Builds a hand-crafted game state with players p0..pN (p0 human). */
export function scenario(o: ScenarioOptions): GameState {
  const net = o.network ?? hk;
  const get = (id: string) => card(id, net);
  const top = get(o.top ?? 'st:chai-wan');
  return {
    rules: normalizeRules(o.rules),
    lines: net.lines.map((l) => l.code),
    sharedLines: [...net.sharedLines],
    players: o.hands.map((h, i) => ({ id: `p${i}`, name: `P${i}`, isHuman: i === 0, hand: h.map(get) })),
    drawPile: (o.drawPile ?? []).map(get),
    discard: [...(o.discardBelow ?? []).map(get), top],
    currentLines:
      o.currentLines ?? (o.currentLine ? [o.currentLine] : top.kind === 'station' || top.kind === 'action' ? cardLines(top) : ['ISL']),
    face: o.face ?? (top.kind === 'station' ? { kind: 'number', n: top.number } : { kind: 'none' }),
    turn: o.turn ?? 0,
    direction: o.direction ?? 1,
    rng: 12345,
    phase: 'playing',
    winner: null,
    finished: [],
    pendingDraw: o.pendingDraw ?? null,
    drawnCardId: null,
    mustPlayDrawn: false,
    turnCount: 1,
  };
}
