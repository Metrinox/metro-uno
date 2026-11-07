import { useCallback, useEffect, useRef, useState } from 'react';
import { chooseAction } from '../engine/ai';
import {
  applyAction,
  createGame,
  type Action,
  type ActionResult,
  type GameEvent,
  type GameState,
  type HouseRules,
  type RejectReason,
  viewFor,
} from '../engine/game';
import { network } from './network';

export const HUMAN_ID = 'p0';

export interface GameConfig {
  opponents: number;
  seed: string;
  rules: HouseRules;
}

export type LogItem = { id: number } & (GameEvent | { type: 'rejected'; reason: RejectReason });

export interface ControllerOptions {
  /** Pause before each computer action, in ms: [min, max]. */
  aiDelay: [number, number];
}

function newGame(config: GameConfig): GameState {
  const players = [
    { id: HUMAN_ID, name: 'You', isHuman: true },
    ...Array.from({ length: config.opponents }, (_, i) => ({ id: `ai${i + 1}`, name: `Computer ${i + 1}`, isHuman: false })),
  ];
  return createGame({ network, players, seed: config.seed, rules: config.rules });
}

declare global {
  interface Window {
    __metroTest?: { getState: () => GameState; setState: (s: GameState) => void };
  }
}

/** Runs one round. Remount (change the React key) to start a new round. */
export function useGameController(config: GameConfig, { aiDelay }: ControllerOptions) {
  const [state, setState] = useState<GameState>(() => newGame(config));
  const [log, setLog] = useState<LogItem[]>([]);
  const stateRef = useRef(state);
  const nextLogId = useRef(1);

  const commit = useCallback((s: GameState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  const pushLog = useCallback((items: (GameEvent | { type: 'rejected'; reason: RejectReason })[]) => {
    const withIds = items.map((e) => ({ ...e, id: nextLogId.current++ }) as LogItem);
    setLog((prev) => [...prev, ...withIds].slice(-40));
  }, []);

  const act = useCallback(
    (playerId: string, action: Action): ActionResult => {
      const r = applyAction(stateRef.current, playerId, action);
      if (r.ok) {
        commit(r.state);
        pushLog(r.events);
      }
      return r;
    },
    [commit, pushLog],
  );

  /** Reports a move the UI refused before it reached the engine (e.g. tapping an unplayable card). */
  const reject = useCallback((reason: RejectReason) => pushLog([{ type: 'rejected', reason }]), [pushLog]);

  // Computer turns, shown after a short pause.
  const [minDelay, maxDelay] = aiDelay;
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const player = state.players[state.turn]!;
    if (player.isHuman) return;
    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    const timer = setTimeout(() => {
      const current = stateRef.current;
      if (current !== state) return;
      // The AI only ever sees its own PlayerView.
      act(player.id, chooseAction(viewFor(current, player.id)));
    }, delay);
    return () => clearTimeout(timer);
  }, [state, act, minDelay, maxDelay]);

  // Test hook (dev builds only): lets browser tests arrange specific hands.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__metroTest = { getState: () => stateRef.current, setState: commit };
    return () => {
      delete window.__metroTest;
    };
  }, [commit]);

  return { state, log, act, reject };
}
