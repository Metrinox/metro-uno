import { env } from 'cloudflare:workers';
import { evictDurableObject, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { networkById } from '../src/data/networks';
import { chooseAction } from '../src/engine/ai';
import { buildDeck } from '../src/engine/cards';
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

  it('carries on a room stored before maps existed as a Hong Kong room', async () => {
    const { host, code, session } = await createRoom('Mei');
    host.send({ type: 'addBot', seat: 1 });
    await host.next('room', (m) => m.room.seats[1]?.kind === 'bot');
    host.ws.close();
    const stub = stubFor(code);
    // Rewrite the stored room as the previous server saved it: no `map` field.
    await runInDurableObject(stub, async (_o: RoomObject, s) => {
      const old: Partial<RoomState> = { ...(await s.storage.get<RoomState>('room')) };
      delete old.map;
      await s.storage.put('room', old);
    });
    await evictDurableObject(stub);
    expect(await runInDurableObject(stub, (_o: RoomObject, s) => s.storage.get<RoomState>('room'))).not.toHaveProperty('map');

    const back = await connect(`/rooms/${code}`, session);
    expect((await back.next('room')).room.map).toBe('hk-mtr');
    back.send({ type: 'start' });
    const table = await back.next('table');
    const hongKong = new Set(buildDeck(networkById('hk-mtr')!).map((c) => c.id));
    expect(table.view.hand.length).toBeGreaterThan(0);
    expect(table.view.hand.every((c) => hongKong.has(c.id))).toBe(true);
    const saved = await runInDurableObject(stub, (_o: RoomObject, s) => s.storage.get<RoomState>('room'));
    expect(saved?.map).toBe('hk-mtr');
    expect(saved?.game?.lines).toEqual(networkById('hk-mtr')!.lines.map((l) => l.code));
    back.ws.close();
  });

  /** Starts a round with a computer player, then rewrites the stored round with `edit` and reloads the room. */
  async function storedRound(edit: (stored: RoomState & { game: Record<string, unknown> }) => void) {
    const { host, code, session } = await createRoom('Mei');
    host.send({ type: 'addBot', seat: 1 });
    await host.next('room', (m) => m.room.seats[1]?.kind === 'bot');
    host.send({ type: 'start' });
    await host.next('table');
    host.ws.close();
    const stub = stubFor(code);
    await runInDurableObject(stub, async (_o: RoomObject, s) => {
      const stored = (await s.storage.get<RoomState>('room'))!;
      edit(stored as RoomState & { game: Record<string, unknown> });
      await s.storage.put('room', stored);
    });
    await evictDurableObject(stub);
    return { stub, back: await connect(`/rooms/${code}`, session) };
  }

  it('carries on a round stored with one current line', async () => {
    let line = '';
    const { back } = await storedRound((stored) => {
      line = stored.game!.currentLines[0]!;
      const game = stored.game as Record<string, unknown>;
      game.currentLine = line;
      delete game.currentLines;
      delete game.sharedLines;
    });
    expect((await back.next('room')).room.phase).toBe('playing');
    const table = await back.next('table');
    expect(table.view.currentLines).toEqual([line]);
    expect(table.view.sharedLines).toEqual([]);
    back.ws.close();
  });

  it('ends a stored London round that has a merged-line card, keeping its players', async () => {
    const { stub, back } = await storedRound((stored) => {
      stored.map = 'london-underground';
      const game = stored.game as Record<string, unknown> & { players: { hand: unknown[] }[] };
      game.players[0]!.hand[0] = { id: 'act:terminus:SSR', kind: 'action', action: 'terminus', line: 'SSR' };
      game.currentLine = 'SSR';
      delete game.currentLines;
    });
    const room = (await back.next('room')).room;
    expect(room.phase).toBe('lobby');
    expect(room.seats.map((seat) => seat?.kind ?? null)).toEqual(['human', 'bot', null, null]);
    const saved = await runInDurableObject(stub, (_o: RoomObject, s) => s.storage.get<RoomState>('room'));
    expect(saved?.game ?? null).toBeNull();
    back.ws.close();
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
