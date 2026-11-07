import type { GameState } from '../src/engine/game';

declare global {
  interface Window {
    __metroTest?: { getState: () => GameState; setState: (s: GameState) => void };
  }
}
export {};
