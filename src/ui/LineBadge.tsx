import { lineName, textOn } from './format';
import { useLang } from './LangContext';
import { network } from './network';

export function LineBadge({ code, testId }: { code: string; testId?: string }) {
  const { lang } = useLang();
  const labels = network.lineByCode[code]!.labels;
  return (
    <span className="line-badge" data-testid={testId} data-line={code}>
      <span className="line-codes">
        {labels.map((l) => (
          <span key={l.code} className="line-code" style={{ background: l.colour, color: textOn(l.colour) }}>
            {l.code}
          </span>
        ))}
      </span>
      <span className="line-name">{lineName(network, code, lang)}</span>
    </span>
  );
}
