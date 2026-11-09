import { useEffect, useRef } from 'react';
import { LineBadge } from '../lines/LineBadge';
import { useLang } from '../i18n/LangContext';

interface Props {
  lines: string[];
  onChoose: (line: string) => void;
  onCancel: () => void;
}

/** Modal asking which line to change to. Only the allowed lines are offered. */
export function LineChooser({ lines, onChoose, onCancel }: Props) {
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
          {lines.map((code, i) => (
            <button key={code} type="button" className="line-option" ref={i === 0 ? first : undefined} onClick={() => onChoose(code)} data-line={code}>
              <LineBadge code={code} />
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
