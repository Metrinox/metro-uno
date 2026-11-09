/**
 * One online room as a pure state machine (design.md §3).
 *
 * No Workers APIs and no timers: callers pass in the time, the current
 * connections, and any fresh randomness, and get back the messages to send.
 * Time-based work is stored as deadlines; `nextDeadline()` says when to call
 * `tick()` next. `RoomObject` saves `state` after every call.
 */
import { chooseAction } from '../src/engine/ai';
import {
  applyAction,
  createGame,
  MIN_PLAYERS,
  normalizeRules,
  viewFor,
  type Action,
  type GameEvent,
  type GameState,
  type HouseRules,
} from '../src/engine/game';
import {
  PROTOCOL_VERSION,
  ROOM_SEATS,
  type ClientMessage,
  type ErrorCode,
  type LobbyRejectReason,
  type RoomPhase,
  type RoomSnapshot,
  type SeatSnapshot,
  type ServerMessage,
} from '../src/shared/protocol';
import { sanitizeName, uniqueName } from '../src/shared/rooms';
import { network } from './network';

export const HOST_HANDOVER_MS = 30_000;
export const EMPTY_ROOM_MS = 5 * 60_000;
export const PRESENCE_EVERY_MS = 10_000;
export const STALE_CONNECTION_MS = 15_000;
/** Bumped when the stored shape changes; older rooms are closed on load. */
export const STATE_VERSION = 1;

/** WebSocket close codes the client understands. */
export const CLOSE = { normal: 1000, gone: 4000, replaced: 4001 } as const;

export interface Seat {
  id: string;
  name: string;
  kind: 'human' | 'bot';
  botNumber: number;
  /** SHA-256 of the seat's session token (humans only). */
  sessionHash: string | null;
  connected: boolean;
  /** A human who left during a round; a computer plays the seat until the round ends. */
  departed: boolean;
  joinedAt: number;
  disconnectedAt: number | null;
}

export interface Deadlines {
  /** The next computer move, valid only while `moves` still equals `afterMove`. */
  ai: { at: number; afterMove: number } | null;
  host: number | null;
  expiry: number | null;
  presence: number | null;
}

export interface RoomState {
  version: number;
  code: string;
  open: boolean;
  phase: RoomPhase;
  rules: HouseRules;
  hostSeat: string | null;
  seats: (Seat | null)[];
  game: GameState | null;
  /** Rounds started in this room (used for test seeds). */
  round: number;
  /** Moves applied in the current round. */
  moves: number;
  deadlines: Deadlines;
}

/** A WebSocket connected to the room, as the adapter tracks it. */
export interface Conn {
  id: string;
  /** The seat this connection controls, once it has created, joined or resumed. */
  seat: string | null;
  /** True once a valid `hello` has been received. */
  ready: boolean;
  /** Last time anything (including a heartbeat) arrived on it. */
  lastSeen: number;
}

export interface RoomDeps {
  aiDelayMs: number;
  /** A fresh, unpredictable shuffle seed. */
  randomSeed: () => string;
  /** When set (tests only), seeds are `${seedPrefix}-${round}` instead. */
  seedPrefix?: string | null;
}

/** Extra input the adapter prepares for a message. */
export interface MessageContext {
  now: number;
  /** A new session for `createRoom` / `joinRoom`. */
  newSession?: { token: string; hash: string };
  /** The hash of the session sent in `hello`. */
  sessionHash?: string;
}

export interface Outcome {
  send: { to: string; msg: ServerMessage }[];
  /** Connections whose seat or ready flag changed. */
  attach: { conn: string; seat: string | null; ready: boolean }[];
  close: { conn: string; code: number; reason: string }[];
  /** The room has closed for good; the adapter should delete its storage. */
  closed: boolean;
}

const seatId = (index: number) => `s${index + 1}`;
const seatIndex = (id: string) => Number(id.slice(1)) - 1;

export function freshState(code: string, now: number, rules: HouseRules = normalizeRules()): RoomState {
  return {
    version: STATE_VERSION,
    code,
    open: true,
    phase: 'lobby',
    rules,
    hostSeat: null,
    seats: Array.from({ length: ROOM_SEATS }, () => null),
    game: null,
    round: 0,
    moves: 0,
    deadlines: { ai: null, host: null, expiry: now + EMPTY_ROOM_MS, presence: null },
  };
}

export function closedState(code: string): RoomState {
  return { ...freshState(code, 0), open: false, deadlines: { ai: null, host: null, expiry: null, presence: null } };
}

