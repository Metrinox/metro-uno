import { useState } from 'react';
import type { HouseRules } from '../../engine/game';
import { HouseRulesEditor } from './HouseRulesEditor';
import { NETWORKS, networkOrDefault } from '../../data/networks';
import { LANGS, localName } from '../i18n/i18n';
import { useLang } from '../i18n/LangContext';
import { THEMES, useTheme } from '../theme/theme';

const LANG_NAME = { en: 'English', zh: '繁體中文' } as const;

interface Props {
  initialOpponents: number;
  rules: HouseRules;
  onRulesChange: (rules: HouseRules) => void;
  /** Id of the chosen map; the subtitle and colour stripes follow it. */
  map: string;
  onMapChange: (map: string) => void;
  onStart: (opponents: number) => void;
  /** Shown only when the site was built with a game server address. */
  onPlayOnline?: () => void;
}

export function Setup({ initialOpponents, rules, onRulesChange, map, onMapChange, onStart, onPlayOnline }: Props) {
  const { lang, t, setLang } = useLang();
  const network = networkOrDefault(map);
  const { theme, setTheme } = useTheme();
  const [opponents, setOpponents] = useState(initialOpponents);

  return (
    <main className="setup">
      <div className="setup-card">
        <div className="setup-stripes" aria-hidden>
          {network.lines.flatMap((l) => l.labels).map((l) => (
            <span key={l.code} style={{ background: l.colour }} />
          ))}
        </div>
        <h1>{t.title}</h1>
        <p className="subtitle" data-testid="map-name">
          {localName(network.name, lang)}
        </p>

        <fieldset>
          <legend>{t.map}</legend>
          <div className="segmented">
            {NETWORKS.map((n) => (
              <label key={n.id} className={n.id === network.id ? 'is-selected' : undefined} data-testid={`map-${n.id}`}>
                <input type="radio" name="map" value={n.id} checked={n.id === network.id} onChange={() => onMapChange(n.id)} />
                {localName(n.name, lang)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t.opponents}</legend>
          <div className="segmented">
            {[1, 2, 3].map((n) => (
              <label key={n} className={n === opponents ? 'is-selected' : undefined}>
                <input type="radio" name="opponents" value={n} checked={n === opponents} onChange={() => setOpponents(n)} />
                {n}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t.language}</legend>
          <div className="segmented">
            {LANGS.map((l) => (
              <label key={l} className={l === lang ? 'is-selected' : undefined}>
                <input type="radio" name="lang" value={l} checked={l === lang} onChange={() => setLang(l)} />
                {LANG_NAME[l]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t.theme}</legend>
          <div className="segmented">
            {THEMES.map((th) => (
              <label key={th} className={th === theme ? 'is-selected' : undefined}>
                <input type="radio" name="theme" value={th} checked={th === theme} onChange={() => setTheme(th)} />
                {th === 'light' ? `☀ ${t.light}` : `☾ ${t.dark}`}
              </label>
            ))}
          </div>
        </fieldset>

        <HouseRulesEditor rules={rules} onChange={onRulesChange} />

        <button type="button" className="btn btn-primary btn-start" onClick={() => onStart(opponents)} data-testid="start">
          {t.start}
        </button>
        {onPlayOnline && (
          <button type="button" className="btn btn-start btn-online" onClick={onPlayOnline} data-testid="play-online">
            {t.online.playOnline}
          </button>
        )}
      </div>
    </main>
  );
}
