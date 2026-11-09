import { chooseAction } from '../src/engine/ai';
import { type GameState, type PlayerView } from '../src/engine/game';
import { PROTOCOL_VERSION, type ClientMessage, type RoomSnapshot, type ServerMessage } from '../src/shared/protocol';
import {
  closedState,
  EMPTY_ROOM_MS,
  freshState,
  HOST_HANDOVER_MS,
  Room,
  type Conn,
  type Outcome,
} from './room';

const AI_DELAY = 2000;

/** Plays the part of the Durable Object adapter: connections, time, sessions. */
class Harness {
  room: Room;
  now = 1_000_000;
  conns: Conn[] = [];
  inbox = new Map<string, ServerMessage[]>();
  closed = new Map<string, string>();
  sessions = new Map<string, string>();
  private nextConn = 1;
  private nextToken = 1;

  constructor(state = freshState('K7MX', 1_000_000)) {
    this.room = new Room(state, { aiDelayMs: AI_DELAY, randomSeed: () => 'unused', seedPrefix: 'room-test' });
  }

  /** Delivers an outcome: messages to inboxes, attachments, closes. */
  deliver(out: Outcome): Outcome {
    for (const { to, msg } of out.send) this.inbox.get(to)?.push(msg);
    for (const a of out.attach) {
      const c = this.conns.find((x) => x.id === a.conn);
      if (c) Object.assign(c, { seat: a.seat, ready: a.ready });
    }
    for (const c of out.close) {
      this.closed.set(c.conn, c.reason);
      this.conns = this.conns.filter((x) => x.id !== c.conn);
    }
    return out;
  }

  /** Opens a socket and says hello (optionally resuming a session). */
  connect(session?: string): string {
    const id = `c${this.nextConn++}`;
    this.conns.push({ id, seat: null, ready: false, lastSeen: this.now });
    this.inbox.set(id, []);
    this.deliver(this.room.connected(this.conns, id, this.now));
    if (this.conns.some((c) => c.id === id)) this.send(id, { type: 'hello', protocol: PROTOCOL_VERSION, ...(session ? { session } : {}) });
    return id;
  }

  send(conn: string, msg: ClientMessage | null): Outcome {
    const ctx: Parameters<Room['message']>[3] = { now: this.now };
    if (msg && (msg.type === 'createRoom' || msg.type === 'joinRoom')) {
      const token = `token-${this.nextToken++}`;
      ctx.newSession = { token, hash: `hash-of-${token}` };
      this.sessions.set(conn, token);
    }
    if (msg?.type === 'hello' && msg.session) ctx.sessionHash = `hash-of-${msg.session}`;
    const c = this.conns.find((x) => x.id === conn);
    if (c) c.lastSeen = this.now;
    return this.deliver(this.room.message(this.conns, conn, msg, ctx));
  }

  drop(conn: string): Outcome {
    this.conns = this.conns.filter((c) => c.id !== conn);
    return this.deliver(this.room.disconnected(this.conns, this.now));
  }

  /** Advances time, running every deadline that falls due on the way. */
  advance(ms: number) {
    const end = this.now + ms;
    for (;;) {
      const next = this.room.nextDeadline();
      if (next === null || next > end) break;
      this.now = Math.max(this.now, next);
      for (const c of this.conns) if (this.alive.has(c.id)) c.lastSeen = this.now;
      this.deliver(this.room.tick(this.conns, this.now));
    }
    this.now = end;
  }

  /** Connections that keep sending heartbeats while time advances. */
  alive = new Set<string>();

  create(name = 'Mei', rules = {}): string {
    const c = this.connect();
    this.alive.add(c);
    this.send(c, { type: 'createRoom', name, rules });
    return c;
  }

  join(name: string): string {
    const c = this.connect();
    this.alive.add(c);
    this.send(c, { type: 'joinRoom', name });
    return c;
  }

