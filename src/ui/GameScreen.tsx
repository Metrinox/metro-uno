import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { Card } from '../engine/cards';
import { canPlay, isPlayable, lineChoices, sameNumberCards } from '../engine/game';
import { CardView } from './CardView';
import { cardName, handOrder, lineName } from './format';
import type { Dict, Lang } from './i18n';
import { LangToggle } from './LangToggle';
import { ThemeToggle } from './ThemeToggle';
import { LineBadge } from './LineBadge';
import { LineChooser } from './LineChooser';
import { LineStrip } from './LineStrip';
import { SameNumberChooser } from './SameNumberChooser';
import { useLang } from './LangContext';
import { network } from './network';
import { seatLabel, type LogItem, type SeatInfo, type TableController } from './tableController';

interface Props {
  controller: TableController;
  /** The top-bar button: back to setup (local) or leave the room (online). */
  menuLabel: string;
  onMenu: () => void;
  /** Buttons (and any note) shown under the results when the round ends. */
  endActions: ReactNode;
  /** Shown above the table, e.g. a connection banner. */
  banner?: ReactNode;
}

type Who = (id: string) => { who: string; you: boolean };

function describe(item: LogItem, t: Dict, lang: Lang, who: Who): string | null {
  switch (item.type) {
    case 'played':
      return t.ev.played(who(item.player), cardName(item.card, network, lang, t));
    case 'lineChanged':
      return t.ev.lineChanged(lineName(network, item.line, lang));
    case 'unoCalled':
      return t.ev.unoCalled(who(item.player));
    case 'drew':
      return t.ev.drew(who(item.player), item.count);
    case 'penalty':
      return t.ev.penalty(who(item.player), item.count);
    case 'skipped':
      return t.ev.skipped(who(item.player));
    case 'reversed':
      return t.ev.reversed;
    case 'reshuffled':
      return t.ev.reshuffled;
    case 'passed':
      return t.ev.passed(who(item.player));
    case 'drawPending':
      return t.ev.drawPending(who(item.player), item.count);
    case 'finished':
      return t.ev.finished(who(item.player), item.place);
    case 'rejected':
      return t.rejected[item.reason];
    case 'won':
    case 'turn':
      return null;
  }
}

