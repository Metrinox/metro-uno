import { hongKongMtr } from '../data/hk-mtr';
import { loadNetwork } from '../data/network';
import { buildDeck, type Card } from './cards';
import { normalizeRules, type Face, type GameState, type HouseRules, type PendingDraw } from './game';

export const hk = loadNetwork(hongKongMtr);
const deck = buildDeck(hk);
const byId = new Map(deck.map((c) => [c.id, c]));

/** Looks up a Hong Kong card by id, e.g. `card('st:chai-wan')`, `card('act:rush-hour:ISL')`. */
export function card(id: string): Card {
  const c = byId.get(id);
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
  currentLine?: string;
  face?: Face;
  drawPile?: string[];
  discardBelow?: string[];
  turn?: number;
  direction?: 1 | -1;
  rules?: Partial<HouseRules>;
  pendingDraw?: PendingDraw;
}

/** Builds a hand-crafted game state with players p0..pN (p0 human). */
export function scenario(o: ScenarioOptions): GameState {
  const top = card(o.top ?? 'st:chai-wan');
  return {
    rules: normalizeRules(o.rules),
    lines: hk.lines.map((l) => l.code),
    players: o.hands.map((h, i) => ({ id: `p${i}`, name: `P${i}`, isHuman: i === 0, hand: h.map(card) })),
    drawPile: (o.drawPile ?? []).map(card),
    discard: [...(o.discardBelow ?? []).map(card), top],
    currentLine: o.currentLine ?? (top.kind === 'station' || top.kind === 'action' ? top.line : 'ISL'),
    face: o.face ?? (top.kind === 'station' ? { kind: 'number', n: top.number } : { kind: 'none' }),
    turn: o.turn ?? 0,
    direction: o.direction ?? 1,
    rng: 12345,
    phase: 'playing',
    winner: null,
    pendingDraw: o.pendingDraw ?? null,
    drawnCardId: null,
    mustPlayDrawn: false,
    turnCount: 1,
  };
}
