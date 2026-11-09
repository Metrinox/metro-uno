import { exports } from 'cloudflare:workers';
import { isValidCode } from '../src/shared/rooms';
import { createRoom, joinRoom, upgrade } from './test-client';

describe('worker routing', () => {
  it('answers the health check', async () => {
    const res = await exports.default.fetch('http://server.test/healthz');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('returns 404 for unknown paths', async () => {
    expect((await exports.default.fetch('http://server.test/nope')).status).toBe(404);
  });

  it('requires a WebSocket upgrade', async () => {
    const res = await exports.default.fetch('http://server.test/rooms/new', { headers: { Origin: 'http://localhost:5173' } });
    expect(res.status).toBe(426);
  });

  it('refuses other sites, and requests with no origin', async () => {
    expect((await upgrade('/rooms/new', 'https://evil.example')).status).toBe(403);
    expect((await upgrade('/rooms/new', null)).status).toBe(403);
  });

  it('refuses malformed room codes', async () => {
    for (const code of ['K0MX', 'TOOLONG', 'AB']) expect((await upgrade(`/rooms/${code}`)).status).toBe(400);
  });

  it('creates a room with a valid code', async () => {
    const { host, code } = await createRoom();
    expect(isValidCode(code)).toBe(true);
    host.ws.close();
  });

  it('finds a room by its code typed in lower case', async () => {
    const { host, code } = await createRoom('Mei');
    const guest = await joinRoom(code.toLowerCase(), 'Ka Ho');
    const welcome = await guest.next('welcome');
    expect(welcome.code).toBe(code);
    host.ws.close();
    guest.ws.close();
  });
});
