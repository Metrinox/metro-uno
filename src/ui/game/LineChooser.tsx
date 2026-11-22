import { useEffect, useRef } from 'react';
import { LineBadge } from '../lines/LineBadge';
import { useLang } from '../i18n/LangContext';

interface Props {
  /** Allowed options; an option of several shared-track lines is one choice. */
  options: string[][];
  onChoose: (lines: string[]) => void;
  onCancel: () => void;
}

/** Modal asking which line to change to. Only the allowed options are offered. */
export function LineChooser({ options, onChoose, onCancel }: Props) {
  const { t } = useLang();
  const first = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Tab' && dialog.current) {
        // Keep focus inside the dialog.
        const items = [...dialog.current.querySelectorAll<HTMLButtonElement>('button')];
        const [head, tail] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === head) {
          e.preventDefault();
          tail?.focus();
        } else if (!e.shiftKey && document.activeElement === tail) {
          e.preventDefault();
          head?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="overlay">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="choose-line-title" ref={dialog} data-testid="line-chooser">
        <h2 id="choose-line-title">{t.chooseLine}</h2>
        <div className="line-options">
          {options.map((option, i) => (
            <button
              key={option.join('+')}
              type="button"
              className="line-option"
              ref={i === 0 ? first : undefined}
              onClick={() => onChoose(option)}
              data-line={option.join('+')}
            >
              <LineBadge codes={option} />
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
