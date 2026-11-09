/**
 * The browser's connection to the online game server (design.md §5).
 *
 * Opens a WebSocket to `/rooms/new` or `/rooms/<code>`, says hello, keeps a
 * heartbeat going, remembers the session so a reload can resume the seat, and
 * reconnects with backoff when the connection drops.
 */
import type { HouseRules } from '../../engine/game';
import {
  parseServerMessage,
  PING_TEXT,
  PROTOCOL_VERSION,
  type ClientMessage,
  type ErrorCode,
  type ServerMessage,
} from '../../shared/protocol';

export const HEARTBEAT_MS = 5000;
/** Give up on a first connection after this long (a sleeping server may need a moment). */
export const UNAVAILABLE_MS = 15_000;
export const BACKOFF_MS = [500, 1000, 2000, 5000];

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'unavailable' | 'closed';

export type Target =
  | { kind: 'create'; name: string; rules: HouseRules }
  | { kind: 'join'; code: string; name: string }
  | { kind: 'resume'; session: StoredSession };

export interface StoredSession {
  serverUrl: string;
  code: string;
  session: string;
}

/** Errors after which there is nothing to reconnect to. */
const FINAL_ERRORS: readonly ErrorCode[] = ['room-not-found', 'room-full', 'in-progress', 'kicked', 'version', 'session-expired'];

const SESSION_KEY = 'metro-uno.online';

type GetStorage = () => Storage | undefined;
const defaultStorage: GetStorage = () => globalThis.localStorage;

export function loadSession(storage: GetStorage = defaultStorage): StoredSession | null {
  try {
    const raw = storage()?.getItem(SESSION_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<StoredSession>;
    return typeof v.serverUrl === 'string' && typeof v.code === 'string' && typeof v.session === 'string'
      ? { serverUrl: v.serverUrl, code: v.code, session: v.session }
      : null;
  } catch {
    return null;
  }
}

export function saveSession(s: StoredSession, storage: GetStorage = defaultStorage): void {
  try {
    storage()?.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: a reload just won't resume the seat */
  }
}

export function clearSession(storage: GetStorage = defaultStorage): void {
  try {
    storage()?.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** The parts of the browser WebSocket this module uses (so tests can fake it). */
export interface SocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code: number; reason: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export interface ConnectionOptions {
  serverUrl: string;
  target: Target;
  onMessage: (msg: ServerMessage) => void;
  onStatus: (status: ConnectionStatus) => void;
  openSocket?: (url: string) => SocketLike;
  storage?: GetStorage;
}

const OPEN = 1;

export class OnlineConnection {
  private socket: SocketLike | null = null;
  private session: StoredSession | null;
  private status: ConnectionStatus = 'connecting';
  private attempt = 0;
  private everOpened = false;
  private stopped = false;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private giveUp: ReturnType<typeof setTimeout> | null = null;
  private readonly openSocket: (url: string) => SocketLike;
  private readonly storage: GetStorage;

  constructor(private readonly opts: ConnectionOptions) {
    this.openSocket = opts.openSocket ?? ((url) => new WebSocket(url) as unknown as SocketLike);
    this.storage = opts.storage ?? defaultStorage;
    this.session = opts.target.kind === 'resume' ? opts.target.session : null;
    this.giveUp = setTimeout(() => {
      if (!this.everOpened) this.fail('unavailable');
    }, UNAVAILABLE_MS);
    this.open();
  }

  /** Sends a message if the connection is open. Returns whether it was sent. */
  send(msg: ClientMessage): boolean {
    if (this.socket?.readyState !== OPEN) return false;
    this.socket.send(JSON.stringify(msg));
    return true;
  }

  /** Leaves the room for good. */
  leave(): void {
    this.send({ type: 'leave' });
    clearSession(this.storage);
    this.stop('closed');
  }

  /** Stops without telling the server (e.g. the page is going away). */
  dispose(): void {
    this.stop(this.status);
  }

  private url(): string {
    const base = this.opts.serverUrl.replace(/\/+$/, '');
    const code = this.session?.code ?? (this.opts.target.kind === 'join' ? this.opts.target.code : null);
    return code ? `${base}/rooms/${encodeURIComponent(code)}` : `${base}/rooms/new`;
  }

  private setStatus(s: ConnectionStatus) {
    if (s === this.status) return;
    this.status = s;
    this.opts.onStatus(s);
  }

  private open() {
    if (this.stopped) return;
    let socket: SocketLike;
    try {
      socket = this.openSocket(this.url());
    } catch {
      this.scheduleRetry();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      this.everOpened = true;
      this.attempt = 0;
      this.setStatus('open');
      socket.send(JSON.stringify({ type: 'hello', protocol: PROTOCOL_VERSION, ...(this.session ? { session: this.session.session } : {}) }));
      if (!this.session) {
        const t = this.opts.target;
        if (t.kind === 'create') socket.send(JSON.stringify({ type: 'createRoom', name: t.name, rules: t.rules }));
        if (t.kind === 'join') socket.send(JSON.stringify({ type: 'joinRoom', name: t.name }));
      }
      this.startHeartbeat();
    };
    socket.onmessage = (ev) => {
      const msg = parseServerMessage(ev.data);
      if (!msg || msg.type === 'pong') return;
      if (msg.type === 'welcome') {
        this.session = { serverUrl: this.opts.serverUrl, code: msg.code, session: msg.session };
        saveSession(this.session, this.storage);
      }
      if (msg.type === 'error' && FINAL_ERRORS.includes(msg.code)) {
        clearSession(this.storage);
        this.opts.onMessage(msg);
        this.stop('closed');
        return;
      }
      this.opts.onMessage(msg);
    };
    socket.onclose = (ev) => {
      if (this.socket !== socket) return;
      this.stopHeartbeat();
      this.socket = null;
      if (this.stopped) return;
      // Another tab took over this seat.
      if (ev.code === 4001) return this.stop('closed');
      this.scheduleRetry();
    };
    socket.onerror = () => {
      /* onclose follows */
    };
  }

  private scheduleRetry() {
    if (this.stopped) return;
    // Before the first successful open, keep trying until the give-up timer fires.
    if (this.everOpened) this.setStatus('reconnecting');
    const delay = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)]!;
    this.attempt += 1;
    this.retry = setTimeout(() => this.open(), delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => {
      if (this.socket?.readyState === OPEN) this.socket.send(PING_TEXT);
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  private fail(status: ConnectionStatus) {
    this.stop(status);
  }

  private stop(status: ConnectionStatus) {
    this.stopped = true;
    this.stopHeartbeat();
    if (this.retry) clearTimeout(this.retry);
    if (this.giveUp) clearTimeout(this.giveUp);
    const s = this.socket;
    this.socket = null;
    if (s && s.readyState <= OPEN) {
      try {
        s.close(1000, 'bye');
      } catch {
        /* ignore */
      }
    }
    this.setStatus(status);
  }
}
