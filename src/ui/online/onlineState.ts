/** What the browser knows about its online room, built from server messages. */
import type { PlayerView, RejectReason } from '../../engine/game';
import type { ErrorCode, RoomSnapshot, ServerMessage } from '../../shared/protocol';
import type { LogEntry, LogItem, SeatInfo } from '../game/tableController';
import type { ConnectionStatus } from './connection';

export interface OnlineState {
  status: ConnectionStatus;
  room: RoomSnapshot | null;
  view: PlayerView | null;
  log: LogItem[];
  /** A lobby request the server refused (shown briefly). */
  notice: { id: number; reason: string } | null;
  error: ErrorCode | null;
  nextId: number;
}

export const initialOnlineState: OnlineState = {
  status: 'connecting',
  room: null,
  view: null,
  log: [],
  notice: null,
  error: null,
  nextId: 1,
};

export type OnlineAction =
  | { type: 'server'; msg: ServerMessage }
  | { type: 'status'; status: ConnectionStatus }
  | { type: 'localReject'; reason: RejectReason };

const LOG_MAX = 40;
const GAME_REJECTIONS = new Set<string>([
  'game-over',
  'not-your-turn',
  'unknown-player',
  'card-not-in-hand',
  'not-playable',
  'must-play-drawn-card-or-pass',
  'must-play-drawn-card',
  'line-choice-required',
  'invalid-line',
  'already-drew',
  'cannot-pass',
  'cannot-play-together',
]);

function pushLog(state: OnlineState, items: LogEntry[]): OnlineState {
  let id = state.nextId;
  const withIds = items.map((e): LogItem => ({ ...e, id: id++ }));
  return { ...state, log: [...state.log, ...withIds].slice(-LOG_MAX), nextId: id };
}

export function onlineReducer(state: OnlineState, action: OnlineAction): OnlineState {
  switch (action.type) {
    case 'status':
      return { ...state, status: action.status };
    case 'localReject':
      return pushLog(state, [{ type: 'rejected', reason: action.reason }]);
    case 'server': {
      const msg = action.msg;
      switch (msg.type) {
        case 'room': {
          // A new round (or a return to the lobby) starts with a fresh table and log.
          const newRound = state.room?.phase !== 'playing' && msg.room.phase === 'playing';
          const toLobby = msg.room.phase === 'lobby';
          return {
            ...state,
            room: msg.room,
            error: null,
            ...(newRound || toLobby ? { log: [], ...(toLobby ? { view: null } : {}) } : {}),
          };
        }
        case 'table':
          return pushLog({ ...state, view: msg.view }, msg.events);
        case 'rejected':
          if (GAME_REJECTIONS.has(msg.reason)) return pushLog(state, [{ type: 'rejected', reason: msg.reason as RejectReason }]);
          return { ...state, notice: { id: state.nextId, reason: msg.reason }, nextId: state.nextId + 1 };
        case 'error':
          return msg.code === 'bad-message' ? state : { ...state, error: msg.code };
        default:
          return state;
      }
    }
  }
}

/** The room's seats as the table shows them. */
export function seatsOf(room: RoomSnapshot | null): SeatInfo[] {
  if (!room) return [];
  return room.seats.flatMap((s) =>
    s
      ? [
          {
            id: s.id,
            name: s.name,
            kind: s.kind,
            botNumber: s.botNumber,
            connected: s.connected,
            isMe: s.id === room.you,
            isHost: s.id === room.hostSeat,
          },
        ]
      : [],
  );
}
