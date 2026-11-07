import { useEffect, useMemo, useRef } from 'react';
import { stationName } from './format';
import { useLang } from './LangContext';
import { layoutLine } from './lineLayout';
import { network } from './network';

const COL_W = 58;
const PAD_X = 36;
/** Vertical distance between rows (trunk and each branch row above it). */
const ROW_H = 38;
const TRACK_W = 4;
const DOT_R = 11;

/** Splits a name into at most two lines for the strip. */
function wrapName(name: string): string[] {
  if (name.length <= 9) return [name];
  if (!name.includes(' ')) {
    // "AsiaWorld-Expo" → "AsiaWorld-" / "Expo"
    const dash = name.indexOf('-');
    return dash > 0 ? [name.slice(0, dash + 1), name.slice(dash + 1)] : [name];
  }
  const words = name.split(' ');
  let best: string[] = [name];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      best = [a, b];
      bestDiff = diff;
    }
  }
  return best;
}

/** The current line's stations, branches at their forks, with the top card's station highlighted. */
export function LineStrip({ line, highlightStation }: { line: string; highlightStation: string | null }) {
  const { lang, t } = useLang();
  const def = network.lineByCode[line]!;
  const layout = useMemo(() => layoutLine(def), [def]);
  const scroller = useRef<HTMLDivElement>(null);

  // Trunk names go below the dots; branch names above, so diagonal tracks never cross text.
  // Row 0 (the trunk) sits low enough to leave room for branch rows and their names above.
  const trunkY = -layout.minRow * ROW_H + (layout.minRow < 0 ? DOT_R + 30 : DOT_R + 6);
  const x = (col: number) => PAD_X + col * COL_W;
  // A branch station with another branch directly above it gets its name to the right instead.
  const occupied = new Set(layout.stops.map((st) => `${st.col},${st.row}`));
  const sideLabel = (col: number, row: number) => row < 0 && occupied.has(`${col},${row - 1}`);
  const nameOf = (id: string) => stationName(network, id, lang);
  const sideEnd = Math.max(
    0,
    ...layout.stops
      .filter((st) => sideLabel(st.col, st.row))
      .map((st) => x(st.col) + DOT_R + 6 + nameOf(st.stationId).length * (lang === 'en' ? 5.6 : 10.5)),
  );
  const width = Math.max(x(layout.cols - 1) + PAD_X, sideEnd + 8);
  const height = trunkY + DOT_R + 30;
  const where = useMemo(
    () => new Map(layout.stops.map((s) => [s.stationId, { x: PAD_X + s.col * COL_W, y: trunkY + s.row * ROW_H }])),
    [layout, trunkY],
  );

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const p = highlightStation ? where.get(highlightStation) : undefined;
    // Scroll only the strip itself, never the page.
    el.scrollLeft = p ? p.x - el.clientWidth / 2 : 0;
  }, [line, highlightStation, where]);

  return (
    <div
      className="line-strip"
      ref={scroller}
      role="group"
      aria-label={def.name[lang]}
      data-testid="line-strip"
      tabIndex={0}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden={false}>
        <g className="tracks">
          {layout.segments.map((seg) => {
            const a = where.get(seg.from)!;
            const b = where.get(seg.to)!;
            const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            // Unit normal: parallel stripes sit side by side across the track.
            const nx = -(b.y - a.y) / len;
            const ny = (b.x - a.x) / len;
            return seg.colours.map((colour, i) => {
              const off = (i - (seg.colours.length - 1) / 2) * TRACK_W;
              return (
                <line
                  key={`${seg.from}-${seg.to}-${i}`}
                  className="track"
                  data-from={seg.from}
                  data-to={seg.to}
                  x1={a.x + nx * off}
                  y1={a.y + ny * off}
                  x2={b.x + nx * off}
                  y2={b.y + ny * off}
                  stroke={colour}
                  strokeWidth={TRACK_W}
                  strokeLinecap="round"
                />
              );
            });
          })}
        </g>
        {layout.stops.map((stop) => {
          const p = where.get(stop.stationId)!;
          const current = stop.stationId === highlightStation;
          const interchange = stop.number === null;
          const name = stationName(network, stop.stationId, lang);
          const side = sideLabel(stop.col, stop.row);
          const lines = lang === 'en' && !side ? wrapName(name) : [name];
          const above = stop.row < 0;
          const textY = (i: number) =>
            above ? p.y - DOT_R - 6 - (lines.length - 1 - i) * 11 : p.y + DOT_R + 13 + i * 11;
          return (
            <g
              key={stop.stationId}
              className={current ? 'stop is-current' : 'stop'}
              data-station={stop.stationId}
              data-row={stop.row}
              aria-current={current ? 'location' : undefined}
            >
              <title>{interchange ? `${name} (${t.interchange})` : `${name} ${stop.number}`}</title>
              {current && <circle cx={p.x} cy={p.y} r={DOT_R + 5} className="stop-ring" />}
              <g className={interchange ? 'stop-dot interchange' : 'stop-dot'}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={DOT_R}
                  className="stop-circle"
                  style={interchange ? undefined : { stroke: stop.colour }}
                />
                <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle" className="stop-label">
                  {stop.number ?? '⇄'}
                </text>
              </g>
              {side ? (
                <text x={p.x + DOT_R + 6} y={p.y} dy="0.35em" textAnchor="start" className="stop-name">
                  {name}
                </text>
              ) : (
                lines.map((l, i) => (
                  <text key={i} x={p.x} y={textY(i)} textAnchor="middle" className="stop-name">
                    {l}
                  </text>
                ))
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
