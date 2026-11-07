/**
 * Metro Uno rules engine.
 *
 * Pure and deterministic: `applyAction` takes a state and returns a new state
 * plus events, or a rejection that leaves the given state untouched. State is
 * plain JSON so a future server can store and send it.
 */
import type { Network } from '../data/network';
import { buildDeck, type ActionType, type Card } from './cards';
import { seedFrom, shuffle, type RngState } from './rng';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const UNO_PENALTY = 1;
export const HAND_SIZE_MIN = 3;
export const HAND_SIZE_MAX = 15;

// ---------------------------------------------------------------------------
// House rules

export interface HouseRules {
  /** Cards dealt to each player. */
  handSize: number;
  /** Keep drawing until a playable card turns up, then play it. */
  drawUntilPlayable: boolean;
  /** When drawing one card, whether a playable drawn card may be played at once. */
  playDrawnCard: boolean;
  /** Whether Rush Hour (+2) and Typhoon (+4) may be stacked on each other. */
  mixDrawStacking: boolean;
  /** Whether several station cards with the same number may be played together. */
  playSameNumbers: boolean;
}

export const DEFAULT_RULES: Readonly<HouseRules> = {
  handSize: 7,
  drawUntilPlayable: false,
  playDrawnCard: false,
  mixDrawStacking: true,
  playSameNumbers: true,
};

/** Fills in defaults and clamps the hand size into range. */
export function normalizeRules(partial: Partial<HouseRules> = {}): HouseRules {
  const r = { ...DEFAULT_RULES, ...partial };
  const size = Number.isFinite(r.handSize) ? Math.round(r.handSize) : DEFAULT_RULES.handSize;
  return {
    handSize: Math.min(HAND_SIZE_MAX, Math.max(HAND_SIZE_MIN, size)),
    drawUntilPlayable: !!r.drawUntilPlayable,
    playDrawnCard: !!r.playDrawnCard,
    mixDrawStacking: !!r.mixDrawStacking,
    playSameNumbers: !!r.playSameNumbers,
  };
}

// ---------------------------------------------------------------------------
// State

export type Face = { kind: 'number'; n: number } | { kind: 'action'; action: ActionType } | { kind: 'none' };

export type DrawCardType = 'rush-hour' | 'typhoon';

/** Cards owed by the current player from stacked Rush Hour / Typhoon cards. */
export interface PendingDraw {
  count: number;
  /** Type of the draw card on top of the stack. */
  last: DrawCardType;
}

export interface PlayerState {
  id: string;
  name: string;
  isHuman: boolean;
  hand: Card[];
}

export interface GameState {
  rules: HouseRules;
  /** Line codes in the network, in display order; wilds may choose any of them. */
  lines: string[];
  players: PlayerState[];
  drawPile: Card[];
  /** Discard pile; the last element is the top card. */
  discard: Card[];
  currentLine: string;
  face: Face;
  /** Index into `players` of whose turn it is. */
  turn: number;
  direction: 1 | -1;
  rng: RngState;
  phase: 'playing' | 'ended';
  winner: string | null;
  /** Draw owed by the current player, if a draw card was played on them. */
  pendingDraw: PendingDraw | null;
  /** Set after the current player draws a playable card they may (or must) play. */
  drawnCardId: string | null;
  /** True when the drawn card must be played (draw-until-playable). */
  mustPlayDrawn: boolean;
  /** Number of turns started so far (for safety limits). */
  turnCount: number;
}

export type Action =
  | { type: 'play'; cardId: string; extraCardIds?: string[]; chosenLine?: string; callUno?: boolean }
  | { type: 'draw' }
  | { type: 'pass' };

export type DrawReason = 'turn' | 'stack' | 'penalty';

export type GameEvent =
  | { type: 'played'; player: string; card: Card }
  | { type: 'lineChanged'; player: string; line: string }
  | { type: 'unoCalled'; player: string }
  | { type: 'drew'; player: string; count: number; reason: DrawReason }
  | { type: 'drawPending'; player: string; count: number }
  | { type: 'penalty'; player: string; count: number }
  | { type: 'skipped'; player: string }
  | { type: 'reversed'; direction: 1 | -1 }
  | { type: 'reshuffled'; count: number }
  | { type: 'passed'; player: string }
  | { type: 'won'; player: string }
  | { type: 'turn'; player: string };

