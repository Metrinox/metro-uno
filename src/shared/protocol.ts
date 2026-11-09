/**
 * Messages between the browser and the online game server.
 *
 * Both sides validate everything they receive with `parseClientMessage` /
 * `parseServerMessage`. Bump `PROTOCOL_VERSION` whenever a message shape, or
 * `GameState`, `PlayerView` or `Action`, changes.
 */
import type { Action, GameEvent, HouseRules, PlayerView, RejectReason } from '../engine/game';

export const PROTOCOL_VERSION = 1;
/** Largest message either side accepts, in bytes. */
export const MAX_MESSAGE_BYTES = 8 * 1024;
export const ROOM_SEATS = 4;
export const NAME_MAX = 20;

export type SeatKind = 'human' | 'bot';

/** One occupied seat, as every member of the room sees it. */
export interface SeatSnapshot {
  /** `s1`–`s4`; also the engine player id. */
  id: string;
  /** The player's name, or '' for a computer player. */
  name: string;
  kind: SeatKind;
  /** For computer players: shown as "Computer N". 0 for humans. */
  botNumber: number;
  connected: boolean;
  /** True for a computer player standing in for a human who left. */
  standIn: boolean;
}

export type RoomPhase = 'lobby' | 'playing' | 'ended';

export interface RoomSnapshot {
  code: string;
  phase: RoomPhase;
  rules: HouseRules;
  hostSeat: string;
  /** Always `ROOM_SEATS` long; `null` is a free seat. */
  seats: (SeatSnapshot | null)[];
  /** The receiving player's own seat id. */
  you: string;
}

export type ErrorCode =
  | 'room-not-found'
  | 'room-full'
  | 'in-progress'
  | 'kicked'
  | 'bad-message'
  | 'version'
  | 'session-expired';

export type ClientMessage =
  | { type: 'hello'; protocol: number; session?: string }
  | { type: 'createRoom'; name: string; rules: Partial<HouseRules> }
  | { type: 'joinRoom'; name: string }
  | { type: 'setRules'; rules: Partial<HouseRules> }
  | { type: 'addBot'; seat: number }
  | { type: 'removeSeat'; seat: number }
  | { type: 'start' }
  | { type: 'playAgain' }
  | { type: 'backToLobby' }
  | { type: 'act'; action: Action }
  | { type: 'leave' }
  | { type: 'ping' };

export type LobbyRejectReason = 'not-host' | 'not-in-lobby' | 'not-enough-players' | 'seat-taken' | 'seat-empty' | 'not-playing';

export type ServerMessage =
  | { type: 'welcome'; code: string; session: string; seat: string }
  | { type: 'room'; room: RoomSnapshot }
  | { type: 'table'; view: PlayerView; events: GameEvent[] }
  | { type: 'rejected'; reason: RejectReason | LobbyRejectReason }
  | { type: 'error'; code: ErrorCode }
  | { type: 'pong' };

/** The heartbeat, sent as exact text so the server can answer it without waking. */
export const PING_TEXT = '{"type":"ping"}';
export const PONG_TEXT = '{"type":"pong"}';

// ---------------------------------------------------------------------------
// Validation

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isOptional = <T>(v: unknown, check: (v: unknown) => v is T): boolean => v === undefined || check(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

const RULE_TYPES: Record<keyof HouseRules, 'number' | 'boolean'> = {
  handSize: 'number',
  drawUntilPlayable: 'boolean',
  playDrawnCard: 'boolean',
  mixDrawStacking: 'boolean',
  playSameNumbers: 'boolean',
  playUntilLast: 'boolean',
};

function isRules(v: unknown): v is Partial<HouseRules> {
  if (!isObj(v)) return false;
  return Object.entries(v).every(([k, val]) => {
    const type = RULE_TYPES[k as keyof HouseRules];
    return type !== undefined && typeof val === type && (type !== 'number' || Number.isFinite(val));
  });
}

const CARD_ID_MAX = 64;
const isCardId = (v: unknown): v is string => isStr(v, CARD_ID_MAX) && v.length > 0;

function isAction(v: unknown): v is Action {
  if (!isObj(v)) return false;
  switch (v.type) {
    case 'draw':
    case 'pass':
      return true;
    case 'play':
      return (
        isCardId(v.cardId) &&
        isOptional(v.extraCardIds, (x): x is string[] => Array.isArray(x) && x.length <= 20 && x.every(isCardId)) &&
        isOptional(v.chosenLine, (x): x is string => isStr(x, 16)) &&
        isOptional(v.callUno, isBool)
      );
    default:
      return false;
  }
}

function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}

