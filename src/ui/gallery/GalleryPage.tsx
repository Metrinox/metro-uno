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
import { localName, type Dict } from '../i18n/i18n';

interface Group {
  key: string;
  title: ReactNode;
  /** Cards in runs; the runs are drawn with a small gap between them. */
  runs: Card[][];
}

/**
 * Every card, grouped: each line's stations (in line order) and actions, then the
 * subsurface (shared-track) stations, then interchanges, then wilds. Subsurface
 * station cards, interchanges included, come one numbering group per run, unnamed.
 */
function groupCards(deck: Card[], network: Network): Group[] {
  const inGroup = (c: Card) => 'stationId' in c && network.stations[c.stationId]!.group !== null;
  const groups: Group[] = network.lines.map((line) => {
    const order = new Map(line.stops.map((s, i) => [s.stationId, i]));
    const stations = deck
      .filter((c): c is Extract<Card, { kind: 'station' }> => c.kind === 'station' && c.line === line.code && !inGroup(c))
      .sort((a, b) => order.get(a.stationId)! - order.get(b.stationId)!);
    const actions = deck.filter((c) => c.kind === 'action' && c.line === line.code);
    return { key: line.code, title: <LineBadge code={line.code} />, runs: [[...stations, ...actions]] };
  });
  const byStation = new Map(deck.flatMap((c) => ('stationId' in c ? [[c.stationId, c] as const] : [])));
  const subsurface = network.groups.map((g) => g.stationIds.map((id) => byStation.get(id)!));
  const interchanges = deck.filter((c) => c.kind === 'interchange' && !inGroup(c));
  const wilds = deck.filter((c) => c.kind === 'wild');
  return [
    ...groups,
    ...(subsurface.length > 0 ? [{ key: 'subsurface', title: null, runs: subsurface }] : []),
    { key: 'interchanges', title: null, runs: [interchanges] },
    { key: 'wilds', title: null, runs: [wilds] },
  ];
}

/** A group's heading: its line badge, or the name of a group without one. */
function groupHeading(key: string, title: ReactNode, t: Dict): ReactNode {
  if (key === 'subsurface') return t.subsurfaceGroup;
  if (key === 'interchanges') return t.interchangesGroup;
  if (key === 'wilds') return t.wildsGroup;
  return title;
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
              {groupHeading(g.key, g.title, t)} <span className="gallery-count">{t.cards(g.runs.flat().length)}</span>
            </h3>
            {g.runs.map((run, i) => (
              <div key={i} className="gallery-cards">
                {run.map((c) => (
                  <CardView key={c.id} card={c} />
                ))}
              </div>
            ))}
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
