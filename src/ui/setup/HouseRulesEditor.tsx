import { DEFAULT_RULES, HAND_SIZE_MAX, HAND_SIZE_MIN, type HouseRules } from '../../engine/game';
import { useLang } from '../i18n/LangContext';

type ToggleKey = 'drawUntilPlayable' | 'playDrawnCard' | 'mixDrawStacking' | 'playSameNumbers' | 'playUntilLast';

interface Props {
  rules: HouseRules;
  onChange: (rules: HouseRules) => void;
  /** Shows the rules without letting them change (an online guest). */
  readOnly?: boolean;
  /** Shown under the heading, e.g. "The host chooses the house rules." */
  note?: string;
}

/** The house rules settings, used on the setup screen and in an online lobby. */
export function HouseRulesEditor({ rules, onChange, readOnly = false, note }: Props) {
  const { t } = useLang();
  const set = (patch: Partial<HouseRules>) => onChange({ ...rules, ...patch });
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
    { key: 'playUntilLast', label: t.playUntilLast, hint: t.playUntilLastHint },
  ];

  return (
    <fieldset className={readOnly ? 'house-rules is-read-only' : 'house-rules'} data-testid="house-rules">
      <legend>{t.houseRules}</legend>
      {note && <p className="rules-note">{note}</p>}

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
            disabled={readOnly || rules.handSize <= HAND_SIZE_MIN}
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
            disabled={readOnly || rules.handSize >= HAND_SIZE_MAX}
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
            disabled={readOnly || disabled}
            onChange={(e) => set({ [key]: e.target.checked })}
            data-testid={`rule-${key}`}
          />
        </label>
      ))}

      {!readOnly && (
        <button type="button" className="btn btn-quiet reset-rules" onClick={() => onChange({ ...DEFAULT_RULES })}>
          {t.resetRules}
        </button>
      )}
    </fieldset>
  );
}