export type RejectReason =
  | 'game-over'
  | 'not-your-turn'
  | 'unknown-player'
  | 'card-not-in-hand'
  | 'not-playable'
  | 'must-play-drawn-card-or-pass'
  | 'must-play-drawn-card'
  | 'line-choice-required'
  | 'invalid-line'
  | 'already-drew'
  | 'cannot-pass'
  | 'cannot-play-together';

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; reason: RejectReason };

export interface PlayerSetup {
  id: string;
  name: string;
  isHuman: boolean;
}

// ---------------------------------------------------------------------------
// Matching

/** Whether `card` matches the current line and face (ignoring any pending draw). */
export function isPlayable(card: Card, line: string, face: Face): boolean {
  switch (card.kind) {
    case 'station':
      return card.line === line || (face.kind === 'number' && face.n === card.number);
    case 'interchange':
      return card.lines.includes(line);
    case 'action':
      return card.line === line || (face.kind === 'action' && face.action === card.action);
    case 'wild':
      return true;
  }
}

export function drawCardType(card: Card): DrawCardType | null {
  if (card.kind === 'action' && card.action === 'rush-hour') return 'rush-hour';
  if (card.kind === 'wild' && card.wild === 'typhoon') return 'typhoon';
  return null;
}

/** Whether `card` may be stacked on a pending draw. */
export function canStack(card: Card, pending: PendingDraw, rules: HouseRules): boolean {
  const type = drawCardType(card);
  return type !== null && (type === pending.last || rules.mixDrawStacking);
}

/** The parts of a state (or a player's view) that decide what can be played. */
export interface PlayContext {
  currentLine: string;
  face: Face;
  pendingDraw: PendingDraw | null;
  rules: HouseRules;
}

/** Whether `card` may be played now, including the pending-draw restriction. */
export function canPlay(card: Card, ctx: PlayContext): boolean {
  if (ctx.pendingDraw) return canStack(card, ctx.pendingDraw, ctx.rules);
  return isPlayable(card, ctx.currentLine, ctx.face);
}

/** Other station cards in `hand` that could be played together with `card`. */
export function sameNumberCards(card: Card, hand: readonly Card[]): Card[] {
  if (card.kind !== 'station') return [];
  return hand.filter((c) => c.id !== card.id && c.kind === 'station' && c.number === card.number);
}

/**
 * Lines `card` may change to, or null for cards that set their own line.
 * An interchange must change line, so the current line is never offered;
 * a 2-line interchange therefore has exactly one choice. A transfer station
 * switches to its transfer lines. Wilds may pick any line.
 */
export function lineChoices(card: Card, allLines: readonly string[], currentLine: string): string[] | null {
  if (card.kind === 'interchange') return [...card.lines, ...(card.transferLines ?? [])].filter((l) => l !== currentLine);
  if (card.kind === 'station' && card.transferLines) return [...card.transferLines];
  if (card.kind === 'wild') return [...allLines];
  return null;
}

export function topCard(state: GameState): Card {
  return state.discard[state.discard.length - 1]!;
}

export function currentPlayer(state: GameState): PlayerState {
  return state.players[state.turn]!;
}

// ---------------------------------------------------------------------------
// Setup

export interface NewGameOptions {
  network: Network;
  players: PlayerSetup[];
  seed: string | number;
  rules?: Partial<HouseRules>;
}