export class Room {
  state: RoomState;
  private conns: Conn[] = [];
  private out: Outcome = { send: [], attach: [], close: [], closed: false };
  /** Connections that need the room snapshot even if nothing else changed. */
  private roomDue = new Set<string>();

  constructor(
    state: RoomState,
    private readonly deps: RoomDeps,
  ) {
    this.state = structuredClone(state);
  }

  get open(): boolean {
    return this.state.open;
  }

  /** Claims a fresh room for this code. Returns false if the room is already open. */
  reserve(now: number): boolean {
    if (this.state.open) return false;
    this.state = freshState(this.state.code, now);
    return true;
  }

  /** The earliest deadline, or null when nothing is scheduled. */
  nextDeadline(): number | null {
    const d = this.state.deadlines;
    const times = [d.ai?.at ?? null, d.host, d.expiry, d.presence].filter((t): t is number => t !== null);
    return times.length > 0 ? Math.min(...times) : null;
  }

  /** A newly opened socket. Rooms that are not open turn it away. */
  connected(conns: Conn[], connId: string, now: number): Outcome {
    return this.run(conns, now, () => {
      if (!this.state.open) this.refuse(connId, 'room-not-found');
    });
  }

  /** A message from a connection. `conns` includes that connection. */
  message(conns: Conn[], connId: string, msg: ClientMessage | null, ctx: MessageContext): Outcome {
    return this.run(conns, ctx.now, () => this.handle(connId, msg, ctx));
  }

  /** A socket closed or errored. `conns` no longer includes it. */
  disconnected(conns: Conn[], now: number): Outcome {
    return this.run(conns, now, () => {});
  }

  /** Runs every deadline that is due. */
  tick(conns: Conn[], now: number): Outcome {
    return this.run(conns, now, () => {
      const d = this.state.deadlines;
      if (d.presence !== null && d.presence <= now) this.checkPresence(now);
      if (d.host !== null && d.host <= now) this.handOverHost(true);
      if (d.ai !== null && d.ai.at <= now) this.computerMove();
      if (d.expiry !== null && d.expiry <= now) this.close();
    });
  }

  // -------------------------------------------------------------------------
  // Plumbing

  private run(conns: Conn[], now: number, body: () => void): Outcome {
    this.conns = conns.map((c) => ({ ...c }));
    this.out = { send: [], attach: [], close: [], closed: false };
    this.roomDue.clear();
    const before = this.roomKey();
    body();
    if (this.state.open) {
      this.updatePresence(now);
      const changed = this.roomKey() !== before;
      for (const c of this.conns) if (c.ready && c.seat && (changed || this.roomDue.has(c.id))) this.sendRoom(c);
      this.schedule(now);
    } else {
      this.state.deadlines = { ai: null, host: null, expiry: null, presence: null };
    }
    return this.out;
  }

  /** Changes to this key are what members need to hear about in a `room` message. */
  private roomKey(): string {
    const s = this.state;
    return JSON.stringify([s.open, s.phase, s.rules, s.hostSeat, this.seatSnapshots()]);
  }

  private send(to: string, msg: ServerMessage) {
    this.out.send.push({ to, msg });
  }

  private attach(conn: Conn, seat: string | null, ready = conn.ready) {
    conn.seat = seat;
    conn.ready = ready;
    this.out.attach.push({ conn: conn.id, seat, ready });
  }

  private closeConn(connId: string, code: number, reason: string) {
    this.conns = this.conns.filter((c) => c.id !== connId);
    this.out.close.push({ conn: connId, code, reason });
  }

  private refuse(connId: string, code: ErrorCode) {
    this.send(connId, { type: 'error', code });
    this.closeConn(connId, CLOSE.gone, code);
  }

  private reject(connId: string, reason: LobbyRejectReason) {
    this.send(connId, { type: 'rejected', reason });
  }

  private seats(): Seat[] {
    return this.state.seats.filter((s): s is Seat => s !== null);
  }

  private seat(id: string | null): Seat | undefined {
    return id ? (this.state.seats[seatIndex(id)] ?? undefined) : undefined;
  }

  private connsFor(seat: string): Conn[] {
    return this.conns.filter((c) => c.ready && c.seat === seat);
  }

  // -------------------------------------------------------------------------
  // Messages

