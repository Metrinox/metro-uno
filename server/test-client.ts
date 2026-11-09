/** A WebSocket test client for the Workers-runtime tests. */
import { exports } from 'cloudflare:workers';
import { parseServerMessage, PROTOCOL_VERSION, type ClientMessage, type ServerMessage } from '../src/shared/protocol';

export const ORIGIN = 'http://localhost:5173';

export function upgrade(path: string, origin: string | null = ORIGIN): Promise<Response> {
  const headers: Record<string, string> = { Upgrade: 'websocket' };
  if (origin) headers.Origin = origin;
  return exports.default.fetch(`http://server.test${path}`, { headers });
}

export interface TestClient {
  ws: WebSocket;
  inbox: ServerMessage[];
  closed: { code: number; reason: string } | null;
  send(msg: ClientMessage | string): void;
  /** Waits for the first message (from `from` onwards) of this type that matches. */
  next<T extends ServerMessage['type']>(
    type: T,
    match?: (m: Extract<ServerMessage, { type: T }>) => boolean,
    from?: number,
  ): Promise<Extract<ServerMessage, { type: T }>>;
  waitClosed(): Promise<{ code: number; reason: string }>;
}

export async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function until<T>(get: () => T | undefined | null | false, what: string, timeoutMs = 5000): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = get();
    if (v) return v;
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}`);
    await sleep(5);
  }
}

/** Opens a socket to `path` and says hello. */
export async function connect(path: string, session?: string): Promise<TestClient> {
  const res = await upgrade(path);
  if (res.status !== 101 || !res.webSocket) throw new Error(`Upgrade failed: ${res.status}`);
  const ws = res.webSocket;
  ws.accept();
  const client: TestClient = {
    ws,
    inbox: [],
    closed: null,
    send: (msg) => ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg)),
    next: (type, match = () => true, from = 0) =>
      until(
        () =>
          client.inbox
            .slice(from)
            .find((m): m is Extract<ServerMessage, { type: typeof type }> => m.type === type && match(m as never)),
        `a ${type} message`,
      ),
    waitClosed: () => until(() => client.closed, 'the socket to close'),
  };
  ws.addEventListener('message', (e) => {
    const msg = parseServerMessage(e.data);
    if (msg) client.inbox.push(msg);
  });
  ws.addEventListener('close', (e) => {
    client.closed = { code: e.code, reason: e.reason };
  });
  client.send({ type: 'hello', protocol: PROTOCOL_VERSION, ...(session ? { session } : {}) });
  return client;
}

/** Creates a room as `name`; returns the client and the room code. */
export async function createRoom(name = 'Mei', rules = {}) {
  const host = await connect('/rooms/new');
  host.send({ type: 'createRoom', name, rules });
  const welcome = await host.next('welcome');
  await host.next('room');
  return { host, code: welcome.code, session: welcome.session };
}

export async function joinRoom(code: string, name: string) {
  const c = await connect(`/rooms/${code}`);
  c.send({ type: 'joinRoom', name });
  return c;
}
