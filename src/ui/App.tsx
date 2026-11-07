import { useState } from 'react';
import type { HouseRules } from '../engine/game';
import { GameScreen } from './GameScreen';
import { loadRules, saveRules } from './settings';
import { Setup } from './Setup';
import type { GameConfig } from './useGameController';

/** URL options for testing: `?seed=abc` fixes the shuffle, `?aiDelay=0` removes the computer pause. */
function readParams() {
  const p = new URLSearchParams(window.location.search);
  const delay = p.get('aiDelay');
  const ms = delay === null ? null : Math.max(0, Number(delay) || 0);
  return {
    seed: p.get('seed'),
    aiDelay: (ms === null ? [2000, 2000] : [ms, ms]) as [number, number],
  };
}

function randomSeed(): string {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return `${a[0]!.toString(36)}${a[1]!.toString(36)}`;
}

export function App() {
  const [{ seed: fixedSeed, aiDelay }] = useState(readParams);
  const [round, setRound] = useState(0);
  const [opponents, setOpponents] = useState(2);
  const [rules, setRules] = useState<HouseRules>(() => loadRules());
  const [config, setConfig] = useState<GameConfig | null>(null);

  const changeRules = (next: HouseRules) => {
    setRules(next);
    saveRules(next);
  };

  const start = (n: number) => {
    const next = round + 1;
    setRound(next);
    setOpponents(n);
    setConfig({ opponents: n, rules, seed: fixedSeed ? `${fixedSeed}-${next}` : randomSeed() });
  };

  if (!config) return <Setup initialOpponents={opponents} rules={rules} onRulesChange={changeRules} onStart={start} />;
  return (
    <GameScreen
      key={config.seed}
      config={config}
      aiDelay={aiDelay}
      onPlayAgain={() => start(config.opponents)}
      onSetup={() => setConfig(null)}
    />
  );
}