  private handle(connId: string, msg: ClientMessage | null, ctx: MessageContext) {
    const conn = this.conns.find((c) => c.id === connId);
    if (!conn) return;
    if (!this.state.open) return this.refuse(connId, 'room-not-found');
    if (!msg) return this.send(connId, { type: 'error', code: 'bad-message' });
    if (msg.type === 'ping') return this.send(connId, { type: 'pong' });

    if (msg.type === 'hello') {
      if (msg.protocol !== PROTOCOL_VERSION) return this.refuse(connId, 'version');
      if (msg.session === undefined) return this.attach(conn, conn.seat, true);
      return this.resume(conn, ctx.sessionHash ?? null);
    }
    if (!conn.ready) return this.send(connId, { type: 'error', code: 'bad-message' });

    switch (msg.type) {
      case 'createRoom':
        return this.create(conn, msg.name, msg.rules, ctx);
      case 'joinRoom':
        return this.join(conn, msg.name, ctx);
      case 'leave':
        return this.leave(conn);
      case 'act':
        return this.act(conn, msg.action);
      default:
        return this.hostOnly(conn, msg);
    }
  }

  private resume(conn: Conn, hash: string | null) {
    const seat = hash ? this.seats().find((s) => s.kind === 'human' && !s.departed && s.sessionHash === hash) : undefined;
    if (!seat) return this.refuse(conn.id, 'session-expired');
    // One connection per seat: a newer tab replaces the older one.
    for (const old of this.connsFor(seat.id)) if (old.id !== conn.id) this.closeConn(old.id, CLOSE.replaced, 'replaced');
    this.attach(conn, seat.id, true);
    this.roomDue.add(conn.id);
    this.sendTable(conn, []);
  }

  private create(conn: Conn, rawName: string, rules: Partial<HouseRules>, ctx: MessageContext) {
    const name = sanitizeName(rawName);
    if (!name || !ctx.newSession || conn.seat) return this.send(conn.id, { type: 'error', code: 'bad-message' });
    if (this.seats().length > 0) return this.refuse(conn.id, 'room-not-found');
    this.state.rules = normalizeRules(rules);
    this.state.seats[0] = this.newHuman(0, name, ctx.newSession.hash, ctx.now);
    this.state.hostSeat = seatId(0);
    this.welcome(conn, seatId(0), ctx.newSession.token);
  }

  private join(conn: Conn, rawName: string, ctx: MessageContext) {
    const name = sanitizeName(rawName);
    if (!name || !ctx.newSession || conn.seat) return this.send(conn.id, { type: 'error', code: 'bad-message' });
    if (this.seats().length === 0) return this.refuse(conn.id, 'room-not-found');
    if (this.state.phase === 'playing') return this.refuse(conn.id, 'in-progress');
    const free = this.state.seats.findIndex((s) => s === null);
    if (free < 0) return this.refuse(conn.id, 'room-full');
    const taken = this.seats().filter((s) => s.kind === 'human').map((s) => s.name);
    this.state.seats[free] = this.newHuman(free, uniqueName(name, taken), ctx.newSession.hash, ctx.now);
    if (!this.state.hostSeat) this.state.hostSeat = seatId(free);
    this.welcome(conn, seatId(free), ctx.newSession.token);
  }

  private newHuman(index: number, name: string, sessionHash: string, now: number): Seat {
    return {
      id: seatId(index),
      name,
      kind: 'human',
      botNumber: 0,
      sessionHash,
      connected: true,
      departed: false,
      joinedAt: now,
      disconnectedAt: null,
    };
  }

  private welcome(conn: Conn, seat: string, token: string) {
    this.attach(conn, seat, true);
    this.send(conn.id, { type: 'welcome', code: this.state.code, session: token, seat });
    // Everyone, including the newcomer, then gets the room because the seats changed.
  }

  private leave(conn: Conn) {
    const seat = this.seat(conn.seat);
    this.closeConn(conn.id, CLOSE.normal, 'left');
    if (!seat || seat.kind !== 'human') return;
    for (const other of this.connsFor(seat.id)) this.closeConn(other.id, CLOSE.normal, 'left');
    if (this.state.phase === 'lobby') {
      this.state.seats[seatIndex(seat.id)] = null;
    } else {
      // A computer plays this seat for the rest of the round.
      seat.departed = true;
      seat.sessionHash = null;
      seat.connected = false;
      seat.botNumber = this.nextBotNumber();
    }
    if (this.state.hostSeat === seat.id) this.handOverHost(false);
  }

  private nextBotNumber(): number {
    const used = new Set(this.seats().filter((s) => s.kind === 'bot' || s.departed).map((s) => s.botNumber));
    let n = 1;
    while (used.has(n)) n++;
    return n;
  }

