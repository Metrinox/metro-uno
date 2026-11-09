/**
 * The online game server's entry point (design.md §2). Stateless: it checks
 * the request and routes it to the room's Durable Object.
 *
 *   GET /healthz           → 200 "ok"
 *   GET /rooms/new         → WebSocket into a newly reserved room
 *   GET /rooms/<CODE>      → WebSocket into an existing room
 */
import { isValidCode, normalizeCode, randomCode } from '../src/shared/rooms';

export { RoomObject } from './roomObject';

const CREATE_ATTEMPTS = 5;

function randomInt(n: number): number {
  // Rejection sampling keeps the result uniform.
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  const a = new Uint32Array(1);
  do crypto.getRandomValues(a);
  while (a[0]! >= limit);
  return a[0]! % n;
}

function allowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  return env.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .includes(origin);
}

function forward(stub: DurableObjectStub, request: Request, code: string): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.set('X-Room-Code', code);
  return stub.fetch(new Request(request.url, { headers, method: 'GET' }));
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/healthz') return new Response('ok');

    const match = /^\/rooms\/([^/]+)$/.exec(url.pathname);
    if (!match || request.method !== 'GET') return new Response('Not found', { status: 404 });
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected a WebSocket', { status: 426 });
    }
    if (!allowedOrigin(request, env)) return new Response('Forbidden', { status: 403 });

    if (match[1] === 'new') {
      for (let i = 0; i < CREATE_ATTEMPTS; i++) {
        const code = randomCode(randomInt);
        const stub = env.ROOMS.getByName(code);
        if (await stub.reserve(code)) return forward(stub, request, code);
      }
      return new Response('No room code available', { status: 503 });
    }

    const code = normalizeCode(decodeURIComponent(match[1]!));
    if (!isValidCode(code)) return new Response('Bad room code', { status: 400 });
    return forward(env.ROOMS.getByName(code), request, code);
  },
} satisfies ExportedHandler<Env>;
