import { useCallback, useMemo, useState } from 'react';
import type { Card } from '../engine/cards';
import { canPlay, isPlayable, lineChoices, sameNumberCards, topCard } from '../engine/game';
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
import { HUMAN_ID, useGameController, type GameConfig, type LogItem } from './useGameController';

interface Props {
  config: GameConfig;
  aiDelay: [number, number];
  onPlayAgain: () => void;
  onSetup: () => void;
}

export function displayName(id: string, t: Dict): string {
  if (id === HUMAN_ID) return t.you;
  return t.computer(Number(id.replace(/\D/g, '')));
}

function describe(item: LogItem, t: Dict, lang: Lang): string | null {
  const who = (id: string) => ({ who: displayName(id, t), you: id === HUMAN_ID });
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
    case 'rejected':
      return t.rejected[item.reason];
    case 'won':
    case 'turn':
      return null;
  }
}

export function GameScreen({ config, aiDelay, onPlayAgain, onSetup }: Props) {
  const { lang, t } = useLang();
  const { state, log, act, reject } = useGameController(config, { aiDelay });
  const [choosing, setChoosing] = useState<{ cards: Card[]; lines: string[] } | null>(null);
  const [grouping, setGrouping] = useState<{ first: Card; others: Card[] } | null>(null);
  const [unoArmed, setUnoArmed] = useState(false);

  const me = state.players.find((p) => p.id === HUMAN_ID)!;
  const myTurn = state.phase === 'playing' && state.players[state.turn]!.id === HUMAN_ID;
  const top = topCard(state);
  const hand = useMemo(() => me.hand.slice().sort(handOrder(network)), [me.hand]);
  const playableNow = (c: Card) =>
    myTurn && (state.drawnCardId === null || state.drawnCardId === c.id) && canPlay(c, state);
  // Two cards, or more when same-number cards can be played together.
  const unoAvailable = myTurn && me.hand.length >= 2 && (me.hand.length === 2 || state.rules.playSameNumbers);
  const pending = state.pendingDraw;
  const highlightStation =
    (top.kind === 'station' && top.line === state.currentLine) ||
    (top.kind === 'interchange' && top.lines.includes(state.currentLine))
      ? top.stationId
      : null;

  /** Plays `cards` in order (the last one sets the line). */
  const play = useCallback(
    (cards: Card[], chosenLine?: string) => {
      const [first, ...extras] = cards;
      const r = act(HUMAN_ID, {
        type: 'play',
        cardId: first!.id,
        ...(extras.length > 0 ? { extraCardIds: extras.map((c) => c.id) } : {}),
        chosenLine,
        callUno: unoArmed,
      });
      if (!r.ok) reject(r.reason);
      setUnoArmed(false);
    },
    [act, reject, unoArmed],
  );

  /** Asks for a line if the last card needs one, then plays. */
  const playWithLine = (cards: Card[]) => {
    const lines = lineChoices(cards[cards.length - 1]!, state.lines, state.currentLine);
    // Ask only when there is a real choice; a 2-line interchange changes line on its own.
    if (lines && lines.length > 1) setChoosing({ cards, lines });
    else play(cards, lines?.[0]);
  };

  const onCard = (card: Card) => {
    if (!myTurn) return reject('not-your-turn');
    if (state.drawnCardId !== null && state.drawnCardId !== card.id) {
      return reject(state.mustPlayDrawn ? 'must-play-drawn-card' : 'must-play-drawn-card-or-pass');
    }
    if (!canPlay(card, state)) return reject('not-playable');
    const others = state.rules.playSameNumbers && state.drawnCardId === null ? sameNumberCards(card, me.hand) : [];
    if (others.length > 0) setGrouping({ first: card, others: others.sort(handOrder(network)) });
    else playWithLine([card]);
  };

  const drawLabel = pending && myTurn ? t.drawN(pending.count) : t.draw;
  const doDraw = () => {
    const r = act(HUMAN_ID, { type: 'draw' });
    if (!r.ok) reject(r.reason);
  };

  const recent = log
    // A pending draw that resolved straight away is covered by the "drew" message that follows.
    .filter((item, i) => {
      if (item.type !== 'drawPending') return true;
      const next = log.slice(i + 1).find((e) => e.type !== 'turn');
      return !(next?.type === 'drew' && next.player === item.player && next.reason === 'stack');
    })
    .map((item) => ({ id: item.id, text: describe(item, t, lang), rejected: item.type === 'rejected' }))
    .filter((m) => m.text !== null)
    .slice(-3);
  const turnText = myTurn ? t.yourTurn : t.theirTurn(displayName(state.players[state.turn]!.id, t));
  const winner = state.winner;

  return (
    <div className="game">
      <header className="topbar">
        <h1 className="brand">{t.title}</h1>
        <ThemeToggle />
        <LangToggle />
        <button type="button" className="btn btn-quiet" onClick={onSetup}>
          {t.menu}
        </button>
      </header>

      <ul className="opponents" aria-label={t.opponents}>
        {state.players
          .filter((p) => p.id !== HUMAN_ID)
          .map((p) => {
            const active = state.players[state.turn]!.id === p.id && state.phase === 'playing';
            return (
              <li key={p.id} className={active ? 'opponent is-active' : 'opponent'} data-testid={`opponent-${p.id}`} aria-current={active ? 'true' : undefined}>
                <span className="opponent-name">{displayName(p.id, t)}</span>
                <span className="opponent-count" data-testid={`count-${p.id}`}>
                  {t.cards(p.hand.length)}
                </span>
              </li>
            );
          })}
      </ul>

      <section className="table" aria-label={t.currentLine}>
        <div className="table-info">
          <span className="label">{t.currentLine}</span>
          <LineBadge code={state.currentLine} testId="current-line" />
          <span className="direction" data-testid="direction" title={t.direction}>
            {state.direction === 1 ? '↻' : '↺'} {state.direction === 1 ? t.clockwise : t.anticlockwise}
          </span>
        </div>
        <CardView card={top} size="table" testId="discard-top" />
        <button
          type="button"
          className="draw-pile"
          onClick={doDraw}
          disabled={!myTurn || state.drawnCardId !== null}
          data-testid="draw-pile"
          aria-label={`${t.drawPile}: ${t.cards(state.drawPile.length)}. ${drawLabel}`}
        >
          <span className="draw-pile-back" aria-hidden>
            M
          </span>
          <span className="draw-pile-count">{state.drawPile.length}</span>
        </button>
      </section>

      <LineStrip line={state.currentLine} highlightStation={highlightStation} />

      <section className="status">
        <p className={myTurn ? 'turn is-mine' : 'turn'} data-testid="turn">
          {turnText}
          {myTurn && state.drawnCardId !== null && (
            <span className="hint"> · {state.mustPlayDrawn ? t.mustPlayHint : t.drawnHint}</span>
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
          disabled={!myTurn || state.drawnCardId !== null}
          onClick={doDraw}
          data-testid="draw"
        >
          {drawLabel}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!myTurn || state.drawnCardId === null || state.mustPlayDrawn}
          onClick={() => {
            const r = act(HUMAN_ID, { type: 'pass' });
            if (!r.ok) reject(r.reason);
          }}
          data-testid="pass"
        >
          {t.pass}
        </button>
      </section>

      <section className="hand" aria-label={`${t.you}: ${t.cards(hand.length)}`} data-testid="hand">
        {hand.map((c) => (
          <CardView key={c.id} card={c} playable={playableNow(c)} highlight={state.drawnCardId === c.id} onClick={() => onCard(c)} />
        ))}
      </section>

      {grouping && (
        <SameNumberChooser
          first={grouping.first}
          others={grouping.others}
          canLead={(c) => isPlayable(c, state.currentLine, state.face)}
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
            <h2 id="winner-title">{t.winner({ who: displayName(winner, t), you: winner === HUMAN_ID })}</h2>
            <div className="dialog-actions">
              <button type="button" className="btn btn-primary" onClick={onPlayAgain} autoFocus>
                {t.playAgain}
              </button>
              <button type="button" className="btn" onClick={onSetup}>
                {t.backToSetup}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