  private hostOnly(conn: Conn, msg: ClientMessage) {
    if (conn.seat === null || conn.seat !== this.state.hostSeat) return this.reject(conn.id, 'not-host');
    switch (msg.type) {
      case 'setRules':
        if (this.state.phase !== 'lobby') return this.reject(conn.id, 'not-in-lobby');
        this.state.rules = normalizeRules({ ...this.state.rules, ...msg.rules });
        return;
      case 'addBot': {
        if (this.state.phase !== 'lobby') return this.reject(conn.id, 'not-in-lobby');
        if (this.state.seats[msg.seat] !== null) return this.reject(conn.id, 'seat-taken');
        this.state.seats[msg.seat] = {
          id: seatId(msg.seat),
          name: '',
          kind: 'bot',
          botNumber: this.nextBotNumber(),
          sessionHash: null,
          connected: true,
          departed: false,
          joinedAt: 0,
          disconnectedAt: null,
        };
        return;
      }
      case 'removeSeat': {
        if (this.state.phase !== 'lobby') return this.reject(conn.id, 'not-in-lobby');
        const seat = this.state.seats[msg.seat];
        if (!seat) return this.reject(conn.id, 'seat-empty');
        if (seat.id === this.state.hostSeat) return this.reject(conn.id, 'seat-taken');
        for (const c of this.connsFor(seat.id)) {
          this.send(c.id, { type: 'error', code: 'kicked' });
          this.closeConn(c.id, CLOSE.gone, 'kicked');
        }
        this.state.seats[msg.seat] = null;
        return;
      }
      case 'start':
        if (this.state.phase !== 'lobby') return this.reject(conn.id, 'not-in-lobby');
        return this.startRound(conn.id);
      case 'playAgain':
        if (this.state.phase !== 'ended') return this.reject(conn.id, 'not-in-lobby');
        this.clearDeparted();
        this.state.phase = 'lobby';
        return this.startRound(conn.id);
      case 'backToLobby':
        if (this.state.phase !== 'ended') return this.reject(conn.id, 'not-in-lobby');
        this.clearDeparted();
        this.state.phase = 'lobby';
        this.state.game = null;
        return;
      default:
        return this.send(conn.id, { type: 'error', code: 'bad-message' });
    }
  }

  /** Seats of players who left (and the computers standing in for them) are freed between rounds. */
  private clearDeparted() {
    this.state.seats = this.state.seats.map((s) => (s && s.departed ? null : s));
  }

  private startRound(connId: string) {
    const seats = this.seats();
    if (seats.length < MIN_PLAYERS) {
      this.state.game = null;
      return this.reject(connId, 'not-enough-players');
    }
    this.state.round += 1;
    this.state.moves = 0;
    const seed = this.deps.seedPrefix ? `${this.deps.seedPrefix}-${this.state.round}` : this.deps.randomSeed();
    this.state.game = createGame({
      network,
      players: seats.map((s) => ({ id: s.id, name: s.kind === 'bot' ? `Computer ${s.botNumber}` : s.name, isHuman: s.kind === 'human' })),
      seed,
      rules: this.state.rules,
    });
    this.state.phase = 'playing';
    this.broadcastTable([]);
  }

  private act(conn: Conn, action: Action) {
    const game = this.state.game;
    if (this.state.phase !== 'playing' || !game) return this.reject(conn.id, 'not-playing');
    const seat = this.seat(conn.seat);
    if (!seat || seat.departed) return this.reject(conn.id, 'not-playing');
    this.apply(seat.id, action, conn.id);
  }

  /** Applies a move. Rejections go only to `rejectTo`. */
  private apply(playerId: string, action: Action, rejectTo: string | null): boolean {
    const game = this.state.game!;
    const r = applyAction(game, playerId, action);
    if (!r.ok) {
      if (rejectTo) this.send(rejectTo, { type: 'rejected', reason: r.reason });
      return false;
    }
    this.state.game = r.state;
    this.state.moves += 1;
    if (r.state.phase === 'ended') this.state.phase = 'ended';
    this.broadcastTable(r.events);
    return true;
  }

  // -------------------------------------------------------------------------
  // Computer moves, presence, host and expiry

  /** The seat a computer should play now, if any. */
  private computerSeat(): string | null {
    const game = this.state.game;
    if (this.state.phase !== 'playing' || !game) return null;
    const id = game.players[game.turn]!.id;
    const seat = this.seat(id);
    if (!seat) return null;
    return seat.kind === 'bot' || seat.departed || !seat.connected ? id : null;
  }