function parseJson(text: unknown): Obj | null {
  if (typeof text !== 'string' || utf8Length(text) > MAX_MESSAGE_BYTES) return null;
  try {
    const v: unknown = JSON.parse(text);
    return isObj(v) ? v : null;
  } catch {
    return null;
  }
}

/** Validates a message from a browser. Returns null for anything malformed, unknown or too large. */
export function parseClientMessage(text: unknown): ClientMessage | null {
  const m = parseJson(text);
  if (!m) return null;
  switch (m.type) {
    case 'hello':
      return isInt(m.protocol) && isOptional(m.session, (x): x is string => isStr(x, 64))
        ? { type: 'hello', protocol: m.protocol, ...(m.session !== undefined ? { session: m.session as string } : {}) }
        : null;
    case 'createRoom':
      return isStr(m.name, 200) && isRules(m.rules) ? { type: 'createRoom', name: m.name, rules: m.rules } : null;
    case 'joinRoom':
      return isStr(m.name, 200) ? { type: 'joinRoom', name: m.name } : null;
    case 'setRules':
      return isRules(m.rules) ? { type: 'setRules', rules: m.rules } : null;
    case 'addBot':
    case 'removeSeat':
      return isInt(m.seat) && m.seat >= 0 && m.seat < ROOM_SEATS ? { type: m.type, seat: m.seat } : null;
    case 'start':
    case 'playAgain':
    case 'backToLobby':
    case 'leave':
    case 'ping':
      return { type: m.type };
    case 'act':
      return isAction(m.action) ? { type: 'act', action: m.action } : null;
    default:
      return null;
  }
}

const ERROR_CODES: readonly ErrorCode[] = [
  'room-not-found',
  'room-full',
  'in-progress',
  'kicked',
  'bad-message',
  'version',
  'session-expired',
];

function isSeat(v: unknown): v is SeatSnapshot | null {
  if (v === null) return true;
  return (
    isObj(v) &&
    isStr(v.id, 8) &&
    isStr(v.name, NAME_MAX * 2) &&
    (v.kind === 'human' || v.kind === 'bot') &&
    isInt(v.botNumber) &&
    isBool(v.connected) &&
    isBool(v.standIn)
  );
}

function isRoom(v: unknown): v is RoomSnapshot {
  return (
    isObj(v) &&
    isStr(v.code, 8) &&
    (v.phase === 'lobby' || v.phase === 'playing' || v.phase === 'ended') &&
    isRules(v.rules) &&
    isStr(v.hostSeat, 8) &&
    isStr(v.you, 8) &&
    Array.isArray(v.seats) &&
    v.seats.length === ROOM_SEATS &&
    v.seats.every(isSeat)
  );
}

/** A shallow check of the table view: the server is trusted, but the shape must be usable. */
function isView(v: unknown): v is PlayerView {
  return isObj(v) && isStr(v.me, 8) && Array.isArray(v.hand) && Array.isArray(v.players) && isInt(v.turn) && isObj(v.topCard);
}

/** Validates a message from the server. Returns null for anything malformed or unknown. */
export function parseServerMessage(text: unknown): ServerMessage | null {
  if (typeof text !== 'string') return null;
  let m: unknown;
  try {
    m = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObj(m)) return null;
  switch (m.type) {
    case 'welcome':
      return isStr(m.code, 8) && isStr(m.session, 64) && isStr(m.seat, 8)
        ? { type: 'welcome', code: m.code, session: m.session, seat: m.seat }
        : null;
    case 'room':
      return isRoom(m.room) ? { type: 'room', room: m.room } : null;
    case 'table':
      return isView(m.view) && Array.isArray(m.events)
        ? { type: 'table', view: m.view, events: m.events as GameEvent[] }
        : null;
    case 'rejected':
      return isStr(m.reason, 64) ? { type: 'rejected', reason: m.reason as RejectReason | LobbyRejectReason } : null;
    case 'error':
      return ERROR_CODES.includes(m.code as ErrorCode) ? { type: 'error', code: m.code as ErrorCode } : null;
    case 'pong':
      return { type: 'pong' };
    default:
      return null;
  }
}
