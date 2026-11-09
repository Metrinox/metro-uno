import { DEFAULT_RULES } from '../../engine/game';
import { PING_TEXT, PROTOCOL_VERSION, type ServerMessage } from '../../shared/protocol';
import {
  BACKOFF_MS,
  HEARTBEAT_MS,
  loadSession,
  OnlineConnection,
  UNAVAILABLE_MS,
  type ConnectionStatus,
  type SocketLike,
  type Target,
} from './connection';

class FakeSocket implements SocketLike {
  readyState = 0;
  sent: string[] = [];
  onopen: SocketLike['onopen'] = null;
  onmessage: SocketLike['onmessage'] = null;
  onclose: SocketLike['onclose'] = null;
  onerror: SocketLike['onerror'] = null;
  constructor(public url: string) {}
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
  }
  // Test controls
  serverOpens() {
    this.readyState = 1;
    this.onopen?.({});
  }
  serverSends(msg: ServerMessage) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
  drops(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code, reason: '' });
  }
  get messages() {
    return this.sent.filter((s) => s !== PING_TEXT).map((s) => JSON.parse(s) as { type: string });
  }
}

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

function setup(target: Target) {
  const sockets: FakeSocket[] = [];
  const statuses: ConnectionStatus[] = [];
  const received: ServerMessage[] = [];
  const store = memoryStorage();
  const conn = new OnlineConnection({
    serverUrl: 'wss://server.test/',
    target,
    onMessage: (m) => received.push(m),
    onStatus: (s) => statuses.push(s),
    openSocket: (url) => {
      const s = new FakeSocket(url);
      sockets.push(s);
      return s;
    },
    storage: () => store,
  });
  return { conn, sockets, statuses, received, store, last: () => sockets.at(-1)! };
}

const create: Target = { kind: 'create', name: 'Mei', rules: { ...DEFAULT_RULES } };

describe('OnlineConnection', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('creates a room: hello, then createRoom, and saves the session from welcome', () => {
    const t = setup(create);
    expect(t.last().url).toBe('wss://server.test/rooms/new');
    t.last().serverOpens();
    expect(t.last().messages).toEqual([
      { type: 'hello', protocol: PROTOCOL_VERSION },
      { type: 'createRoom', name: 'Mei', rules: DEFAULT_RULES },
    ]);
    t.last().serverSends({ type: 'welcome', code: 'K7MX', session: 'tok', seat: 's1' });
    expect(loadSession(() => t.store)).toEqual({ serverUrl: 'wss://server.test/', code: 'K7MX', session: 'tok' });
    expect(t.statuses).toEqual(['open']);
  });

  it('joins by code', () => {
    const t = setup({ kind: 'join', code: 'K7MX', name: 'Ka Ho' });
    expect(t.last().url).toBe('wss://server.test/rooms/K7MX');
    t.last().serverOpens();
    expect(t.last().messages.at(-1)).toEqual({ type: 'joinRoom', name: 'Ka Ho' });
  });

  it('sends a heartbeat every 5 seconds', () => {
    const t = setup(create);
    t.last().serverOpens();
    vi.advanceTimersByTime(HEARTBEAT_MS * 3);
    expect(t.last().sent.filter((s) => s === PING_TEXT)).toHaveLength(3);
  });

  it('reconnects with backoff and resumes the seat', () => {
    const t = setup(create);
    t.last().serverOpens();
    t.last().serverSends({ type: 'welcome', code: 'K7MX', session: 'tok', seat: 's1' });
    t.last().drops();
    expect(t.statuses.at(-1)).toBe('reconnecting');
    expect(t.sockets).toHaveLength(1);
    vi.advanceTimersByTime(BACKOFF_MS[0]!);
    expect(t.sockets).toHaveLength(2);
    expect(t.last().url).toBe('wss://server.test/rooms/K7MX');
    t.last().drops();
    vi.advanceTimersByTime(BACKOFF_MS[1]! - 1);
    expect(t.sockets).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(t.sockets).toHaveLength(3);
    t.last().serverOpens();
    expect(t.last().messages).toEqual([{ type: 'hello', protocol: PROTOCOL_VERSION, session: 'tok' }]);
    expect(t.statuses.at(-1)).toBe('open');
  });

  it('says online play is unavailable when the server never answers', () => {
    const t = setup(create);
    for (let elapsed = 0; elapsed < UNAVAILABLE_MS; elapsed += 500) {
      t.last().drops();
      vi.advanceTimersByTime(500);
    }
    vi.advanceTimersByTime(UNAVAILABLE_MS);
    expect(t.statuses.at(-1)).toBe('unavailable');
    const count = t.sockets.length;
    vi.advanceTimersByTime(60_000);
    expect(t.sockets).toHaveLength(count);
  });

  it('stops and forgets the session on a final error', () => {
    const t = setup({ kind: 'resume', session: { serverUrl: 'wss://server.test/', code: 'K7MX', session: 'tok' } });
    t.last().serverOpens();
    t.last().serverSends({ type: 'error', code: 'session-expired' });
    expect(t.received.at(-1)).toEqual({ type: 'error', code: 'session-expired' });
    expect(t.statuses.at(-1)).toBe('closed');
    expect(loadSession(() => t.store)).toBeNull();
    t.last().drops();
    vi.advanceTimersByTime(60_000);
    expect(t.sockets).toHaveLength(1);
  });

  it('leaving tells the server and clears the session', () => {
    const t = setup(create);
    t.last().serverOpens();
    t.last().serverSends({ type: 'welcome', code: 'K7MX', session: 'tok', seat: 's1' });
    t.conn.leave();
    expect(t.last().messages.at(-1)).toEqual({ type: 'leave' });
    expect(loadSession(() => t.store)).toBeNull();
    expect(t.statuses.at(-1)).toBe('closed');
  });

  it('stops when another tab takes over the seat', () => {
    const t = setup(create);
    t.last().serverOpens();
    t.last().drops(4001);
    vi.advanceTimersByTime(60_000);
    expect(t.sockets).toHaveLength(1);
    expect(t.statuses.at(-1)).toBe('closed');
  });

  it('survives blocked storage', () => {
    const blocked = () => {
      throw new Error('SecurityError');
    };
    expect(loadSession(blocked)).toBeNull();
  });
});