export function createGame({ network, players, seed, rules: partialRules }: NewGameOptions): GameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`A round needs ${MIN_PLAYERS}–${MAX_PLAYERS} players, got ${players.length}`);
  }
  if (new Set(players.map((p) => p.id)).size !== players.length) throw new Error('Player ids must be unique');
  const rules = normalizeRules(partialRules);

  let [pile, rng] = shuffle(buildDeck(network), seedFrom(seed));
  if (pile.length <= players.length * rules.handSize) throw new Error('Not enough cards to deal');
  const hands: Card[][] = players.map(() => []);
  for (let round = 0; round < rules.handSize; round++) {
    for (const hand of hands) hand.push(pile.shift()!);
  }

  // Turn cards until a single-line station card appears; shuffle the rest back.
  const turnedOver: Card[] = [];
  let start: Card | undefined;
  while ((start = pile.shift())) {
    if (start.kind === 'station') break;
    turnedOver.push(start);
  }
  if (!start || start.kind !== 'station') throw new Error('Deck has no single-line station card to start with');
  if (turnedOver.length > 0) [pile, rng] = shuffle([...pile, ...turnedOver], rng);

  return {
    rules,
    lines: network.lines.map((l) => l.code),
    players: players.map((p, i) => ({ ...p, hand: hands[i]! })),
    drawPile: pile,
    discard: [start],
    currentLine: start.line,
    face: { kind: 'number', n: start.number },
    turn: 0,
    direction: 1,
    rng,
    phase: 'playing',
    winner: null,
    pendingDraw: null,
    drawnCardId: null,
    mustPlayDrawn: false,
    turnCount: 1,
  };
}

// ---------------------------------------------------------------------------
// Actions

export function applyAction(state: GameState, playerId: string, action: Action): ActionResult {
  if (state.phase !== 'playing') return reject('game-over');
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return reject('unknown-player');
  if (idx !== state.turn) return reject('not-your-turn');

  switch (action.type) {
    case 'play':
      return play(state, idx, action);
    case 'draw':
      return draw(state, idx);
    case 'pass':
      return pass(state, idx);
  }
}

function reject(reason: RejectReason): ActionResult {
  return { ok: false, reason };
}

function play(state: GameState, idx: number, action: Extract<Action, { type: 'play' }>): ActionResult {
  const player = state.players[idx]!;
  const card = player.hand.find((c) => c.id === action.cardId);
  if (!card) return reject('card-not-in-hand');
  if (state.drawnCardId !== null && card.id !== state.drawnCardId) {
    return reject(state.mustPlayDrawn ? 'must-play-drawn-card' : 'must-play-drawn-card-or-pass');
  }
  if (!canPlay(card, state)) return reject('not-playable');

  // Extra same-number cards.
  const extraIds = action.extraCardIds ?? [];
  const extras: Card[] = [];
  if (extraIds.length > 0) {
    if (!state.rules.playSameNumbers || state.drawnCardId !== null || card.kind !== 'station') {
      return reject('cannot-play-together');
    }
    for (const id of extraIds) {
      const extra = player.hand.find((c) => c.id === id);
      if (!extra) return reject('card-not-in-hand');
      if (id === card.id || extras.some((e) => e.id === id)) return reject('cannot-play-together');
      if (extra.kind !== 'station' || extra.number !== card.number) return reject('cannot-play-together');
      extras.push(extra);
    }
  }
  const played = [card, ...extras];
  const last = played[played.length - 1]!;

  const choices = lineChoices(last, state.lines, state.currentLine);
  let newLine: string | undefined;
  if (choices) {
    // Only one possible line (a 2-line interchange): no choice needed.
    newLine = action.chosenLine ?? (choices.length === 1 ? choices[0] : undefined);
    if (newLine === undefined) return reject('line-choice-required');
    if (!choices.includes(newLine)) return reject('invalid-line');
  }

  const s = cloneState(state);
  const me = s.players[idx]!;
  const events: GameEvent[] = [];
  const playedIds = new Set(played.map((c) => c.id));
  me.hand = me.hand.filter((c) => !playedIds.has(c.id));
  for (const c of played) {
    s.discard.push(c);
    events.push({ type: 'played', player: me.id, card: c });
  }
  s.drawnCardId = null;
  s.mustPlayDrawn = false;

  // New line and face, set by the last card played.
  const prevLine = s.currentLine;
  switch (last.kind) {
    case 'station':
      // A transfer station switches to the chosen transfer line; the number stays.
      s.currentLine = newLine ?? last.line;
      s.face = { kind: 'number', n: last.number };
      break;
    case 'action':
      s.currentLine = last.line;
      s.face = { kind: 'action', action: last.action };
      break;
    case 'interchange':
    case 'wild':
      s.currentLine = newLine!;
      s.face = { kind: 'none' };
      break;
  }
  if (s.currentLine !== prevLine) events.push({ type: 'lineChanged', player: me.id, line: s.currentLine });

  const missedUno = me.hand.length === 1 && !action.callUno;
  if (me.hand.length === 1 && action.callUno) events.push({ type: 'unoCalled', player: me.id });

  // Effects on the next player.
  const n = s.players.length;
  let advance = 1;
  const drawType = drawCardType(last);
  if (drawType) {
    const count = (s.pendingDraw?.count ?? 0) + (drawType === 'rush-hour' ? 2 : 4);
    s.pendingDraw = { count, last: drawType };
    events.push({ type: 'drawPending', player: s.players[nextIndex(s, idx, 1)]!.id, count });
  } else if (last.kind === 'action' && last.action === 'signal-fault') {
    events.push({ type: 'skipped', player: s.players[nextIndex(s, idx, 1)]!.id });
    advance = 2;
  } else if (last.kind === 'action' && last.action === 'terminus') {
    s.direction = s.direction === 1 ? -1 : 1;
    events.push({ type: 'reversed', direction: s.direction });
    if (n === 2) {
      events.push({ type: 'skipped', player: s.players[nextIndex(s, idx, 1)]!.id });
      advance = 2;
    }
  }

  if (me.hand.length === 0) {
    // The last card's effect still lands before the round ends.
    if (s.pendingDraw) takePendingDraw(s, nextIndex(s, idx, 1), events);
    s.phase = 'ended';
    s.winner = me.id;
    events.push({ type: 'won', player: me.id });
    return { ok: true, state: s, events };
  }

  if (missedUno) {
    const got = drawInto(s, idx, UNO_PENALTY, events);
    events.push({ type: 'penalty', player: me.id, count: got });
  }

  beginTurn(s, nextIndex(s, idx, advance), events);
  return { ok: true, state: s, events };
}

