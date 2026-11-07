import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '../engine/cards';
import { CardView } from './CardView';
import { useLang } from './LangContext';
import { LineBadge } from './LineBadge';

interface Props {
  /** The card the player tapped (playable). */
  first: Card;
  /** Other station cards in hand with the same number. */
  others: Card[];
  /** Whether a card could lead the play (matches the current line or number). */
  canLead: (card: Card) => boolean;
  /** Called with the cards in play order; the last one sets the line. */
  onPlay: (cards: Card[]) => void;
  onCancel: () => void;
}

/** Orders `group` so it ends on `last` and starts with a card that can lead; null if impossible. */
export function orderForPlay(group: Card[], last: Card, canLead: (c: Card) => boolean): Card[] | null {
  if (group.length === 1) return group;
  const lead = group.find((c) => c !== last && canLead(c));
  if (!lead) return null;
  return [lead, ...group.filter((c) => c !== lead && c !== last), last];
}

export function SameNumberChooser({ first, others, canLead, onPlay, onCancel }: Props) {
  const { t } = useLang();
  const [added, setAdded] = useState<string[]>(() => others.map((c) => c.id));
  const group = useMemo(() => [first, ...others.filter((c) => added.includes(c.id))], [first, others, added]);
  const endable = group.filter((c) => orderForPlay(group, c, canLead) !== null);
  const [lastId, setLastId] = useState<string>(() => others[others.length - 1]?.id ?? first.id);
  const last = endable.find((c) => c.id === lastId) ?? endable[endable.length - 1] ?? first;
  const order = orderForPlay(group, last, canLead) ?? [first];
  const number = first.kind === 'station' ? first.number : 0;

  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="overlay">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="same-number-title" ref={dialog} data-testid="same-number">
        <h2 id="same-number-title">{t.sameNumberTitle(number)}</h2>

        <fieldset className="same-number-cards">
          <legend>{t.sameNumberAdd}</legend>
          {others.map((c) => {
            const on = added.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={on ? 'pick is-on' : 'pick'}
                aria-pressed={on}
                onClick={() => setAdded((a) => (on ? a.filter((id) => id !== c.id) : [...a, c.id]))}
                data-pick={c.id}
              >
                <CardView card={c} />
              </button>
            );
          })}
        </fieldset>

        {group.length > 1 && (
          <fieldset className="end-on">
            <legend>{t.endOn}</legend>
            {endable.map((c) => (
              <label key={c.id} className="end-option">
                <input type="radio" name="end-on" checked={c === last} onChange={() => setLastId(c.id)} data-end={c.id} />
                {c.kind === 'station' && <LineBadge code={c.line} />}
              </label>
            ))}
          </fieldset>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn-primary" onClick={() => onPlay(order)} data-testid="play-selected">
            {t.play}
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