  last<T extends ServerMessage['type']>(conn: string, type: T): Extract<ServerMessage, { type: T }> | undefined {
    return this.inbox
      .get(conn)!
      .filter((m): m is Extract<ServerMessage, { type: T }> => m.type === type)
      .at(-1);
  }

  roomOf(conn: string): RoomSnapshot {
    return this.last(conn, 'room')!.room;
  }

  viewOf(conn: string): PlayerView {
    return this.last(conn, 'table')!.view;
  }

  clear() {
    for (const k of this.inbox.keys()) this.inbox.set(k, []);
  }

  get game(): GameState {
    return this.room.state.game!;
  }
}

/** Host plus guests, started with optional bots. */
function startedRoom(guests: string[], bots = 0, rules = {}) {
  const h = new Harness();
  const host = h.create('Mei', rules);
  const others = guests.map((g) => h.join(g));
  for (let i = 0; i < bots; i++) h.send(host, { type: 'addBot', seat: h.room.state.seats.findIndex((s) => s === null) });
  h.send(host, { type: 'start' });
  return { h, host, others };
}

/** Plays legal moves for whoever's turn it is until `done` or the round ends. */
function playHumanTurn(h: Harness, conn: string) {
  h.send(conn, { type: 'act', action: chooseAction(h.viewOf(conn)) });
}