function draw(state: GameState, idx: number): ActionResult {
  if (state.drawnCardId !== null) return reject('already-drew');
  const s = cloneState(state);
  const events: GameEvent[] = [];
  const me = s.players[idx]!;

  if (s.pendingDraw) {
    takePendingDraw(s, idx, events);
    beginTurn(s, nextIndex(s, idx, 1), events);
    return { ok: true, state: s, events };
  }

  if (s.rules.drawUntilPlayable) {
    let got = 0;
    let found: Card | null = null;
    while (drawInto(s, idx, 1, events) === 1) {
      got++;
      const c = me.hand[me.hand.length - 1]!;
      if (canPlay(c, s)) {
        found = c;
        break;
      }
    }
    events.push({ type: 'drew', player: me.id, count: got, reason: 'turn' });
    if (found) {
      s.drawnCardId = found.id;
      s.mustPlayDrawn = true;
    } else {
      events.push({ type: 'passed', player: me.id });
      beginTurn(s, nextIndex(s, idx, 1), events);
    }
    return { ok: true, state: s, events };
  }

  const got = drawInto(s, idx, 1, events);
  events.push({ type: 'drew', player: me.id, count: got, reason: 'turn' });
  const drawn = got === 1 ? me.hand[me.hand.length - 1]! : null;
  if (drawn && s.rules.playDrawnCard && canPlay(drawn, s)) {
    s.drawnCardId = drawn.id;
  } else {
    events.push({ type: 'passed', player: me.id });
    beginTurn(s, nextIndex(s, idx, 1), events);
  }
  return { ok: true, state: s, events };
}

function pass(state: GameState, idx: number): ActionResult {
  if (state.drawnCardId === null) return reject('cannot-pass');
  if (state.mustPlayDrawn) return reject('must-play-drawn-card');
  const s = cloneState(state);
  const events: GameEvent[] = [{ type: 'passed', player: s.players[idx]!.id }];
  beginTurn(s, nextIndex(s, idx, 1), events);
  return { ok: true, state: s, events };
}

// ---------------------------------------------------------------------------
// Helpers (mutate the cloned state `s`)

