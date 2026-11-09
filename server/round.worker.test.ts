import { chooseAction } from '../src/engine/ai';
import type { ServerMessage } from '../src/shared/protocol';
import { createRoom, joinRoom, until, type TestClient } from './test-client';

/**
 * Answers every table update that says it is this client's turn with a legal
 * move, after a short pause so the client stays under the server's rate limit.
 */
function autoPlay(client: TestClient) {
  client.ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data as string) as ServerMessage;
    if (msg.type !== 'table') return;
    const { view } = msg;
    if (view.phase === 'playing' && view.turn === view.myIndex) {
      setTimeout(() => client.send({ type: 'act', action: chooseAction(view) }), 40);
    }
  });
}

describe('a whole online round', () => {
  it('two players and a computer play a seeded round to the end', async () => {
    const { host, code } = await createRoom('Mei');
    const guest = await joinRoom(code, 'Ka Ho');
    await host.next('room', (m) => m.room.seats[1]?.name === 'Ka Ho');
    host.send({ type: 'addBot', seat: 2 });
    await host.next('room', (m) => m.room.seats[2]?.kind === 'bot');
    autoPlay(host);
    autoPlay(guest);
    host.send({ type: 'start' });

    const ended = (c: TestClient) => c.inbox.some((m) => m.type === 'room' && m.room.phase === 'ended');
    await until(() => ended(host) && ended(guest), 'the round to end', 30_000);

    const lastView = (c: TestClient) => c.inbox.filter((m) => m.type === 'table').at(-1);
    for (const c of [host, guest]) {
      const t = lastView(c);
      expect(t?.type === 'table' && t.view.phase).toBe('ended');
      expect(t?.type === 'table' && t.view.winner).toMatch(/^s[123]$/);
    }
    // Nobody's moves were refused: every move was legal and in turn.
    const refused = [...host.inbox, ...guest.inbox].filter((m) => m.type === 'rejected' && m.reason !== 'not-your-turn');
    expect(refused).toEqual([]);
    host.ws.close();
    guest.ws.close();
  }, 40_000);
});
