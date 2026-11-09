import type { Card } from '../../engine/cards';
import { cardLabel, stationName, textOn } from '../i18n/format';
import { useLang } from '../i18n/LangContext';
import { network } from '../common/network';
import { OctopusLogo } from './OctopusLogo';
import { SkipIcon } from './SkipIcon';
import { TerminusIcon } from './TerminusIcon';

const ACTION_ICON = { 'signal-fault': <SkipIcon />, terminus: <TerminusIcon />, 'rush-hour': '+2' } as const;

/** A line's colour band; merged lines show each label in its own colour. */
function Band({ code }: { code: string }) {
  const labels = network.lineByCode[code]!.labels;
  return (
    <span className="card-band" data-line={code}>
      {labels.map((l) => (
        <span key={l.code} className="card-band-part" style={{ background: l.colour, color: textOn(l.colour) }}>
          {l.code}
        </span>
      ))}
    </span>
  );
}

/** "⇢ ISL TWL": lines a walkway transfer can switch to. */
function TransferMarker({ lines }: { lines: string[] }) {
  return (
    <span className="card-transfer" data-testid="card-transfer">
      <span aria-hidden>⇢</span>
      {lines.flatMap((code) =>
        network.lineByCode[code]!.labels.map((l) => (
          <span key={l.code} className="card-transfer-line" style={{ background: l.colour, color: textOn(l.colour) }}>
            {l.code}
          </span>
        )),
      )}
    </span>
  );
}

interface Props {
  card: Card;
  size?: 'hand' | 'table';
  playable?: boolean;
  highlight?: boolean;
  onClick?: () => void;
  testId?: string;
}

export function CardView({ card, size = 'hand', playable, highlight, onClick, testId }: Props) {
  const { lang, t } = useLang();
  const label = cardLabel(card, network, lang, t);
  const cls = ['card', `card-${size}`, `card-${card.kind}`];
  if (card.kind === 'wild') cls.push(`card-${card.wild}`);
  if (playable) cls.push('is-playable');
  if (highlight) cls.push('is-drawn');

  let body;
  switch (card.kind) {
    case 'station':
      body = (
        <>
          <Band code={card.line} />
          {card.transferLines && <TransferMarker lines={card.transferLines} />}
          <span className="card-number">{card.number}</span>
          <span className="card-name">{stationName(network, card.stationId, lang)}</span>
        </>
      );
      break;
    case 'interchange':
      body = (
        <>
          <span className="card-bands">
            {card.lines.map((l) => (
              <Band key={l} code={l} />
            ))}
          </span>
          {card.transferLines && <TransferMarker lines={card.transferLines} />}
          <span className="card-icon" aria-hidden>
            ⇄
          </span>
          <span className="card-name">{stationName(network, card.stationId, lang)}</span>
        </>
      );
      break;
    case 'action':
      body = (
        <>
          <Band code={card.line} />
          <span className="card-icon" aria-hidden>
            {ACTION_ICON[card.action]}
          </span>
          <span className="card-name">{t.actionName[card.action]}</span>
        </>
      );
      break;
    case 'wild': {
      if (card.wild === 'octopus') {
        body = (
          <>
            <span className="octopus-title" aria-hidden>
              八達通
            </span>
            <OctopusLogo className="octopus-logo" />
            <span className="card-name">{t.wildName.octopus}</span>
          </>
        );
        break;
      }
      const stops = network.lines.map((l) => l.colour).join(', ');
      body = (
        <>
          <span className="card-wild-ring" style={{ background: `conic-gradient(${stops}, ${network.lines[0]!.colour})` }} />
          <span className="card-icon" aria-hidden>
            +4
          </span>
          <span className="card-name">{t.wildName[card.wild]}</span>
        </>
      );
      break;
    }
  }

  if (onClick) {
    return (
      <button type="button" className={cls.join(' ')} aria-label={label} onClick={onClick} data-testid={testId} data-card={card.id}>
        {body}
      </button>
    );
  }
  return (
    <div className={cls.join(' ')} role="img" aria-label={label} data-testid={testId} data-card={card.id}>
      {body}
    </div>
  );
}
