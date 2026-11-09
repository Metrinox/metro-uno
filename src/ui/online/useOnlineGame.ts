import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Action, RejectReason } from '../../engine/game';
import type { ClientMessage } from '../../shared/protocol';
import type { TableController } from '../game/tableController';
import { OnlineConnection, type SocketLike, type Target } from './connection';
import { initialOnlineState, onlineReducer, seatsOf, type OnlineState } from './onlineState';

export interface OnlineGame {
  state: OnlineState;
  /** The table controller, once a round has been dealt. */
  table: TableController | null;
  /** Sends a lobby or room message. */
  send: (msg: ClientMessage) => void;
  leave: () => void;
}

/**
 * Connects to the server for one online visit (create, join or resume) and
 * keeps the room and table state. Remount to connect again.
 */
export function useOnlineGame(
  serverUrl: string,
  target: Target,
  openSocket?: (url: string) => SocketLike,
): OnlineGame {
  const [state, dispatch] = useReducer(onlineReducer, initialOnlineState);
  const conn = useRef<OnlineConnection | null>(null);
  // The target is fixed for the life of this hook.
  const initial = useRef({ serverUrl, target, openSocket });

  useEffect(() => {
    const { serverUrl, target, openSocket } = initial.current;
    const c = new OnlineConnection({
      serverUrl,
      target,
      openSocket,
      onMessage: (msg) => dispatch({ type: 'server', msg }),
      onStatus: (status) => dispatch({ type: 'status', status }),
    });
    conn.current = c;
    return () => {
      c.dispose();
      conn.current = null;
    };
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    conn.current?.send(msg);
  }, []);
  const leave = useCallback(() => conn.current?.leave(), []);
  const sendAction = useCallback((action: Action) => send({ type: 'act', action }), [send]);
  const reject = useCallback((reason: RejectReason) => dispatch({ type: 'localReject', reason }), []);

  const seats = useMemo(() => seatsOf(state.room), [state.room]);
  const table = useMemo<TableController | null>(
    () => (state.view ? { view: state.view, seats, log: state.log, send: sendAction, reject } : null),
    [state.view, seats, state.log, sendAction, reject],
  );

  return { state, table, send, leave };
}
