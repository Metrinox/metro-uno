/**
 * Rule-based computer opponent. Sees only a PlayerView (own hand plus public
 * information), never the full GameState.
 */
import type { Card } from './cards';
import { canPlay, drawCardType, lineChoices, sameNumberCards, type Action, type PlayerView } from './game';

/** Lines a card counts toward when judging "which line do I hold most of". */
function cardLines(card: Card): string[] {
  switch (card.kind) {
    case 'station':
    case 'action':
      return [card.line];
    case 'interchange':
      return card.lines;
    case 'wild':
      return [];
  }
}

function countOnLine(hand: readonly Card[], line: string): number {
  return hand.filter((c) => cardLines(c).includes(line)).length;
}

/** Picks the allowed line matching the most cards in `hand`; ties go to network line order. */
export function chooseLine(allowed: readonly string[], hand: readonly Card[], networkOrder: readonly string[]): string {
  const ordered = [...allowed].sort((a, b) => networkOrder.indexOf(a) - networkOrder.indexOf(b));
  let best = ordered[0]!;
  for (const line of ordered) if (countOnLine(hand, line) > countOnLine(hand, best)) best = line;
  return best;
}

function blocksNext(card: Card, playerCount: number): number {
  // Higher is better: how hard this card hits the next player.
  if (card.kind === 'action') {
    if (card.action === 'rush-hour') return 4;
    if (card.action === 'signal-fault') return 3;
    if (card.action === 'terminus' && playerCount === 2) return 2;
  }
  if (card.kind === 'wild' && card.wild === 'typhoon') return 1;
  return 0;
}

export function chooseAction(view: PlayerView): Action {
  /** Builds a play action for `cards` (first is the one matched; last sets the line). */
  const playCards = (cards: Card[]): Action => {
    const playedIds = new Set(cards.map((c) => c.id));
    const rest = view.hand.filter((c) => !playedIds.has(c.id));
    const last = cards[cards.length - 1]!;
    const choices = lineChoices(last, view.lines, view.currentLine);
    return {
      type: 'play',
      cardId: cards[0]!.id,
      ...(cards.length > 1 ? { extraCardIds: cards.slice(1).map((c) => c.id) } : {}),
      ...(choices ? { chosenLine: chooseLine(choices, rest, view.lines) } : {}),
      ...(rest.length === 1 ? { callUno: true } : {}),
    };
  };

  /** Adds same-number station cards when the rules allow, ending on the best line. */
  const withSameNumbers = (card: Card): Card[] => {
    const others = view.rules.playSameNumbers && view.drawnCardId === null ? sameNumberCards(card, view.hand) : [];
    if (others.length === 0) return [card];
    const group = [card, ...others];
    const rest = view.hand.filter((c) => !group.includes(c));
    const last = group.reduce((best, c) =>
      countOnLine(rest, cardLines(c)[0]!) > countOnLine(rest, cardLines(best)[0]!) ? c : best,
    );
    // The first card must be playable; put the chosen last card at the end if another can lead.
    const lead = group.find((c) => c !== last && canPlay(c, view)) ?? card;
    return [lead, ...group.filter((c) => c !== lead && c !== last), ...(lead === last ? [] : [last])];
  };

  if (view.drawnCardId !== null) {
    const drawn = view.hand.find((c) => c.id === view.drawnCardId);
    return drawn ? playCards([drawn]) : { type: 'pass' };
  }

  const legal = view.hand.filter((c) => canPlay(c, view));

  if (view.pendingDraw) {
    if (legal.length === 0) return { type: 'draw' };
    // Stack, keeping a Typhoon back when a Rush Hour will do.
    const rushHour = legal.find((c) => drawCardType(c) === 'rush-hour');
    return playCards([rushHour ?? legal[0]!]);
  }

  if (legal.length === 0) return { type: 'draw' };

  // Players who have gone out are skipped.
  const total = view.players.length;
  let nextIdx = view.myIndex;
  do nextIdx = (((nextIdx + view.direction) % total) + total) % total;
  while (view.finished.includes(view.players[nextIdx]!.id) && nextIdx !== view.myIndex);
  const n = total - view.finished.length;
  if (view.players[nextIdx]!.cardCount <= 2) {
    const blockers = legal
      .map((c) => ({ c, score: blocksNext(c, n) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    if (blockers[0]) return playCards([blockers[0].c]);
  }

  const nonWild = legal.filter((c) => c.kind !== 'wild');
  if (nonWild.length === 0) {
    const octopus = legal.find((c) => c.kind === 'wild' && c.wild === 'octopus');
    return playCards([octopus ?? legal[0]!]);
  }

  // Prefer the play that leaves us on a line we hold the most of (more cards shed breaks ties).
  let best: Card[] = [nonWild[0]!];
  let bestScore = -1;
  for (const c of nonWild) {
    const cards = withSameNumbers(c);
    const ids = new Set(cards.map((x) => x.id));
    const rest = view.hand.filter((h) => !ids.has(h.id));
    const last = cards[cards.length - 1]!;
    const choices = lineChoices(last, view.lines, view.currentLine);
    const landing = choices ? chooseLine(choices, rest, view.lines) : cardLines(last)[0]!;
    const score = countOnLine(rest, landing) * 10 + cards.length;
    if (score > bestScore) {
      best = cards;
      bestScore = score;
    }
  }
  return playCards(best);
}
