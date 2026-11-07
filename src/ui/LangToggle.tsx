import { LANGS } from './i18n';
import { useLang } from './LangContext';

const LABEL = { en: 'EN', zh: '中' } as const;
const FULL = { en: 'English', zh: '繁體中文' } as const;

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-toggle" role="group" aria-label="Language / 語言">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className={l === lang ? 'is-selected' : undefined}
          aria-pressed={l === lang}
          aria-label={FULL[l]}
          onClick={() => setLang(l)}
          data-testid={`lang-${l}`}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
