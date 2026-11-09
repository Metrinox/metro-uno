// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createGame, DEFAULT_RULES, viewFor } from '../../engine/game';
import { hk } from '../../engine/test-helpers';
import type { RoomSnapshot, ServerMessage } from '../../shared/protocol';
import { LangProvider } from '../i18n/LangContext';
import { loadRules, saveRules } from '../common/settings';
import type { SocketLike } from './connection';
import { Lobby } from './Lobby';
import { OnlineGame } from './OnlineGame';
import { OnlineMenu } from './OnlineMenu';

const wrap = (ui: ReactNode) => render(<LangProvider>{ui}</LangProvider>);

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
  get messages() {
    return this.sent.map((s) => JSON.parse(s) as { type: string });
  }
}

const seats: RoomSnapshot['seats'] = [
  { id: 's1', name: 'Mei', kind: 'human', botNumber: 0, connected: true, standIn: false },
  { id: 's2', name: 'Ka Ho', kind: 'human', botNumber: 0, connected: false, standIn: false },
  { id: 's3', name: '', kind: 'bot', botNumber: 1, connected: true, standIn: false },
  null,
];
const lobby = (you: string, over: Partial<RoomSnapshot> = {}): RoomSnapshot => ({
  code: 'K7MX',
  phase: 'lobby',
  rules: { ...DEFAULT_RULES },
  hostSeat: 's1',
  seats,
  you,
  ...over,
});

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
  window.history.replaceState(null, '', '/');
});

describe('App and the online option', () => {
  async function renderApp() {
    const { App } = await import('../App');
    const { LangProvider: Provider } = await import('../i18n/LangContext');
    return render(
      <Provider>
        <App />
      </Provider>,
    );
  }

  it('hides Play online when built without a server', async () => {
    vi.stubEnv('VITE_SERVER_URL', '');
    await renderApp();
    expect(screen.getByTestId('start')).toBeTruthy();
    expect(screen.queryByTestId('play-online')).toBeNull();
  });

  it('shows Play online when built with a server', async () => {
    vi.stubEnv('VITE_SERVER_URL', 'wss://server.test');
    await renderApp();
    fireEvent.click(screen.getByTestId('play-online'));
    expect(screen.getByTestId('create-room')).toBeTruthy();
  });

  it('opens a share link with the code filled in', async () => {
    vi.stubEnv('VITE_SERVER_URL', 'wss://server.test');
    window.history.replaceState(null, '', '/?room=k7mx');
    await renderApp();
    expect((screen.getByTestId('room-code') as HTMLInputElement).value).toBe('K7MX');
    expect(screen.queryByTestId('create-room')).toBeNull();
  });
});

describe('OnlineMenu', () => {
  it('asks for a name, then creates a room with the cleaned name', () => {
    const onCreate = vi.fn();
    wrap(<OnlineMenu onCreate={onCreate} onJoin={vi.fn()} onBack={vi.fn()} />);
    fireEvent.click(screen.getByTestId('create-room'));
    expect(screen.getByTestId('online-message').textContent).toMatch(/name/i);
    expect(onCreate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('online-name'), { target: { value: '  Mei  ' } });
    fireEvent.click(screen.getByTestId('create-room'));
    expect(onCreate).toHaveBeenCalledWith('Mei');
  });

  it('checks the room code before joining', () => {
    const onJoin = vi.fn();
    wrap(<OnlineMenu onCreate={vi.fn()} onJoin={onJoin} onBack={vi.fn()} />);
    fireEvent.change(screen.getByTestId('online-name'), { target: { value: 'Ka Ho' } });
    fireEvent.change(screen.getByTestId('room-code'), { target: { value: 'K0M' } });
    fireEvent.click(screen.getByTestId('join-room'));
    expect(screen.getByTestId('online-message').textContent).toMatch(/4 letters/);
    fireEvent.change(screen.getByTestId('room-code'), { target: { value: 'k7mx' } });
    fireEvent.click(screen.getByTestId('join-room'));
    expect(onJoin).toHaveBeenCalledWith('K7MX', 'Ka Ho');
  });
});

