// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { DEFAULT_RULES, viewFor, createGame } from '../../engine/game';
import { hk } from '../../engine/test-helpers';
import type { RoomSnapshot, ServerMessage } from '../../shared/protocol';
import type { SocketLike } from './connection';
import { useOnlineGame } from './useOnlineGame';

class FakeSocket implements SocketLike {
  readyState = 0;
  sent: string[] = [];
  onopen: SocketLike['onopen'] = null;
  onmessage: SocketLike['onmessage'] = null;
  onclose: SocketLike['onclose'] = null;
  onerror: SocketLike['onerror'] = null;
  send(d: string) {
    this.sent.push(d);
  }
  close() {
    this.readyState = 3;
  }
}

const room: RoomSnapshot = {
  code: 'K7MX',
  phase: 'playing',
  rules: { ...DEFAULT_RULES },
  hostSeat: 's1',
  you: 's2',
  seats: [
    { id: 's1', name: 'Mei', kind: 'human', botNumber: 0, connected: false, standIn: false },
    { id: 's2', name: 'Ka Ho', kind: 'human', botNumber: 0, connected: true, standIn: false },
    { id: 's3', name: '', kind: 'bot', botNumber: 1, connected: true, standIn: false },
    null,
  ],
};

const game = createGame({
  network: hk,
  seed: 'online-hook',
  players: [
    { id: 's1', name: 'Mei', isHuman: true },
    { id: 's2', name: 'Ka Ho', isHuman: true },
    { id: 's3', name: 'Computer 1', isHuman: false },
  ],
});

function setup() {
  const socket = new FakeSocket();
  const hook = renderHook(() => useOnlineGame('wss://server.test', { kind: 'join', code: 'K7MX', name: 'Ka Ho' }, () => socket));
  const deliver = (msg: ServerMessage) =>
    act(() => {
      socket.onmessage?.({ data: JSON.stringify(msg) });
    });
  act(() => {
    socket.readyState = 1;
    socket.onopen?.({});
  });
  return { socket, hook, deliver };
}

describe('useOnlineGame', () => {
  it('has no table until a round is dealt', () => {
    const { hook, deliver } = setup();
    expect(hook.result.current.state.status).toBe('open');
    deliver({ type: 'room', room: { ...room, phase: 'lobby' } });
    expect(hook.result.current.state.room?.code).toBe('K7MX');
    expect(hook.result.current.table).toBeNull();
  });

  it('builds the table from the room and the latest view', () => {
    const { hook, deliver } = setup();
    deliver({ type: 'room', room });
    deliver({ type: 'table', view: viewFor(game, 's2'), events: [] });
    const table = hook.result.current.table!;
    expect(table.view.me).toBe('s2');
    expect(table.seats.map((s) => [s.id, s.name, s.kind, s.connected, s.isMe, s.isHost])).toEqual([
      ['s1', 'Mei', 'human', false, false, true],
      ['s2', 'Ka Ho', 'human', true, true, false],
      ['s3', '', 'bot', true, false, false],
    ]);
  });

  it('sends moves as act messages and logs rejections', () => {
    const { socket, hook, deliver } = setup();
    deliver({ type: 'room', room });
    deliver({ type: 'table', view: viewFor(game, 's2'), events: [] });
    act(() => hook.result.current.table!.send({ type: 'draw' }));
    expect(JSON.parse(socket.sent.at(-1)!)).toEqual({ type: 'act', action: { type: 'draw' } });
    deliver({ type: 'rejected', reason: 'not-your-turn' });
    expect(hook.result.current.table!.log.at(-1)).toMatchObject({ type: 'rejected', reason: 'not-your-turn' });
  });

  it('keeps lobby refusals out of the table log', () => {
    const { hook, deliver } = setup();
    deliver({ type: 'room', room: { ...room, phase: 'lobby' } });
    deliver({ type: 'rejected', reason: 'not-host' });
    expect(hook.result.current.state.notice?.reason).toBe('not-host');
    expect(hook.result.current.state.log).toEqual([]);
  });

  it('reports a final error', () => {
    const { hook, deliver } = setup();
    deliver({ type: 'error', code: 'room-full' });
    expect(hook.result.current.state.error).toBe('room-full');
    expect(hook.result.current.state.status).toBe('closed');
  });
});
