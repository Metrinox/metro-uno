import { DurableObject } from 'cloudflare:workers';
import { MAX_MESSAGE_BYTES, parseClientMessage, PING_TEXT, PONG_TEXT } from '../src/shared/protocol';
import { closedState, Room, STATE_VERSION, type Conn, type MessageContext, type Outcome, type RoomState } from './room';

/** What each hibernatable socket remembers about itself (survives hibernation). */
interface Attachment {
  id: string;
  seat: string | null;
  ready: boolean;
  lastSeen: number;
}

/** Messages per second before a connection is throttled, and before it is closed. */
const RATE_LIMIT = 30;
const RATE_CLOSE = RATE_LIMIT * 3;

const STORAGE_KEY = 'room';

function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return base64url(new Uint8Array(digest));
}

/**
 * One online room (design.md §2, §5). A thin adapter around the pure `Room`:
 * it loads and saves the room's state, accepts hibernatable sockets, and turns
 * socket events and alarms into `Room` calls.
 */
export class RoomObject extends DurableObject<Env> {
  private state: RoomState | null = null;
  /** Approximate per-connection rate counters; reset when the object hibernates. */
  private rates = new Map<string, { second: number; count: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const stored = await ctx.storage.get<RoomState>(STORAGE_KEY);
      if (stored && stored.version !== STATE_VERSION) {
        // Rooms saved by an older server version are closed.
        await ctx.storage.deleteAll();
        await ctx.storage.deleteAlarm();
      } else {
        this.state = stored ?? null;
      }
    });
    // Heartbeats are answered without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING_TEXT, PONG_TEXT));
  }

  private room(code: string): Room {
    const delay = Number(this.env.AI_DELAY_MS);
    return new Room(this.state ?? closedState(code), {
      aiDelayMs: Number.isFinite(delay) && delay >= 0 ? delay : 2000,
      randomSeed: () => randomHex(16),
      seedPrefix: this.env.ENVIRONMENT === 'test' && this.env.SEED_PREFIX ? this.env.SEED_PREFIX : null,
    });
  }

  private get code(): string {
    return this.state?.code ?? '';
  }

  /** Claims this room for a new game. False if it is already open. */
  async reserve(code: string): Promise<boolean> {
    const room = this.room(code);
    const ok = room.reserve(Date.now());
    if (ok) await this.commit(room, { send: [], attach: [], close: [], closed: false });
    return ok;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected a WebSocket', { status: 426 });
    }
    const code = request.headers.get('X-Room-Code') ?? this.code;
    const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
    const now = Date.now();
    const attachment: Attachment = { id: crypto.randomUUID(), seat: null, ready: false, lastSeen: now };
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(attachment);
    const room = this.room(code);
    await this.commit(room, room.connected(this.conns(), attachment.id, now));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const att = ws.deserializeAttachment() as Attachment;
    const now = Date.now();
    if (!this.allow(ws, att.id, now)) return;
    if (typeof data !== 'string' || new TextEncoder().encode(data).length > MAX_MESSAGE_BYTES) return; // dropped
    att.lastSeen = now;
    ws.serializeAttachment(att);

    const msg = parseClientMessage(data);
    // Async work first; the room update below then runs without interruption.
    const ctx: MessageContext = { now };
    if (msg?.type === 'createRoom' || msg?.type === 'joinRoom') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const token = base64url(bytes);
      ctx.newSession = { token, hash: await sha256(token) };
    } else if (msg?.type === 'hello' && msg.session) {
      ctx.sessionHash = await sha256(msg.session);
    }
    const room = this.room(this.code);
    await this.commit(room, room.message(this.conns(), att.id, msg, ctx));
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.gone(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.gone(ws);
  }

  async alarm(): Promise<void> {
    if (!this.state) return;
    const room = this.room(this.code);
    await this.commit(room, room.tick(this.conns(), Date.now()));
  }

  private async gone(ws: WebSocket) {
    if (!this.state) return;
    const id = (ws.deserializeAttachment() as Attachment | null)?.id;
    this.rates.delete(id ?? '');
    const room = this.room(this.code);
    const conns = this.conns().filter((c) => c.id !== id);
    await this.commit(room, room.disconnected(conns, Date.now()));
  }

  /** Open sockets as the room sees them. */
  private conns(except?: WebSocket): Conn[] {
    return this.ctx
      .getWebSockets()
      .filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN)
      .map((ws) => {
        const att = ws.deserializeAttachment() as Attachment;
        const pinged = this.ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() ?? 0;
        return { id: att.id, seat: att.seat, ready: att.ready, lastSeen: Math.max(att.lastSeen, pinged) };
      });
  }

  private socket(id: string): WebSocket | undefined {
    return this.ctx.getWebSockets().find((ws) => (ws.deserializeAttachment() as Attachment | null)?.id === id);
  }

  /** Drops messages over the rate limit, and closes connections far over it. */
  private allow(ws: WebSocket, id: string, now: number): boolean {
    const second = Math.floor(now / 1000);
    const r = this.rates.get(id);
    const count = r && r.second === second ? r.count + 1 : 1;
    this.rates.set(id, { second, count });
    if (count > RATE_CLOSE) ws.close(4002, 'rate limit');
    return count <= RATE_LIMIT;
  }

  /** Saves the room's new state first, then delivers its messages and sets the next alarm. */
  private async commit(room: Room, out: Outcome) {
    if (out.closed) {
      this.state = null;
    } else {
      this.state = room.state;
    }
    for (const a of out.attach) {
      const ws = this.socket(a.conn);
      if (!ws) continue;
      const att = ws.deserializeAttachment() as Attachment;
      ws.serializeAttachment({ ...att, seat: a.seat, ready: a.ready });
    }
    // Outgoing messages are held by the runtime until this write is confirmed.
    const saving = this.state ? this.ctx.storage.put(STORAGE_KEY, this.state) : this.ctx.storage.deleteAll();
    for (const { to, msg } of out.send) {
      try {
        this.socket(to)?.send(JSON.stringify(msg));
      } catch {
        /* the socket closed meanwhile */
      }
    }
    for (const c of out.close) {
      try {
        this.socket(c.conn)?.close(c.code, c.reason);
      } catch {
        /* already closed */
      }
    }
    await saving;
    const next = room.open ? room.nextDeadline() : null;
    if (next === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(next);
  }
}