describe('Lobby', () => {
  const props = { shareUrl: 'https://metro-uno.test/?room=K7MX', notice: null, onLeave: vi.fn() };

  it('gives the host the controls', () => {
    const send = vi.fn();
    const onRulesChanged = vi.fn();
    wrap(<Lobby {...props} room={lobby('s1')} send={send} onRulesChanged={onRulesChanged} />);
    expect(screen.getByTestId('lobby-code').textContent).toBe('K7MX');
    expect(screen.getByTestId('seat-0').textContent).toMatch(/Mei.*You.*Host/);
    expect(screen.getByTestId('seat-1').textContent).toMatch(/Ka Ho.*away/);
    expect(screen.getByTestId('seat-2').textContent).toMatch(/Computer 1/);
    fireEvent.click(screen.getByTestId('add-bot-3'));
    expect(send).toHaveBeenLastCalledWith({ type: 'addBot', seat: 3 });
    fireEvent.click(screen.getByTestId('remove-1'));
    expect(send).toHaveBeenLastCalledWith({ type: 'removeSeat', seat: 1 });
    expect(screen.queryByTestId('remove-0')).toBeNull();
    fireEvent.click(screen.getByTestId('rule-drawUntilPlayable'));
    expect(send).toHaveBeenLastCalledWith({ type: 'setRules', rules: { ...DEFAULT_RULES, drawUntilPlayable: true } });
    expect(onRulesChanged).toHaveBeenCalledWith({ ...DEFAULT_RULES, drawUntilPlayable: true });
    fireEvent.click(screen.getByTestId('start-online'));
    expect(send).toHaveBeenLastCalledWith({ type: 'start' });
  });

  it('disables Start until 2 seats are taken', () => {
    wrap(<Lobby {...props} room={lobby('s1', { seats: [seats[0]!, null, null, null] })} send={vi.fn()} onRulesChanged={vi.fn()} />);
    expect((screen.getByTestId('start-online') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows guests a read-only lobby', () => {
    wrap(<Lobby {...props} room={lobby('s2')} send={vi.fn()} onRulesChanged={vi.fn()} />);
    expect(screen.queryByTestId('start-online')).toBeNull();
    expect(screen.queryByTestId('add-bot-3')).toBeNull();
    expect(screen.queryByTestId('remove-0')).toBeNull();
    expect((screen.getByTestId('rule-drawUntilPlayable') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByTestId('lobby-wait').textContent).toMatch(/host/i);
  });
});

describe('OnlineGame', () => {
  function setup() {
    const socket = new FakeSocket();
    const onExit = vi.fn();
    wrap(
      <OnlineGame
        serverUrl="wss://server.test"
        target={{ kind: 'join', code: 'K7MX', name: 'Ka Ho' }}
        shareUrl={(c) => `https://metro-uno.test/?room=${c}`}
        onExit={onExit}
        openSocket={() => socket}
      />,
    );
    act(() => {
      socket.readyState = 1;
      socket.onopen?.({});
    });
    const deliver = (msg: ServerMessage) => act(() => socket.onmessage?.({ data: JSON.stringify(msg) }));
    return { socket, onExit, deliver };
  }

  const ended = (you: string) => {
    const game = createGame({
      network: hk,
      seed: 'end',
      players: [
        { id: 's1', name: 'Mei', isHuman: true },
        { id: 's2', name: 'Ka Ho', isHuman: true },
      ],
    });
    return { ...viewFor(game, you), phase: 'ended' as const, winner: 's1', finished: ['s1'] };
  };

  it('never writes a guest’s remembered rules', () => {
    saveRules({ ...DEFAULT_RULES, handSize: 9 });
    const { deliver } = setup();
    deliver({ type: 'room', room: lobby('s2', { rules: { ...DEFAULT_RULES, handSize: 7 } }) });
    expect(screen.getByTestId('hand-size').textContent).toBe('7');
    expect(loadRules().handSize).toBe(9);
  });

  it('offers the host Play again and Back to lobby at the end of a round', () => {
    const { socket, deliver } = setup();
    deliver({ type: 'room', room: lobby('s1', { phase: 'ended' }) });
    deliver({ type: 'table', view: ended('s1'), events: [] });
    expect(screen.getByTestId('end-screen')).toBeTruthy();
    fireEvent.click(screen.getByTestId('play-again-online'));
    expect(socket.messages.at(-1)).toEqual({ type: 'playAgain' });
    fireEvent.click(screen.getByTestId('back-to-lobby'));
    expect(socket.messages.at(-1)).toEqual({ type: 'backToLobby' });
    expect(screen.getByTestId('leave-room-end')).toBeTruthy();
    expect(screen.queryByTestId('waiting-for-host')).toBeNull();
  });

  it('shows a guest only Leave room and a note at the end of a round', () => {
    const { socket, onExit, deliver } = setup();
    deliver({ type: 'room', room: lobby('s2', { phase: 'ended' }) });
    deliver({ type: 'table', view: ended('s2'), events: [] });
    expect(screen.queryByTestId('play-again-online')).toBeNull();
    expect(screen.queryByTestId('back-to-lobby')).toBeNull();
    expect(screen.getByTestId('waiting-for-host')).toBeTruthy();
    fireEvent.click(screen.getByTestId('leave-room-end'));
    expect(socket.messages.at(-1)).toEqual({ type: 'leave' });
    expect(onExit).toHaveBeenCalledWith(null);
  });

  it('shows the reconnecting banner at the table', () => {
    const { socket, deliver } = setup();
    deliver({ type: 'room', room: lobby('s2', { phase: 'playing' }) });
    deliver({ type: 'table', view: { ...ended('s2'), phase: 'playing', winner: null, finished: [] }, events: [] });
    act(() => {
      socket.readyState = 3;
      socket.onclose?.({ code: 1006, reason: '' });
    });
    expect(screen.getByTestId('connection-banner').textContent).toMatch(/Reconnecting/);
  });

  it.each([['room-not-found'], ['room-full'], ['in-progress'], ['kicked']] as const)('leaves with the %s error', (code) => {
    const { onExit, deliver } = setup();
    deliver({ type: 'error', code });
    expect(onExit).toHaveBeenCalledWith(code);
  });
});
