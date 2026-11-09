import { useCallback, useState } from 'react';
import type { HouseRules } from '../engine/game';
import { isValidCode, normalizeCode } from '../shared/rooms';
import { useLang } from './LangContext';
import { LocalGame } from './LocalGame';
import { loadSession, type Target } from './online/connection';
import { OnlineGame, type OnlineExit } from './online/OnlineGame';
import { OnlineMenu } from './online/OnlineMenu';
import { loadRules, saveRules } from './settings';
import { Setup } from './Setup';
import type { GameConfig } from './useLocalGame';

/** The game server's address, set at build time. Online play is hidden without it. */
const SERVER_URL: string | undefined = import.meta.env.VITE_SERVER_URL || undefined;

/**
 * URL options: `?room=CODE` opens a share link. For testing, `?seed=abc` fixes
 * the shuffle and `?aiDelay=0` removes the computer pause.
 */
function readParams() {
  const p = new URLSearchParams(window.location.search);
  const delay = p.get('aiDelay');
  const ms = delay === null ? null : Math.max(0, Number(delay) || 0);
  const room = normalizeCode(p.get('room') ?? '');
  return {
    seed: p.get('seed'),
    aiDelay: (ms === null ? [2000, 2000] : [ms, ms]) as [number, number],
    room: isValidCode(room) ? room : null,
  };
}

/** Removes `?room=` so a reload resumes the seat instead of joining again. */
function forgetRoomParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('room')) return;
  url.searchParams.delete('room');
  window.history.replaceState(null, '', url);
}

function shareUrl(code: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', code);
  return url.toString();
}

function randomSeed(): string {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return `${a[0]!.toString(36)}${a[1]!.toString(36)}`;
}

type Mode =
  | { kind: 'setup' }
  | { kind: 'local'; config: GameConfig }
  | { kind: 'online-menu'; code?: string; message?: OnlineExit }
  | { kind: 'online'; target: Target; id: number };

function initialMode(room: string | null): Mode {
  if (!SERVER_URL) return { kind: 'setup' };
  if (room) return { kind: 'online-menu', code: room };
  const session = loadSession();
  if (session && session.serverUrl === SERVER_URL) return { kind: 'online', target: { kind: 'resume', session }, id: 0 };
  return { kind: 'setup' };
}

export function App() {
  const { t } = useLang();
  const [{ seed: fixedSeed, aiDelay, room }] = useState(readParams);
  const [round, setRound] = useState(0);
  const [opponents, setOpponents] = useState(2);
  const [rules, setRules] = useState<HouseRules>(() => loadRules());
  const [mode, setMode] = useState<Mode>(() => initialMode(room));

  const changeRules = (next: HouseRules) => {
    setRules(next);
    saveRules(next);
  };

  const start = (n: number) => {
    const next = round + 1;
    setRound(next);
    setOpponents(n);
    setMode({ kind: 'local', config: { opponents: n, rules, seed: fixedSeed ? `${fixedSeed}-${next}` : randomSeed() } });
  };

  const goOnline = (target: Target) => {
    forgetRoomParam();
    setMode({ kind: 'online', target, id: Date.now() });
  };

  const exitOnline = useCallback((reason: OnlineExit) => {
    forgetRoomParam();
    // The host may have changed the rules in the lobby; pick up what was saved.
    setRules(loadRules());
    setMode(reason ? { kind: 'online-menu', message: reason } : { kind: 'setup' });
  }, []);

  switch (mode.kind) {
    case 'setup':
      return (
        <Setup
          initialOpponents={opponents}
          rules={rules}
          onRulesChange={changeRules}
          onStart={start}
          onPlayOnline={SERVER_URL ? () => setMode({ kind: 'online-menu' }) : undefined}
        />
      );
    case 'local':
      return (
        <LocalGame
          key={mode.config.seed}
          config={mode.config}
          aiDelay={aiDelay}
          onPlayAgain={() => start(mode.config.opponents)}
          onSetup={() => setMode({ kind: 'setup' })}
        />
      );
    case 'online-menu':
      return (
        <OnlineMenu
          initialCode={mode.code}
          message={mode.message ? (mode.message === 'unavailable' ? t.online.unavailable : t.online.errors[mode.message]) : null}
          onCreate={(name) => goOnline({ kind: 'create', name, rules: loadRules() })}
          onJoin={(code, name) => goOnline({ kind: 'join', code, name })}
          onBack={() => {
            forgetRoomParam();
            setMode({ kind: 'setup' });
          }}
        />
      );
    case 'online':
      return <OnlineGame key={mode.id} serverUrl={SERVER_URL!} target={mode.target} shareUrl={shareUrl} onExit={exitOnline} />;
  }
}