  private computerMove() {
    const id = this.computerSeat();
    const ai = this.state.deadlines.ai;
    this.state.deadlines.ai = null;
    if (!id || !ai || ai.afterMove !== this.state.moves) return;
    const game = this.state.game!;
    // The computer only ever sees this seat's own view.
    if (this.apply(id, chooseAction(viewFor(game, id)), null)) return;
    // Should never happen; keep the round moving rather than stall.
    if (!this.apply(id, { type: 'draw' }, null)) this.apply(id, { type: 'pass' }, null);
  }

  private checkPresence(now: number) {
    for (const c of [...this.conns]) {
      if (now - c.lastSeen > STALE_CONNECTION_MS) this.closeConn(c.id, CLOSE.gone, 'timeout');
    }
  }

  /** Sets each human seat's connected flag from the live connections. */
  private updatePresence(now: number) {
    for (const seat of this.seats()) {
      if (seat.kind !== 'human' || seat.departed) continue;
      const connected = this.connsFor(seat.id).length > 0;
      if (connected === seat.connected) continue;
      seat.connected = connected;
      seat.disconnectedAt = connected ? null : now;
    }
  }

  /**
   * Moves the host role to the longest-seated connected human. When the host
   * has left (`awayOnly` false) and nobody is connected, any remaining human
   * takes it; a host who is only away keeps it until someone can take over.
   */
  private handOverHost(awayOnly: boolean) {
    this.state.deadlines.host = null;
    const current = this.state.hostSeat;
    const host = this.seat(current);
    if (awayOnly && host?.connected) return;
    const humans = this.seats()
      .filter((s) => s.kind === 'human' && !s.departed && s.id !== current)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    const next = humans.find((s) => s.connected) ?? (awayOnly ? undefined : humans[0]);
    if (next) this.state.hostSeat = next.id;
    else if (!awayOnly) this.state.hostSeat = null;
  }

  private close() {
    this.state = closedState(this.state.code);
    for (const c of [...this.conns]) {
      this.send(c.id, { type: 'error', code: 'room-not-found' });
      this.closeConn(c.id, CLOSE.gone, 'closed');
    }
    this.out.closed = true;
  }

  private schedule(now: number) {
    const d = this.state.deadlines;
    const humansHere = this.seats().some((s) => s.kind === 'human' && !s.departed && s.connected);

    d.expiry = humansHere ? null : (d.expiry ?? now + EMPTY_ROOM_MS);
    d.presence = this.conns.length > 0 ? (d.presence !== null && d.presence > now ? d.presence : now + PRESENCE_EVERY_MS) : null;

    // A handover is only scheduled while the host is away and someone else could take over.
    const host = this.seat(this.state.hostSeat);
    const hostAway = !!host && host.kind === 'human' && !host.departed && !host.connected;
    const successor = this.seats().some((s) => s.kind === 'human' && !s.departed && s.connected && s.id !== host?.id);
    d.host = hostAway && successor ? (d.host ?? Math.max(now, (host.disconnectedAt ?? now) + HOST_HANDOVER_MS)) : null;

    if (this.computerSeat() === null) d.ai = null;
    else if (!d.ai || d.ai.afterMove !== this.state.moves) d.ai = { at: now + this.deps.aiDelayMs, afterMove: this.state.moves };
  }

  // -------------------------------------------------------------------------
  // Snapshots

  private seatSnapshots(): (SeatSnapshot | null)[] {
    return this.state.seats.map((s) =>
      s
        ? {
            id: s.id,
            name: s.kind === 'human' && !s.departed ? s.name : '',
            kind: s.kind === 'bot' || s.departed ? 'bot' : 'human',
            botNumber: s.kind === 'bot' || s.departed ? s.botNumber : 0,
            connected: s.kind === 'bot' || s.departed ? true : s.connected,
            standIn: s.departed,
          }
        : null,
    );
  }

  snapshotFor(seat: string): RoomSnapshot {
    return {
      code: this.state.code,
      phase: this.state.phase,
      rules: this.state.rules,
      hostSeat: this.state.hostSeat ?? '',
      seats: this.seatSnapshots(),
      you: seat,
    };
  }

  private sendRoom(conn: Conn) {
    if (conn.seat) this.send(conn.id, { type: 'room', room: this.snapshotFor(conn.seat) });
  }

  private sendTable(conn: Conn, events: GameEvent[]) {
    const game = this.state.game;
    if (!game || !conn.seat || !game.players.some((p) => p.id === conn.seat)) return;
    this.send(conn.id, { type: 'table', view: viewFor(game, conn.seat), events });
  }

  private broadcastTable(events: GameEvent[]) {
    for (const c of this.conns) if (c.ready) this.sendTable(c, events);
  }
}
