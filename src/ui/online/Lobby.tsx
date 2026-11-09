import { useState } from 'react';
import type { HouseRules } from '../../engine/game';
import { MIN_PLAYERS } from '../../engine/game';
import type { ClientMessage, LobbyRejectReason, RoomSnapshot } from '../../shared/protocol';
import { HouseRulesEditor } from '../HouseRulesEditor';
import { useLang } from '../LangContext';
import { LangToggle } from '../LangToggle';
import { ThemeToggle } from '../ThemeToggle';

interface Props {
  room: RoomSnapshot;
  shareUrl: string;
  /** A request the server refused, shown until the next change. */
  notice: { id: number; reason: string } | null;
  send: (msg: ClientMessage) => void;
  /** Called with the new rules when the host changes them (to remember them). */
  onRulesChanged: (rules: HouseRules) => void;
  onLeave: () => void;
}

/** The room before (and between) rounds. Only the host can change it. */
export function Lobby({ room, shareUrl, notice, send, onRulesChanged, onLeave }: Props) {
  const { t } = useLang();
  const o = t.online;
  const [copied, setCopied] = useState(false);
  const isHost = room.you === room.hostSeat;
  const occupied = room.seats.filter(Boolean).length;
  const between = room.phase !== 'lobby';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the link is still selectable */
    }
  };

  const setRules = (rules: HouseRules) => {
    send({ type: 'setRules', rules });
    onRulesChanged(rules);
  };

  return (
    <main className="setup lobby">
      <div className="setup-card">
        <div className="card-toolbar">
          <button type="button" className="btn btn-quiet" onClick={onLeave} data-testid="leave-room">
            {o.leaveRoom}
          </button>
          <span className="spacer" />
          <ThemeToggle />
          <LangToggle />
        </div>
        <h1>
          {o.lobbyTitle}{' '}
          <span className="room-code" data-testid="lobby-code">
            {room.code}
          </span>
        </h1>

        <div className="share">
          <label className="field">
            <span className="field-label">{o.shareLink}</span>
            <input type="text" readOnly value={shareUrl} onFocus={(e) => e.target.select()} data-testid="share-link" />
          </label>
          <button type="button" className="btn" onClick={copy} data-testid="copy-link">
            {copied ? o.copied : o.copyLink}
          </button>
        </div>

        <fieldset>
          <legend>{o.seats}</legend>
          <ol className="seats" data-testid="seats">
            {room.seats.map((seat, i) => {
              const label = seat ? (seat.kind === 'bot' ? t.computer(seat.botNumber) : seat.name) : o.emptySeat;
              const me = seat?.id === room.you;
              return (
                <li key={i} className={seat ? 'seat' : 'seat is-empty'} data-testid={`seat-${i}`}>
                  <span className="seat-name">
                    {label}
                    {me && <span className="badge"> {t.you}</span>}
                    {seat && seat.id === room.hostSeat && <span className="badge badge-host">{o.host}</span>}
                    {seat && !seat.connected && <span className="badge badge-away">{t.away}</span>}
                  </span>
                  {isHost && !between && !seat && (
                    <button type="button" className="btn btn-quiet" onClick={() => send({ type: 'addBot', seat: i })} data-testid={`add-bot-${i}`}>
                      {o.addComputer}
                    </button>
                  )}
                  {isHost && !between && seat && seat.id !== room.you && (
                    <button
                      type="button"
                      className="btn btn-quiet"
                      aria-label={o.removeWho(label)}
                      onClick={() => send({ type: 'removeSeat', seat: i })}
                      data-testid={`remove-${i}`}
                    >
                      {o.remove}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </fieldset>

        <HouseRulesEditor rules={room.rules} onChange={setRules} readOnly={!isHost || between} note={isHost ? undefined : o.rulesByHost} />

        {notice && (
          <p className="online-message" role="alert" key={notice.id}>
            {o.lobbyRejected[notice.reason as LobbyRejectReason] ?? notice.reason}
          </p>
        )}

        {between ? (
          <p className="lobby-wait" data-testid="lobby-wait">
            {o.waitingNextRound}
          </p>
        ) : isHost ? (
          <>
            <button
              type="button"
              className="btn btn-primary btn-start"
              disabled={occupied < MIN_PLAYERS}
              onClick={() => send({ type: 'start' })}
              data-testid="start-online"
            >
              {t.start}
            </button>
            {occupied < MIN_PLAYERS && <p className="lobby-wait">{o.needTwo}</p>}
          </>
        ) : (
          <p className="lobby-wait" data-testid="lobby-wait">
            {o.waitingForHost}
          </p>
        )}
      </div>
    </main>
  );
}
