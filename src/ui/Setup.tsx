import { useState } from 'react';
import { DEFAULT_RULES, HAND_SIZE_MAX, HAND_SIZE_MIN, type HouseRules } from '../engine/game';
import { LANGS } from './i18n';
import { useLang } from './LangContext';
import { network } from './network';
import { THEMES, useTheme } from './theme';

const LANG_NAME = { en: 'English', zh: '繁體中文' } as const;

interface Props {
  initialOpponents: number;
  rules: HouseRules;
  onRulesChange: (rules: HouseRules) => void;
  onStart: (opponents: number) => void;
}

type ToggleKey = 'drawUntilPlayable' | 'playDrawnCard' | 'mixDrawStacking' | 'playSameNumbers';

export function Setup({ initialOpponents, rules, onRulesChange, onStart }: Props) {
  const { lang, t, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const [opponents, setOpponents] = useState(initialOpponents);
  const set = (patch: Partial<HouseRules>) => onRulesChange({ ...rules, ...patch });
  const onOff = (v: boolean) => (v ? t.on : t.off);

  const toggles: { key: ToggleKey; label: string; hint: string; disabled?: boolean }[] = [
    { key: 'drawUntilPlayable', label: t.drawUntilPlayable, hint: t.drawUntilPlayableHint },
    {
      key: 'playDrawnCard',
      label: t.playDrawnCard,
      hint: rules.drawUntilPlayable ? t.playDrawnCardNA : t.playDrawnCardHint,
      disabled: rules.drawUntilPlayable,
    },
    { key: 'mixDrawStacking', label: t.mixStacking, hint: t.mixStackingHint },
    { key: 'playSameNumbers', label: t.sameNumbers, hint: t.sameNumbersHint },
  ];

  return (
    <main className="setup">
      <div className="setup-card">
        <div className="setup-stripes" aria-hidden>
          {network.lines.flatMap((l) => l.labels).map((l) => (
            <span key={l.code} style={{ background: l.colour }} />
          ))}
        </div>
        <h1>{t.title}</h1>
        <p className="subtitle">{t.subtitle}</p>

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

        <fieldset className="house-rules" data-testid="house-rules">
          <legend>{t.houseRules}</legend>

          <div className="rule">
            <div className="rule-text">
              <span className="rule-label" id="rule-hand-size">
                {t.startingCards}
              </span>
              <span className="rule-hint">{t.defaultValue(String(DEFAULT_RULES.handSize))}</span>
            </div>
            <div className="stepper" role="group" aria-labelledby="rule-hand-size">
              <button
                type="button"
                aria-label={t.fewerCards}
                disabled={rules.handSize <= HAND_SIZE_MIN}
                onClick={() => set({ handSize: rules.handSize - 1 })}
              >
                −
              </button>
              <output aria-live="polite" data-testid="hand-size">
                {rules.handSize}
              </output>
              <button
                type="button"
                aria-label={t.moreCards}
                disabled={rules.handSize >= HAND_SIZE_MAX}
                onClick={() => set({ handSize: rules.handSize + 1 })}
              >
                +
              </button>
            </div>
          </div>

          {toggles.map(({ key, label, hint, disabled }) => (
            <label key={key} className={disabled ? 'rule is-disabled' : 'rule'}>
              <span className="rule-text">
                <span className="rule-label">{label}</span>
                <span className="rule-hint">
                  {hint} {t.defaultValue(onOff(DEFAULT_RULES[key]))}
                </span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={rules[key]}
                disabled={disabled}
                onChange={(e) => set({ [key]: e.target.checked })}
                data-testid={`rule-${key}`}
              />
            </label>
          ))}

          <button type="button" className="btn btn-quiet reset-rules" onClick={() => onRulesChange({ ...DEFAULT_RULES })}>
            {t.resetRules}
          </button>
        </fieldset>

        <button type="button" className="btn btn-primary btn-start" onClick={() => onStart(opponents)} data-testid="start">
          {t.start}
        </button>
      </div>
    </main>
  );
}