describe('creating and joining', () => {
  it('creates a room with the creator as host in seat 1', () => {
    const h = new Harness();
    const c = h.create('Mei');
    expect(h.last(c, 'welcome')).toMatchObject({ code: 'K7MX', seat: 's1', session: 'token-1' });
    const room = h.roomOf(c);
    expect(room).toMatchObject({ code: 'K7MX', phase: 'lobby', hostSeat: 's1', you: 's1' });
    expect(room.seats[0]).toMatchObject({ id: 's1', name: 'Mei', kind: 'human', connected: true });
    expect(room.seats.slice(1)).toEqual([null, null, null]);
  });

  it('starts from the rules the host sent, normalised', () => {
    const h = new Harness();
    const c = h.create('Mei', { drawUntilPlayable: true, handSize: 99 });
    expect(h.roomOf(c).rules).toMatchObject({ drawUntilPlayable: true, handSize: 15 });
  });

  it('seats joiners in the first free seat and tells everyone', () => {
    const h = new Harness();
    const mei = h.create('Mei');
    const kaho = h.join('Ka Ho');
    expect(h.last(kaho, 'welcome')).toMatchObject({ seat: 's2' });
    for (const c of [mei, kaho]) expect(h.roomOf(c).seats[1]).toMatchObject({ name: 'Ka Ho', kind: 'human' });
    expect(h.roomOf(kaho).you).toBe('s2');
  });

  it('turns away sockets for a room that is not open', () => {
    const h = new Harness(closedState('ZZZZ'));
    const c = h.connect();
    expect(h.inbox.get(c)).toEqual([{ type: 'error', code: 'room-not-found' }]);
    expect(h.closed.get(c)).toBe('room-not-found');
  });

  it('refuses a fifth player', () => {
    const h = new Harness();
    h.create('A');
    h.join('B');
    h.join('C');
    h.join('D');
    const e = h.join('E');
    expect(h.last(e, 'error')).toEqual({ type: 'error', code: 'room-full' });
    expect(h.room.state.seats.every((s) => s !== null)).toBe(true);
    expect(h.room.state.seats.map((s) => s!.name)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('numbers duplicate names', () => {
    const h = new Harness();
    h.create('Sam');
    const second = h.join('Sam');
    expect(h.roomOf(second).seats[1]!.name).toBe('Sam 2');
  });

  it('rejects an empty name', () => {
    const h = new Harness();
    const c = h.connect();
    h.send(c, { type: 'createRoom', name: '   ', rules: {} });
    expect(h.last(c, 'error')).toEqual({ type: 'error', code: 'bad-message' });
    expect(h.room.state.seats[0]).toBeNull();
  });

  it('requires hello before anything else, with the right version', () => {
    const h = new Harness();
    const c = 'raw';
    h.conns.push({ id: c, seat: null, ready: false, lastSeen: h.now });
    h.inbox.set(c, []);
    h.send(c, { type: 'createRoom', name: 'Mei', rules: {} });
    expect(h.last(c, 'error')).toEqual({ type: 'error', code: 'bad-message' });
    h.send(c, { type: 'hello', protocol: PROTOCOL_VERSION + 1 });
    expect(h.last(c, 'error')).toEqual({ type: 'error', code: 'version' });
    expect(h.closed.get(c)).toBe('version');
  });

  it('answers malformed messages without changing the room', () => {
    const h = new Harness();
    const c = h.create();
    const before = structuredClone(h.room.state);
    h.send(c, null);
    expect(h.last(c, 'error')).toEqual({ type: 'error', code: 'bad-message' });
    expect(h.room.state).toEqual(before);
  });
});

describe('host controls', () => {
  it('only the host can change the lobby', () => {
    const h = new Harness();
    h.create('Mei');
    const guest = h.join('Ka Ho');
    const before = structuredClone(h.room.state);
    for (const msg of [
      { type: 'setRules', rules: { handSize: 3 } },
      { type: 'addBot', seat: 2 },
      { type: 'removeSeat', seat: 0 },
      { type: 'start' },
    ] as ClientMessage[]) {
      h.send(guest, msg);
      expect(h.last(guest, 'rejected')).toEqual({ type: 'rejected', reason: 'not-host' });
    }
    expect(h.room.state).toEqual(before);
  });

  it('rules changes reach every guest', () => {
    const h = new Harness();
    const host = h.create('Mei');
    const guest = h.join('Ka Ho');
    h.send(host, { type: 'setRules', rules: { drawUntilPlayable: true } });
    expect(h.roomOf(guest).rules.drawUntilPlayable).toBe(true);
  });

  it('adds and removes computer players', () => {
    const h = new Harness();
    const host = h.create('Mei');
    h.join('Ka Ho');
    h.send(host, { type: 'addBot', seat: 2 });
    h.send(host, { type: 'addBot', seat: 3 });
    const seats = h.roomOf(host).seats;
    expect(seats.map((s) => s?.kind)).toEqual(['human', 'human', 'bot', 'bot']);
    expect(seats.map((s) => s?.botNumber)).toEqual([0, 0, 1, 2]);
    h.send(host, { type: 'removeSeat', seat: 2 });
    expect(h.roomOf(host).seats[2]).toBeNull();
    h.send(host, { type: 'addBot', seat: 1 });
    expect(h.last(host, 'rejected')).toEqual({ type: 'rejected', reason: 'seat-taken' });
  });

  it('removing a guest tells them and frees the seat', () => {
    const h = new Harness();
    const host = h.create('Mei');
    const guest = h.join('Ka Ho');
    h.send(host, { type: 'removeSeat', seat: 1 });
    expect(h.last(guest, 'error')).toEqual({ type: 'error', code: 'kicked' });
    expect(h.closed.get(guest)).toBe('kicked');
    expect(h.roomOf(host).seats[1]).toBeNull();
  });

  it('cannot start alone', () => {
    const h = new Harness();
    const host = h.create('Mei');
    h.send(host, { type: 'start' });
    expect(h.last(host, 'rejected')).toEqual({ type: 'rejected', reason: 'not-enough-players' });
    expect(h.room.state.phase).toBe('lobby');
  });

  it('starts a round for every human with the lobby hand size', () => {
    const { h, host, others } = startedRoom(['Ka Ho'], 1, { handSize: 5 });
    for (const c of [host, ...others]) {
      expect(h.roomOf(c).phase).toBe('playing');
      const view = h.viewOf(c);
      expect(view.players).toHaveLength(3);
      expect(view.hand).toHaveLength(5);
    }
  });

  it('refuses rule changes and joins during a round', () => {
    const { h, host } = startedRoom(['Ka Ho']);
    h.send(host, { type: 'setRules', rules: { handSize: 9 } });
    expect(h.last(host, 'rejected')).toEqual({ type: 'rejected', reason: 'not-in-lobby' });
    expect(h.room.state.rules.handSize).toBe(7);
    const late = h.join('Late');
    expect(h.last(late, 'error')).toEqual({ type: 'error', code: 'in-progress' });
  });

  it('never sends session tokens or their hashes to anyone', () => {
    const h = new Harness();
    const host = h.create('Mei');
    h.join('Ka Ho');
    h.send(host, { type: 'addBot', seat: 2 });
    h.send(host, { type: 'start' });
    for (const [conn, msgs] of h.inbox) {
      for (const m of msgs) {
        if (m.type === 'welcome') continue;
        const text = JSON.stringify(m);
        expect(text, conn).not.toMatch(/token-|hash-of-/);
      }
    }
  });
});

describe('playing', () => {
  it('sends each player their own view after a move', () => {
    const { h, host, others } = startedRoom(['Ka Ho']);
    const mover = h.game.turn === 0 ? host : others[0]!;
    const action = chooseAction(h.viewOf(mover));
    h.clear();
    h.send(mover, { type: 'act', action });
    for (const c of [host, ...others]) {
      const t = h.last(c, 'table')!;
      expect(t.view.me).toBe(c === host ? 's1' : 's2');
      expect(t.events.length).toBeGreaterThan(0);
    }
  });

  it('reports a rejected move only to the sender', () => {
    const { h, host, others } = startedRoom(['Ka Ho']);
    h.clear();
    const idle = h.game.turn === 0 ? others[0]! : host;
    const before = structuredClone(h.game);
    h.send(idle, { type: 'act', action: { type: 'draw' } });
    expect(h.last(idle, 'rejected')).toEqual({ type: 'rejected', reason: 'not-your-turn' });
    const other = idle === host ? others[0]! : host;
    expect(h.inbox.get(other)).toEqual([]);
    expect(h.game).toEqual(before);
  });

  it('never reveals other hands or the draw pile', () => {
    for (const seed of ['a', 'b', 'c']) {
      const h = new Harness(freshState('HIDE', 1_000_000));
      h.room = new Room(h.room.state, { aiDelayMs: AI_DELAY, randomSeed: () => seed });
      const me = h.create('Mei');
      for (let s = 1; s < 4; s++) h.send(me, { type: 'addBot', seat: s });
      const check = (out: Outcome) => {
        const game = h.room.state.game;
        if (!game) return;
        const secret = new Set([
          ...game.players.filter((p) => p.id !== 's1').flatMap((p) => p.hand.map((c) => c.id)),
          ...game.drawPile.map((c) => c.id),
        ]);
        for (const { to, msg } of out.send) {
          if (to !== me) continue;
          const text = JSON.stringify(msg);
          for (const id of secret) expect(text.includes(`"${id}"`), `${id} leaked`).toBe(false);
        }
      };
      check(h.send(me, { type: 'start' }));
      for (let i = 0; i < 2000 && h.room.state.phase === 'playing'; i++) {
        if (h.game.players[h.game.turn]!.id === 's1') check(h.send(me, { type: 'act', action: chooseAction(h.viewOf(me)) }));
        else {
          h.now = h.room.nextDeadline()!;
          for (const c of h.conns) c.lastSeen = h.now;
          const out = h.room.tick(h.conns, h.now);
          check(out);
          h.deliver(out);
        }
      }
      expect(h.room.state.phase).toBe('ended');
    }
  });
});

describe('computer turns', () => {
  it('waits for the pause, then plays a computer seat', () => {
    const h = new Harness();
    const host = h.create('Mei');
    h.send(host, { type: 'addBot', seat: 1 });
    h.send(host, { type: 'start' });
    // Make sure it is the computer's turn.
    if (h.game.turn === 0) playHumanTurn(h, host);
    while (h.game.players[h.game.turn]!.id !== 's2' && h.room.state.phase === 'playing') playHumanTurn(h, host);
    const moves = h.room.state.moves;
    h.advance(AI_DELAY - 1);
    expect(h.room.state.moves).toBe(moves);
    h.advance(1);
    expect(h.room.state.moves).toBeGreaterThan(moves);
  });

  it('plays for a disconnected human, who takes back control later', () => {
    const { h, host, others } = startedRoom(['Ka Ho']);
    const kaho = others[0]!;
    const token = h.sessions.get(kaho)!;
    // Get to Ka Ho's turn.
    while (h.game.players[h.game.turn]!.id !== 's2') playHumanTurn(h, host);
    h.alive.delete(kaho);
    h.drop(kaho);
    expect(h.roomOf(host).seats[1]).toMatchObject({ connected: false });
    const moves = h.room.state.moves;
    h.advance(AI_DELAY);
    expect(h.room.state.moves).toBeGreaterThan(moves);

    // Ka Ho comes back with the same hand.
    const back = h.connect(token);
    h.alive.add(back);
    expect(h.viewOf(back).me).toBe('s2');
    expect(h.viewOf(back).hand).toEqual(h.game.players[1]!.hand);
    // Play on until it is Ka Ho's turn again: no computer move is scheduled for it.
    while (h.room.state.phase === 'playing' && h.game.players[h.game.turn]!.id !== 's2') {
      h.advance(AI_DELAY);
      if (h.game.players[h.game.turn]!.id === 's1') playHumanTurn(h, host);
    }
    if (h.room.state.phase === 'playing') expect(h.room.state.deadlines.ai).toBeNull();
  });
});

describe('end of round', () => {
  function finishRound(h: Harness, conns: string[]) {
    for (let i = 0; i < 5000 && h.room.state.phase === 'playing'; i++) {
      const turnSeat = h.game.players[h.game.turn]!.id;
      const conn = conns.find((c) => h.conns.find((x) => x.id === c)?.seat === turnSeat);
      if (conn) playHumanTurn(h, conn);
      else h.advance(AI_DELAY);
    }
    expect(h.room.state.phase).toBe('ended');
  }

  it('play again keeps the seats and reshuffles', () => {
    const { h, host, others } = startedRoom(['Ka Ho'], 1);
    const firstHands = h.game.players.map((p) => p.hand.map((c) => c.id));
    finishRound(h, [host, ...others]);
    h.send(others[0]!, { type: 'playAgain' });
    expect(h.last(others[0]!, 'rejected')).toEqual({ type: 'rejected', reason: 'not-host' });
    h.send(host, { type: 'playAgain' });
    expect(h.room.state.phase).toBe('playing');
    expect(h.game.players.map((p) => p.id)).toEqual(['s1', 's2', 's3']);
    expect(h.game.players.map((p) => p.hand.map((c) => c.id))).not.toEqual(firstHands);
  });

  it('frees the seats of players who left, and their stand-ins', () => {
    const { h, host, others } = startedRoom(['Ka Ho', 'Sam'], 1);
    h.send(others[1]!, { type: 'leave' });
    expect(h.roomOf(host).seats[2]).toMatchObject({ kind: 'bot', standIn: true });
    finishRound(h, [host, others[0]!]);
    h.send(host, { type: 'backToLobby' });
    const seats = h.roomOf(host).seats;
    expect(seats.map((s) => s?.kind ?? null)).toEqual(['human', 'human', null, 'bot']);
    expect(h.room.state.phase).toBe('lobby');
  });
});

describe('sessions and presence', () => {
  it('rejects an unknown session', () => {
    const h = new Harness();
    h.create();
    const c = h.connect('not-a-token');
    expect(h.last(c, 'error')).toEqual({ type: 'error', code: 'session-expired' });
    expect(h.closed.get(c)).toBe('session-expired');
  });

  it('a newer tab replaces the older one', () => {
    const h = new Harness();
    const first = h.create();
    const second = h.connect(h.sessions.get(first));
    expect(h.closed.get(first)).toBe('replaced');
    expect(h.roomOf(second).you).toBe('s1');
  });

  it('notices a connection that went silent within 30 seconds', () => {
    const h = new Harness();
    const host = h.create('Mei');
    const guest = h.join('Ka Ho');
    h.alive.delete(guest); // stops sending heartbeats
    h.advance(30_000);
    expect(h.closed.get(guest)).toBe('timeout');
    expect(h.roomOf(host).seats[1]).toMatchObject({ connected: false });
  });

  it('leaving the lobby frees the seat', () => {
    const h = new Harness();
    const host = h.create('Mei');
    const guest = h.join('Ka Ho');
    h.send(guest, { type: 'leave' });
    expect(h.closed.get(guest)).toBe('left');
    expect(h.roomOf(host).seats[1]).toBeNull();
  });

  it('a player who left cannot resume their seat', () => {
    const { h, others } = startedRoom(['Ka Ho']);
    const token = h.sessions.get(others[0]!)!;
    h.send(others[0]!, { type: 'leave' });
    const c = h.connect(token);
    expect(h.last(c, 'error')).toEqual({ type: 'error', code: 'session-expired' });
  });
});

describe('host handover and clean-up', () => {
  it('passes the host role when the host leaves', () => {
    const h = new Harness();
    const mei = h.create('Mei');
    const kaho = h.join('Ka Ho');
    h.send(mei, { type: 'leave' });
    expect(h.roomOf(kaho).hostSeat).toBe('s2');
  });

  it('passes the host role after 30 s away, not before', () => {
    const h = new Harness();
    const mei = h.create('Mei');
    h.now += 10;
    const kaho = h.join('Ka Ho');
    h.now += 10;
    h.join('Sam');
    h.alive.delete(mei);
    h.drop(mei);
    h.advance(HOST_HANDOVER_MS - 1);
    expect(h.roomOf(kaho).hostSeat).toBe('s1');
    h.advance(1);
    expect(h.roomOf(kaho).hostSeat).toBe('s2');
  });

  it('keeps the host if they come back in time', () => {
    const h = new Harness();
    const mei = h.create('Mei');
    const kaho = h.join('Ka Ho');
    const token = h.sessions.get(mei)!;
    h.alive.delete(mei);
    h.drop(mei);
    h.advance(10_000);
    h.alive.add(h.connect(token));
    h.advance(HOST_HANDOVER_MS);
    expect(h.roomOf(kaho).hostSeat).toBe('s1');
  });

  it('closes a room 5 minutes after the last human disconnects', () => {
    const h = new Harness();
    const mei = h.create('Mei');
    h.alive.delete(mei);
    h.drop(mei);
    h.advance(EMPTY_ROOM_MS - 1);
    expect(h.room.open).toBe(true);
    h.advance(1);
    expect(h.room.open).toBe(false);
    const c = h.connect();
    expect(h.last(c, 'error')).toEqual({ type: 'error', code: 'room-not-found' });
  });

  it('a closed code can be reserved again', () => {
    const h = new Harness(closedState('K7MX'));
    expect(h.room.reserve(h.now)).toBe(true);
    expect(h.room.reserve(h.now)).toBe(false);
  });
});

describe('cost', () => {
  // The Workers Free plan allows about 10 ms of CPU per request. Starting a round
  // (building and shuffling the deck, dealing, and a view per seat) is the
  // heaviest message. The Workers runtime freezes its clock during a request, so
  // this is measured here, on the same V8 engine.
  it('starts a 4-player round well within the Free plan CPU limit', () => {
    const runs = 30;
    const times: number[] = [];
    for (let i = 0; i < runs; i++) {
      const h = new Harness();
      const host = h.create('Mei');
      for (let s = 1; s < 4; s++) h.send(host, { type: 'addBot', seat: s });
      const t0 = performance.now();
      h.send(host, { type: 'start' });
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(runs / 2)]!;
    console.log(`start: median ${median.toFixed(2)} ms, max ${times.at(-1)!.toFixed(2)} ms`);
    expect(median).toBeLessThan(5);
  });
});