/**
 * Copies everything an action may mutate. Card objects are never mutated, so
 * they are shared between states.
 */
function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, hand: p.hand.slice() })),
    drawPile: state.drawPile.slice(),
    discard: state.discard.slice(),
    face: { ...state.face },
    pendingDraw: state.pendingDraw && { ...state.pendingDraw },
  };
}

function nextIndex(s: GameState, from: number, steps: number): number {
  const n = s.players.length;
  return (((from + s.direction * steps) % n) + n) % n;
}

function startTurn(s: GameState, idx: number, events: GameEvent[]) {
  s.turn = idx;
  s.drawnCardId = null;
  s.mustPlayDrawn = false;
  s.turnCount++;
  events.push({ type: 'turn', player: s.players[idx]!.id });
}

/**
 * Starts a turn. If a draw is pending and the player has nothing to stack,
 * they take it at once and lose the turn.
 */
function beginTurn(s: GameState, idx: number, events: GameEvent[]) {
  startTurn(s, idx, events);
  const pending = s.pendingDraw;
  if (pending && !s.players[idx]!.hand.some((c) => canStack(c, pending, s.rules))) {
    takePendingDraw(s, idx, events);
    startTurn(s, nextIndex(s, idx, 1), events);
  }
}

/** The player draws the whole pending total and is skipped. Does not start the next turn. */
function takePendingDraw(s: GameState, idx: number, events: GameEvent[]) {
  const count = s.pendingDraw?.count ?? 0;
  s.pendingDraw = null;
  const got = drawInto(s, idx, count, events);
  events.push({ type: 'drew', player: s.players[idx]!.id, count: got, reason: 'stack' });
  events.push({ type: 'skipped', player: s.players[idx]!.id });
}

/** Draws up to `count` cards into a hand, reshuffling the discard pile if needed. Returns cards drawn. */
function drawInto(s: GameState, idx: number, count: number, events: GameEvent[]): number {
  let got = 0;
  for (let i = 0; i < count; i++) {
    if (s.drawPile.length === 0) {
      const rest = s.discard.slice(0, -1);
      if (rest.length === 0) break;
      [s.drawPile, s.rng] = shuffle(rest, s.rng);
      s.discard = [topCard(s)];
      events.push({ type: 'reshuffled', count: rest.length });
    }
    s.players[idx]!.hand.push(s.drawPile.shift()!);
    got++;
  }
  return got;
}

// ---------------------------------------------------------------------------
// Per-player view (hidden information)

export interface OpponentView {
  id: string;
  name: string;
  isHuman: boolean;
  cardCount: number;
}

export interface PlayerView extends PlayContext {
  me: string;
  hand: Card[];
  players: OpponentView[];
  /** Index into `players` of whose turn it is. */
  turn: number;
  myIndex: number;
  direction: 1 | -1;
  topCard: Card;
  lines: string[];
  drawPileCount: number;
  discardCount: number;
  phase: GameState['phase'];
  winner: string | null;
  /** The card the viewer just drew and may play (only set on the viewer's own turn). */
  drawnCardId: string | null;
  mustPlayDrawn: boolean;
}

export function viewFor(state: GameState, playerId: string): PlayerView {
  const myIndex = state.players.findIndex((p) => p.id === playerId);
  if (myIndex < 0) throw new Error(`Unknown player ${playerId}`);
  const myTurn = myIndex === state.turn;
  return {
    me: playerId,
    hand: state.players[myIndex]!.hand.slice(),
    players: state.players.map((p) => ({ id: p.id, name: p.name, isHuman: p.isHuman, cardCount: p.hand.length })),
    turn: state.turn,
    myIndex,
    direction: state.direction,
    topCard: topCard(state),
    currentLine: state.currentLine,
    face: { ...state.face },
    pendingDraw: state.pendingDraw && { ...state.pendingDraw },
    rules: { ...state.rules },
    lines: [...state.lines],
    drawPileCount: state.drawPile.length,
    discardCount: state.discard.length,
    phase: state.phase,
    winner: state.winner,
    drawnCardId: myTurn ? state.drawnCardId : null,
    mustPlayDrawn: myTurn && state.mustPlayDrawn,
  };
}
