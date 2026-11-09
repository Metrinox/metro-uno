import type { Action, GameEvent, PlayerView, RejectReason } from '../engine/game';
import type { Dict } from './i18n';

/** Who sits in a seat, as the table shows it. */
export interface SeatInfo {
  id: string;
  /** The display name for a human seat. Unused for the viewer and for computers. */
  name: string;
  kind: 'human' | 'bot';
  /** Shown as "Computer N" for computer seats. */
  botNumber: number;
  connected: boolean;
  isMe: boolean;
  isHost: boolean;
}

/** Something to report on the table: a game event, or a move that was refused. */
export type LogEntry = GameEvent | { type: 'rejected'; reason: RejectReason };
export type LogItem = { id: number } & LogEntry;

/**
 * Everything the table needs, for a local or an online round. The table only
 * ever sees the viewer's own `PlayerView`, never the full game state.
 */
export interface TableController {
  view: PlayerView;
  seats: SeatInfo[];
  log: LogItem[];
  /** Sends a move. Rejections arrive in `log`; there is no synchronous result. */
  send(action: Action): void;
  /** Reports a move the UI refused before sending it (e.g. tapping an unplayable card). */
  reject(reason: RejectReason): void;
}

/** "You", "Computer N", or the player's name. */
export function seatLabel(seat: SeatInfo | undefined, t: Dict): string {
  if (!seat) return '';
  if (seat.isMe) return t.you;
  if (seat.kind === 'bot') return t.computer(seat.botNumber);
  return seat.name;
}
