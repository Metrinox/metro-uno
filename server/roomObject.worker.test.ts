import { env } from 'cloudflare:workers';
import { evictDurableObject, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { chooseAction } from '../src/engine/ai';
import { MAX_MESSAGE_BYTES, PROTOCOL_VERSION } from '../src/shared/protocol';
import type { RoomState } from './room';
import type { RoomObject } from './roomObject';
import { connect, createRoom, joinRoom, sleep } from './test-client';

const stubFor = (code: string) => env.ROOMS.getByName(code);

describe('room object', () => {
  it('keeps the room in storage across a fresh instance', async () => {
    const { host, code } = await createRoom('Mei');
    const stub = stubFor(code);
    await evictDurableObject(stub);
    const stored = await runInDurableObject(stub, (_o: RoomObject, state) => state.storage.get<RoomState>('room'));
    expect(stored?.seats[0]).toMatchObject({ name: 'Mei', kind: 'human' });
    // The reloaded room still works.
    const guest = await joinRoom(code, 'Ka Ho');
    const room = await guest.next('room');
    expect(room.room.seats.map((s) => s?.name ?? null)).toEqual(['Mei', 'Ka Ho', null, null]);
    host.ws.close();
    guest.ws.close();
  });

  it('keeps two rooms apart', async () => {
    const a = await createRoom('Mei');
    const b = await createRoom('Sam');
    expect(a.code).not.toBe(b.code);
    const guest = await joinRoom(a.code, 'Ka Ho');
    await guest.next('room');
    const bRoom = await runInDurableObject(stubFor(b.code), (_o: RoomObject, s) => s.storage.get<RoomState>('room'));
    expect(bRoom?.seats.filter(Boolean).map((s) => s!.name)).toEqual(['Sam']);
    for (const c of [a.host, b.host, guest]) c.ws.close();
  });

  it('runs computer moves from its alarm', async () => {
    const { host, code } = await createRoom('Mei');
    host.send({ type: 'addBot', seat: 1 });
    await host.next('room', (m) => m.room.seats[1]?.kind === 'bot');
    host.send({ type: 'start' });
    await host.next('table');
    // Only the alarm moves a computer seat. With no pause the alarm may fire by
    // itself before the test runs it, so look for the move anywhere in the round,
    // playing our own turns as they come.
    const botMove = () =>
      host.inbox.find(
        (m) => m.type === 'table' && m.events.some((e) => (e.type === 'played' || e.type === 'drew') && e.player === 's2'),
      );
    let answered = -1;
    for (let i = 0; i < 500 && !botMove(); i++) {
      const latest = host.inbox.findLastIndex((m) => m.type === 'table');
      const table = host.inbox[latest];
      if (latest > answered && table?.type === 'table' && table.view.phase === 'playing' && table.view.turn === table.view.myIndex) {
        answered = latest;
        host.send({ type: 'act', action: chooseAction(table.view) });
      }
      await runDurableObjectAlarm(stubFor(code));
      await sleep(5);
    }
    expect(botMove()).toBeTruthy();
    host.ws.close();
  });

  it('drops oversized messages and answers malformed ones', async () => {
    const { host, code } = await createRoom('Mei');
    const before = await runInDurableObject(stubFor(code), (_o: RoomObject, s) => s.storage.get<RoomState>('room'));
    const seen = host.inbox.length;
    host.send(JSON.stringify({ type: 'joinRoom', name: 'x'.repeat(MAX_MESSAGE_BYTES) }));
    await sleep(100);
    expect(host.inbox.length).toBe(seen);
    host.send('{"type":"cheat"}');
    expect(await host.next('error', () => true, seen)).toEqual({ type: 'error', code: 'bad-message' });
    const after = await runInDurableObject(stubFor(code), (_o: RoomObject, s) => s.storage.get<RoomState>('room'));
    expect(after).toEqual(before);
    host.ws.close();
  });

  it('closes clients with the wrong protocol version', async () => {
    const { host, code } = await createRoom('Mei');
    const old = await connect(`/rooms/${code}`);
    old.send({ type: 'hello', protocol: PROTOCOL_VERSION + 1 });
    expect(await old.next('error', (m) => m.code === 'version')).toBeTruthy();
    await old.waitClosed();
    host.ws.close();
  });

  it('forgets an expired room', async () => {
    const { host, code } = await createRoom('Mei');
    host.ws.close();
    const stub = stubFor(code);
    // Bring the 5-minute expiry forward instead of waiting for it.
    let ready = false;
    for (let i = 0; i < 200 && !ready; i++) {
      ready = await runInDurableObject(stub, async (o: RoomObject, s) => {
        const state = (o as unknown as { state: RoomState | null }).state;
        if (!state || state.deadlines.expiry === null) return false;
        state.deadlines = { ai: null, host: null, presence: null, expiry: 1 };
        await s.storage.setAlarm(Date.now());
        return true;
      });
      if (!ready) await sleep(10);
    }
    expect(ready).toBe(true);
    await runDurableObjectAlarm(stub);
    expect(await runInDurableObject(stub, (_o: RoomObject, s) => s.storage.get('room'))).toBeUndefined();
    const late = await connect(`/rooms/${code}`);
    expect(await late.next('error')).toEqual({ type: 'error', code: 'room-not-found' });
  });
});
