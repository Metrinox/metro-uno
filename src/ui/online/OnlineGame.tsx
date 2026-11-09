import { useEffect } from 'react';
import type { HouseRules } from '../../engine/game';
import type { ErrorCode } from '../../shared/protocol';
import { GameScreen } from '../GameScreen';
import { useLang } from '../LangContext';
import { saveRules } from '../settings';
import type { SocketLike, Target } from './connection';
import { Lobby } from './Lobby';
import { useOnlineGame } from './useOnlineGame';

export type OnlineExit = ErrorCode | 'unavailable' | null;

interface Props {
  serverUrl: string;
  target: Target;
  /** Builds the share link for a room code. */
  shareUrl: (code: string) => string;
  /** Leaves online play: `null` when the player chose to leave, otherwise why. */
  onExit: (reason: OnlineExit) => void;
  openSocket?: (url: string) => SocketLike;
}

/** One online visit: the lobby, then the table, for as long as the player stays. */
export function OnlineGame({ serverUrl, target, shareUrl, onExit, openSocket }: Props) {
  const { t } = useLang();
  const o = t.online;
  const { state, table, send, leave } = useOnlineGame(serverUrl, target, openSocket);
  const { room, status, error } = state;

  useEffect(() => {
    if (error) onExit(error);
    else if (status === 'unavailable') onExit('unavailable');
  }, [error, status, onExit]);

  const doLeave = () => {
    leave();
    onExit(null);
  };

  if (!room) {
    return (
      <main className="setup">
        <div className="setup-card">
          <p className="lobby-wait" role="status" data-testid="online-connecting">
            {o.connecting}
          </p>
          <button type="button" className="btn btn-quiet" onClick={doLeave}>
            {o.back}
          </button>
        </div>
      </main>
    );
  }

  const banner =
    status === 'reconnecting' || status === 'connecting' ? (
      <p className="connection-banner" role="status" data-testid="connection-banner">
        {status === 'reconnecting' ? o.reconnecting : o.connecting}
      </p>
    ) : null;

  // A player who joined between rounds has no hand yet; they wait in the lobby.
  if (room.phase === 'lobby' || !table) {
    return (
      <>
        {banner}
        <Lobby
          room={room}
          shareUrl={shareUrl(room.code)}
          notice={state.notice}
          send={send}
          onRulesChanged={(rules: HouseRules) => saveRules(rules)}
          onLeave={doLeave}
        />
      </>
    );
  }

  const isHost = room.you === room.hostSeat;
  return (
    <GameScreen
      controller={table}
      menuLabel={o.leaveRoom}
      onMenu={doLeave}
      banner={banner}
      endActions={
        <>
          {!isHost && (
            <p className="lobby-wait" data-testid="waiting-for-host">
              {o.waitingNextRound}
            </p>
          )}
          <div className="dialog-actions">
            {isHost && (
              <>
                <button type="button" className="btn btn-primary" onClick={() => send({ type: 'playAgain' })} autoFocus data-testid="play-again-online">
                  {t.playAgain}
                </button>
                <button type="button" className="btn" onClick={() => send({ type: 'backToLobby' })} data-testid="back-to-lobby">
                  {o.backToLobby}
                </button>
              </>
            )}
            <button type="button" className="btn" onClick={doLeave} autoFocus={!isHost} data-testid="leave-room-end">
              {o.leaveRoom}
            </button>
          </div>
        </>
      }
    />
  );
}
