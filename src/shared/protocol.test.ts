import { MAX_MESSAGE_BYTES, parseClientMessage, parseServerMessage, PING_TEXT, PROTOCOL_VERSION } from './protocol';

const j = (v: unknown) => JSON.stringify(v);

describe('parseClientMessage', () => {
  it.each([
    [{ type: 'hello', protocol: PROTOCOL_VERSION }],
    [{ type: 'hello', protocol: PROTOCOL_VERSION, session: 'abc' }],
    [{ type: 'createRoom', name: 'Mei', rules: { handSize: 5, drawUntilPlayable: true } }],
    [{ type: 'joinRoom', name: 'Ka Ho' }],
    [{ type: 'setRules', rules: {} }],
    [{ type: 'addBot', seat: 3 }],
    [{ type: 'removeSeat', seat: 0 }],
    [{ type: 'start' }],
    [{ type: 'playAgain' }],
    [{ type: 'backToLobby' }],
    [{ type: 'leave' }],
    [{ type: 'act', action: { type: 'draw' } }],
    [{ type: 'act', action: { type: 'pass' } }],
    [{ type: 'act', action: { type: 'play', cardId: 'st-ISL-3', extraCardIds: ['st-TML-3'], chosenLine: 'TML', callUno: true } }],
  ])('accepts %j', (msg) => {
    expect(parseClientMessage(j(msg))).toEqual(msg);
  });

  it('accepts the exact heartbeat text', () => {
    expect(parseClientMessage(PING_TEXT)).toEqual({ type: 'ping' });
  });

  it('drops extra fields', () => {
    expect(parseClientMessage(j({ type: 'start', seat: 1, evil: true }))).toEqual({ type: 'start' });
  });

  it.each([
    ['not JSON', 'nope{'],
    ['not an object', j([1, 2])],
    ['a non-string', 42],
    ['an unknown type', j({ type: 'cheat' })],
    ['hello without a version', j({ type: 'hello' })],
    ['a non-string name', j({ type: 'joinRoom', name: 7 })],
    ['an unknown rule', j({ type: 'setRules', rules: { godMode: true } })],
    ['a rule of the wrong type', j({ type: 'setRules', rules: { handSize: 'seven' } })],
    ['a seat out of range', j({ type: 'addBot', seat: 4 })],
    ['a fractional seat', j({ type: 'addBot', seat: 1.5 })],
    ['an unknown action', j({ type: 'act', action: { type: 'win' } })],
    ['a play with no card', j({ type: 'act', action: { type: 'play' } })],
    ['a play with a bad extra card', j({ type: 'act', action: { type: 'play', cardId: 'a', extraCardIds: [1] } })],
    ['an over-long card id', j({ type: 'act', action: { type: 'play', cardId: 'x'.repeat(65) } })],
  ])('rejects %s', (_, text) => {
    expect(parseClientMessage(text)).toBeNull();
  });

  it('rejects messages over the size limit', () => {
    const big = j({ type: 'joinRoom', name: 'x'.repeat(MAX_MESSAGE_BYTES) });
    expect(parseClientMessage(big)).toBeNull();
  });
});

describe('parseServerMessage', () => {
  const seat = { id: 's1', name: 'Mei', kind: 'human', botNumber: 0, connected: true, standIn: false };
  const room = { code: 'K7MX', phase: 'lobby', rules: { handSize: 7 }, hostSeat: 's1', seats: [seat, null, null, null], you: 's1' };

  it.each([
    [{ type: 'welcome', code: 'K7MX', session: 'tok', seat: 's1' }],
    [{ type: 'room', room }],
    [{ type: 'rejected', reason: 'not-your-turn' }],
    [{ type: 'error', code: 'room-full' }],
    [{ type: 'pong' }],
  ])('accepts %j', (msg) => {
    expect(parseServerMessage(j(msg))).toEqual(msg);
  });

  it('accepts a table message with a usable view', () => {
    const view = { me: 's1', hand: [], players: [], turn: 0, topCard: { id: 'w', kind: 'wild', wild: 'octopus' } };
    expect(parseServerMessage(j({ type: 'table', view, events: [] }))).toMatchObject({ type: 'table' });
  });

  it.each([
    ['an unknown error code', j({ type: 'error', code: 'oops' })],
    ['a room with the wrong number of seats', j({ type: 'room', room: { ...room, seats: [seat] } })],
    ['a table without a view', j({ type: 'table', events: [] })],
    ['garbage', '}{'],
  ])('rejects %s', (_, text) => {
    expect(parseServerMessage(text)).toBeNull();
  });
});
