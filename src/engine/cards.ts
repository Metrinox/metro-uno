import type { Network } from '../data/network';

export type ActionType = 'signal-fault' | 'terminus' | 'rush-hour';
export type WildType = 'octopus' | 'typhoon';

export const ACTION_TYPES: readonly ActionType[] = ['signal-fault', 'terminus', 'rush-hour'];
export const WILD_COPIES = 4;

/** Cards are immutable once built; states share card objects. */
export type Card =
  | {
      id: string;
      kind: 'station';
      stationId: string;
      line: string;
      number: number;
      /** Lines a walkway transfer switches to when played, if any. */
      transferLines?: string[];
    }
  | {
      id: string;
      kind: 'interchange';
      stationId: string;
      lines: string[];
      /** Extra lines a walkway transfer can switch to when played, if any. */
      transferLines?: string[];
    }
  | { id: string; kind: 'action'; action: ActionType; line: string }
  | { id: string; kind: 'wild'; wild: WildType };

/** Builds the unshuffled deck for a network. Card ids are stable and unique. */
export function buildDeck(network: Network): Card[] {
  const deck: Card[] = [];

  for (const station of Object.values(network.stations)) {
    if (station.interchange) {
      deck.push({
        id: `st:${station.id}`,
        kind: 'interchange',
        stationId: station.id,
        lines: [...station.lines],
        ...(station.transfer ? { transferLines: [...station.transfer.lines] } : {}),
      });
    } else {
      const line = station.lines[0]!;
      deck.push({
        id: `st:${station.id}`,
        kind: 'station',
        stationId: station.id,
        line,
        number: station.numbers[line]!,
        ...(station.transfer ? { transferLines: [...station.transfer.lines] } : {}),
      });
    }
  }

  for (const line of network.lines) {
    for (const action of ACTION_TYPES) {
      deck.push({ id: `act:${action}:${line.code}`, kind: 'action', action, line: line.code });
    }
  }

  for (const wild of ['octopus', 'typhoon'] as const) {
    for (let i = 1; i <= WILD_COPIES; i++) deck.push({ id: `wild:${wild}:${i}`, kind: 'wild', wild });
  }

  return deck;
}
