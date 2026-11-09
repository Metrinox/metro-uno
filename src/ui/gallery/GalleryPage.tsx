import { useMemo, type ReactNode } from 'react';
import { buildDeck, type Card } from '../../engine/cards';
import { CardView } from '../cards/CardView';
import { lineName } from '../i18n/format';
import { LangToggle } from '../i18n/LangToggle';
import { ThemeToggle } from '../theme/ThemeToggle';
import { useLang } from '../i18n/LangContext';
import { LineBadge } from '../lines/LineBadge';
import { LineStrip } from '../lines/LineStrip';
import { network } from '../common/network';

interface Group {
  key: string;
  title: ReactNode;
  cards: Card[];
}

/** Every card, grouped: each line's stations (in line order) and actions, then interchanges, then wilds. */
function groupCards(deck: Card[]): Group[] {
  const groups: Group[] = network.lines.map((line) => {
    const order = new Map(line.stops.map((s, i) => [s.stationId, i]));
    const stations = deck
      .filter((c): c is Extract<Card, { kind: 'station' }> => c.kind === 'station' && c.line === line.code)
      .sort((a, b) => order.get(a.stationId)! - order.get(b.stationId)!);
    const actions = deck.filter((c) => c.kind === 'action' && c.line === line.code);
    return { key: line.code, title: <LineBadge code={line.code} />, cards: [...stations, ...actions] };
  });
  const interchanges = deck.filter((c) => c.kind === 'interchange');
  const wilds = deck.filter((c) => c.kind === 'wild');
  return [...groups, { key: 'interchanges', title: null, cards: interchanges }, { key: 'wilds', title: null, cards: wilds }];
}

/** Reference page at /gallery: every line and every card, for reviewing the artwork. */
export function GalleryPage() {
  const { lang, t } = useLang();
  const deck = useMemo(() => buildDeck(network), []);
  const groups = useMemo(() => groupCards(deck), [deck]);

  return (
    <main className="gallery">
      <header className="gallery-header">
        <div>
          <h1>{t.galleryTitle}</h1>
          <p className="subtitle">{t.galleryIntro(deck.length, network.lines.length)}</p>
        </div>
        <div className="gallery-header-controls">
          <ThemeToggle />
          <LangToggle />
        </div>
      </header>
      <a className="gallery-back" href="../">
        {t.backToGame}
      </a>

      <section aria-labelledby="lines-heading">
        <h2 id="lines-heading">{t.linesHeading}</h2>
        <ul className="gallery-lines">
          {network.lines.map((line) => (
            <li key={line.code} className="gallery-line" data-testid="gallery-line" data-line={line.code}>
              <div className="gallery-line-head">
                <LineBadge code={line.code} />
                <span className="gallery-line-alt">{lineName(network, line.code, lang === 'en' ? 'zh' : 'en')}</span>
                <span className="gallery-line-count">{t.stationCount(line.stops.length)}</span>
              </div>
              <LineStrip line={line.code} highlightStation={null} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cards-heading">
        <h2 id="cards-heading">{t.cardsHeading}</h2>
        {groups.map((g) => (
          <section key={g.key} className="gallery-group" data-group={g.key}>
            <h3>
              {g.key === 'interchanges' ? t.interchangesGroup : g.key === 'wilds' ? t.wildsGroup : g.title}{' '}
              <span className="gallery-count">{t.cards(g.cards.length)}</span>
            </h3>
            <div className="gallery-cards">
              {g.cards.map((c) => (
                <CardView key={c.id} card={c} />
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
