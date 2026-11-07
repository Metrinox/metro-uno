import type { Network } from '../data/network';
import { chooseAction } from './ai';
import { applyAction, createGame, currentPlayer, viewFor, type GameState, type HouseRules } from './game';

export const SAFETY_TURN_LIMIT = 2000;

export interface SimulationResult {
  state: GameState;
  /** Actions the engine rejected (should always be 0). */
  rejections: number;
  /** True if the round hit the safety limit instead of finishing. */
  hitLimit: boolean;
}

/** Plays a whole round with only computer players. */
export function simulateRound(
  network: Network,
  playerCount: number,
  seed: string | number,
  rules?: Partial<HouseRules>,
): SimulationResult {
  const players = Array.from({ length: playerCount }, (_, i) => ({ id: `ai${i}`, name: `AI ${i}`, isHuman: false }));
  let state = createGame({ network, players, seed, rules });
  let rejections = 0;
  let actions = 0;
  while (state.phase === 'playing' && state.turnCount <= SAFETY_TURN_LIMIT && actions < SAFETY_TURN_LIMIT * 3) {
    const me = currentPlayer(state).id;
    const r = applyAction(state, me, chooseAction(viewFor(state, me)));
    actions++;
    if (!r.ok) {
      rejections++;
      break;
    }
    state = r.state;
  }
  return { state, rejections, hitLimit: state.phase !== 'ended' && rejections === 0 };
}
