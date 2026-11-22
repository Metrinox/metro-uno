import { useMemo, useState, type ReactNode } from 'react';
import type { Network } from '../../data/network';
import { NETWORKS, networkOrDefault } from '../../data/networks';
import { buildDeck, type Card } from '../../engine/cards';
import { CardView } from '../cards/CardView';
import { lineName } from '../i18n/format';
import { LangToggle } from '../i18n/LangToggle';
import { ThemeToggle } from '../theme/ThemeToggle';
import { useLang } from '../i18n/LangContext';
import { LineBadge } from '../lines/LineBadge';
import { LineStrip } from '../lines/LineStrip';
import { NetworkProvider, useNetwork } from '../common/NetworkContext';
import { localName } from '../i18n/i18n';

interface Group {
  key: string;
  title: ReactNode;
  cards: Card[];
}

/** Every card, grouped: each line's stations (in line order) and actions, then interchanges, then wilds. */
function groupCards(deck: Card[], network: Network): Group[] {
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

/** The map named by the page's `?map=` link parameter (Hong Kong when missing or unknown). */
function mapFromUrl(): Network {
  return networkOrDefault(new URLSearchParams(window.location.search).get('map'));
}

/** Writes the chosen map into `?map=`, keeping the rest of the link, so a reload or shared link keeps it. */
function writeMapToUrl(id: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('map', id);
  window.history.replaceState(window.history.state, '', url);
}

/** Reference page at /gallery: every line and every card of the chosen map, for reviewing the artwork. */
export function GalleryPage() {
  const [network, setNetwork] = useState(mapFromUrl);
  const choose = (n: Network) => {
    setNetwork(n);
    writeMapToUrl(n.id);
  };
  return (
    <NetworkProvider network={network}>
      <GalleryContent onChooseMap={choose} />
    </NetworkProvider>
  );
}

/** Segmented control choosing which map the gallery shows. */
function MapMenu({ onChoose }: { onChoose: (network: Network) => void }) {
  const { lang, t } = useLang();
  const current = useNetwork();
  return (
    <div className="segmented gallery-map-menu" role="radiogroup" aria-label={t.map} data-testid="gallery-map-menu">
      {NETWORKS.map((n) => (
        <label key={n.id} className={n.id === current.id ? 'is-selected' : undefined}>
          <input
            type="radio"
            name="gallery-map"
            value={n.id}
            checked={n.id === current.id}
            onChange={() => onChoose(n)}
            data-testid={`gallery-map-${n.id}`}
          />
          {localName(n.name, lang)}
        </label>
      ))}
    </div>
  );
}

function GalleryContent({ onChooseMap }: { onChooseMap: (network: Network) => void }) {
  const { t } = useLang();
  const network = useNetwork();
  const deck = useMemo(() => buildDeck(network), [network]);
  const groups = useMemo(() => groupCards(deck, network), [deck, network]);

  return (
    <main className="gallery">
      <header className="gallery-header">
        <div className="gallery-header-main">
          <div className="gallery-title-row">
            <h1>{t.galleryTitle}</h1>
            <MapMenu onChoose={onChooseMap} />
          </div>
          <p className="subtitle" data-testid="gallery-intro">{t.galleryIntro(deck.length, network.lines.length)}</p>
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
                <AltLineName code={line.code} />
                <span className="gallery-line-count">{t.stationCount(line.stops.length)}</span>
              </div>
              <LineStrip lines={[line.code]} highlightStation={null} />
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

/** The line's name in the other language, left out when it would repeat the shown name (e.g. London has no Chinese names). */
function AltLineName({ code }: { code: string }) {
  const { lang } = useLang();
  const network = useNetwork();
  const shown = lineName(network, code, lang);
  const alt = lineName(network, code, lang === 'en' ? 'zh' : 'en');
  return alt === shown ? null : <span className="gallery-line-alt">{alt}</span>;
}