export function GameScreen({ controller, menuLabel, onMenu, endActions, banner }: Props) {
  const { lang, t } = useLang();
  const { view, seats, log, send, reject } = controller;
  const [choosing, setChoosing] = useState<{ cards: Card[]; lines: string[] } | null>(null);
  const [grouping, setGrouping] = useState<{ first: Card; others: Card[] } | null>(null);
  const [unoArmed, setUnoArmed] = useState(false);

  const seatById = useMemo(() => new Map<string, SeatInfo>(seats.map((s) => [s.id, s])), [seats]);
  const nameOf = (id: string) => seatLabel(seatById.get(id), t);
  const who: Who = (id) => ({ who: nameOf(id), you: id === view.me });

  const myTurn = view.phase === 'playing' && view.turn === view.myIndex;
  const top = view.topCard;
  const hand = useMemo(() => view.hand.slice().sort(handOrder(network)), [view.hand]);
  const playableNow = (c: Card) =>
    myTurn && (view.drawnCardId === null || view.drawnCardId === c.id) && canPlay(c, view);
  // Two cards, or more when same-number cards can be played together.
  const unoAvailable = myTurn && view.hand.length >= 2 && (view.hand.length === 2 || view.rules.playSameNumbers);
  const pending = view.pendingDraw;
  const highlightStation =
    (top.kind === 'station' && top.line === view.currentLine) ||
    (top.kind === 'interchange' && top.lines.includes(view.currentLine))
      ? top.stationId
      : null;

/** Plays `cards` in order (the last one sets the line). */
  const play = useCallback(
    (cards: Card[], chosenLine?: string) => {
      const [first, ...extras] = cards;
      send({
        type: 'play',
        cardId: first!.id,
        ...(extras.length > 0 ? { extraCardIds: extras.map((c) => c.id) } : {}),
        chosenLine,
        callUno: unoArmed,
      });
      setUnoArmed(false);
    },
    [send, unoArmed],
  );

  /** Asks for a line if the last card needs one, then plays. */
  const playWithLine = (cards: Card[]) => {
    const lines = lineChoices(cards[cards.length - 1]!, view.lines, view.currentLine);
    // Ask only when there is a real choice; a 2-line interchange changes line on its own.
    if (lines && lines.length > 1) setChoosing({ cards, lines });
    else play(cards, lines?.[0]);
  };

  const onCard = (card: Card) => {
    if (!myTurn) return reject('not-your-turn');
    if (view.drawnCardId !== null && view.drawnCardId !== card.id) {
      return reject(view.mustPlayDrawn ? 'must-play-drawn-card' : 'must-play-drawn-card-or-pass');
    }
    if (!canPlay(card, view)) return reject('not-playable');
    const others = view.rules.playSameNumbers && view.drawnCardId === null ? sameNumberCards(card, view.hand) : [];
    if (others.length > 0) setGrouping({ first: card, others: others.sort(handOrder(network)) });
    else playWithLine([card]);
  };

  const drawLabel = pending && myTurn ? t.drawN(pending.count) : t.draw;
  const doDraw = () => send({ type: 'draw' });

  const recent = log
    // A pending draw that resolved straight away is covered by the "drew" message that follows.
    .filter((item, i) => {
      if (item.type !== 'drawPending') return true;
      const next = log.slice(i + 1).find((e) => e.type !== 'turn');
      return !(next?.type === 'drew' && next.player === item.player && next.reason === 'stack');
    })
    .map((item) => ({ id: item.id, text: describe(item, t, lang, who), rejected: item.type === 'rejected' }))
    .filter((m) => m.text !== null)
    .slice(-3);
  const turnText = myTurn ? t.yourTurn : t.theirTurn(nameOf(view.players[view.turn]!.id));
  const ended = view.phase === 'ended';
  const winner = ended ? view.winner : null;
  const placeOf = (id: string) => view.finished.indexOf(id) + 1;
  const myPlace = placeOf(view.me);
  // Finishing order, then anyone still holding cards (the last place).
  const standings = [
    ...view.finished,
    ...view.players.filter((p) => !view.finished.includes(p.id)).map((p) => p.id),
  ];

  return (
    <div className="game">
      <header className="topbar">
        <h1 className="brand">{t.title}</h1>
        <ThemeToggle />
        <LangToggle />
        <button type="button" className="btn btn-quiet" onClick={onMenu} data-testid="menu">
          {menuLabel}
        </button>
      </header>

      {banner}

      <ul className="opponents" aria-label={t.opponents}>
        {view.players
          .filter((p) => p.id !== view.me)
          .map((p) => {
            const active = view.players[view.turn]!.id === p.id && view.phase === 'playing';
            const seat = seatById.get(p.id);
            const away = seat !== undefined && !seat.connected;
            const classes = ['opponent', active && 'is-active', away && 'is-away'].filter(Boolean).join(' ');
            return (
              <li key={p.id} className={classes} data-testid={`opponent-${p.id}`} aria-current={active ? 'true' : undefined}>
                <span className="opponent-name">
                  {nameOf(p.id)}
                  {away && <span className="opponent-away"> · {t.away}</span>}
                </span>
                <span className="opponent-count" data-testid={`count-${p.id}`}>
                  {placeOf(p.id) > 0 ? t.place(placeOf(p.id)) : t.cards(p.cardCount)}
                </span>
              </li>
            );
          })}
      </ul>

      <section className="table" aria-label={t.currentLine}>
        <div className="table-info">
          <span className="label">{t.currentLine}</span>
          <LineBadge code={view.currentLine} testId="current-line" />
          <span className="direction" data-testid="direction" title={t.direction}>
            {view.direction === 1 ? '↻' : '↺'} {view.direction === 1 ? t.clockwise : t.anticlockwise}
          </span>
        </div>
        <CardView card={top} size="table" testId="discard-top" />
        <button
          type="button"
          className="draw-pile"
          onClick={doDraw}
          disabled={!myTurn || view.drawnCardId !== null}
          data-testid="draw-pile"
          aria-label={`${t.drawPile}: ${t.cards(view.drawPileCount)}. ${drawLabel}`}
        >
          <span className="draw-pile-back" aria-hidden>
            M
          </span>
          <span className="draw-pile-count">{view.drawPileCount}</span>
        </button>
      </section>

      <LineStrip line={view.currentLine} highlightStation={highlightStation} />

      <section className="status">
        {myPlace > 0 && !ended && (
          <p className="finished-note" role="status" data-testid="you-finished">
            {t.youFinished(myPlace)}
          </p>
        )}
        <p className={myTurn ? 'turn is-mine' : 'turn'} data-testid="turn">
          {turnText}
          {myTurn && view.drawnCardId !== null && (
            <span className="hint"> · {view.mustPlayDrawn ? t.mustPlayHint : t.drawnHint}</span>
          )}
        </p>
        {myTurn && pending && (
          <p className="pending" data-testid="pending" role="status">
            {t.pendingYou(pending.count)}
          </p>
        )}
        <ul className="log" aria-live="polite" data-testid="log">
          {recent.map((m) => (
            <li key={m.id} className={m.rejected ? 'is-rejected' : undefined}>
              {m.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="controls">
        <button
          type="button"
          className={unoArmed ? 'btn btn-uno is-armed' : 'btn btn-uno'}
          aria-pressed={unoArmed}
          disabled={!unoAvailable}
          onClick={() => setUnoArmed((v) => !v)}
          data-testid="uno"
        >
          {unoArmed ? t.unoArmed : t.uno}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!myTurn || view.drawnCardId !== null}
          onClick={doDraw}
          data-testid="draw"
        >
          {drawLabel}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!myTurn || view.drawnCardId === null || view.mustPlayDrawn}
          onClick={() => send({ type: 'pass' })}
          data-testid="pass"
        >
          {t.pass}
        </button>
      </section>

      <section className="hand" aria-label={`${t.you}: ${t.cards(hand.length)}`} data-testid="hand">
        {hand.map((c) => (
          <CardView key={c.id} card={c} playable={playableNow(c)} highlight={view.drawnCardId === c.id} onClick={() => onCard(c)} />
        ))}
      </section>

      {grouping && (
        <SameNumberChooser
          first={grouping.first}
          others={grouping.others}
          canLead={(c) => isPlayable(c, view.currentLine, view.face)}
          onCancel={() => setGrouping(null)}
          onPlay={(cards) => {
            setGrouping(null);
            playWithLine(cards);
          }}
        />
      )}

      {choosing && (
        <LineChooser
          lines={choosing.lines}
          onCancel={() => setChoosing(null)}
          onChoose={(line) => {
            const cards = choosing.cards;
            setChoosing(null);
            play(cards, line);
          }}
        />
      )}

      {winner && (
        <div className="overlay">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="winner-title" data-testid="end-screen">
            <h2 id="winner-title">{t.winner(who(winner))}</h2>
            {view.finished.length > 1 && (
              <ol className="standings" aria-label={t.standings} data-testid="standings">
                {standings.map((id) => (
                  <li key={id} className={id === view.me ? 'is-me' : undefined}>
                    {nameOf(id)}
                  </li>
                ))}
              </ol>
            )}
            {endActions}
          </div>
        </div>
      )}
    </div>
  );
}
