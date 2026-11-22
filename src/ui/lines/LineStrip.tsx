import { useEffect, useMemo, useRef, useState } from 'react';
import { lineName, stationName, textOn } from '../i18n/format';
import { useLang } from '../i18n/LangContext';
import { localName } from '../i18n/i18n';
import { layoutLine } from './lineLayout';
import { useNetwork } from '../common/NetworkContext';

const COL_W = 68;
const PAD_X = 36;
/** Vertical distance between rows (trunk and each branch row above it). */
const ROW_H = 38;
/** Extra height above a branch row whose names would otherwise run into the row above it. */
const LABEL_H = 26;
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

/**
 * The current line's stations, branches at their forks, with the top card's station
 * highlighted. With several current lines it draws one at a time, the first to begin
 * with, and a tab per line switches between them.
 */
export function LineStrip({ lines, highlightStation }: { lines: string[]; highlightStation: string | null }) {
  const { lang, t } = useLang();
  const network = useNetwork();
  // The chosen tab goes back to the first line whenever the current lines change.
  const key = lines.join('+');
  const [chosen, setChosen] = useState({ key, code: lines[0]! });
  if (chosen.key !== key) setChosen({ key, code: lines[0]! });
  const shown = chosen.key === key ? chosen.code : lines[0]!;
  const def = network.lineByCode[shown]!;
  const layout = useMemo(() => layoutLine(def), [def]);
  const scroller = useRef<HTMLDivElement>(null);

  // Names on the trunk and rows below it go under the dots; names on rows above go over
  // them, so diagonal tracks never cross text. Two neighbouring rows with stations at or
  // next to the same columns get extra height between them, so the names between them fit
  // (e.g. the Northern's Clapham branch under its Battersea branch).
  const rowY = useMemo(() => {
    const cols = (row: number) => layout.stops.filter((st) => st.row === row).map((st) => st.col);
    const near = (a: number[], b: number[]) => a.some((c) => b.some((d) => Math.abs(c - d) <= 1));
    const offset = new Map<number, number>([[0, 0]]);
    // Rows above the trunk: names sit over each row, between it and the row above.
    for (let row = 0; row > layout.minRow; row--) {
      const crowded = row < 0 && near(cols(row), cols(row - 1));
      offset.set(row - 1, offset.get(row)! - ROW_H - (crowded ? LABEL_H : 0));
    }
    // Rows below the trunk: names sit under each row, between it and the row below.
    for (let row = 0; row < layout.maxRow; row++) {
      const crowded = near(cols(row), cols(row + 1));
      offset.set(row + 1, offset.get(row)! + ROW_H + (crowded ? LABEL_H : 0));
    }
    // Row 0 (the trunk) sits low enough to leave room for branch rows and their names above.
    const trunkY = -offset.get(layout.minRow)! + (layout.minRow < 0 ? DOT_R + 30 : DOT_R + 6);
    return (row: number) => trunkY + offset.get(row)!;
  }, [layout]);
  const x = (col: number) => PAD_X + col * COL_W;
  const width = x(layout.cols - 1) + PAD_X;
  const height = rowY(layout.maxRow) + DOT_R + 30;
  const where = useMemo(
    () => new Map(layout.stops.map((s) => [s.stationId, { x: PAD_X + s.col * COL_W, y: rowY(s.row) }])),
    [layout, rowY],
  );

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const p = highlightStation ? where.get(highlightStation) : undefined;
    // Scroll only the strip itself, never the page.
    el.scrollLeft = p ? p.x - el.clientWidth / 2 : 0;
    el.scrollTop = p ? p.y - el.clientHeight / 2 : 0;
  }, [def, highlightStation, where]);

  const strip = (
    <div
      className="line-strip"
      ref={scroller}
      role="group"
      aria-label={localName(def.name, lang)}
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
          const lines = lang === 'en' ? wrapName(name) : [name];
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
              {lines.map((l, i) => (
                <text key={i} x={p.x} y={textY(i)} textAnchor="middle" className="stop-name">
                  {l}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
  if (lines.length === 1) return strip;
  return (
    <>
      <div className="strip-tabs" role="group" aria-label={t.linesHeading} data-testid="strip-tabs">
        {lines.map((code) => {
          const { colour } = network.lineByCode[code]!;
          return (
            <button
              key={code}
              type="button"
              className="strip-tab"
              aria-pressed={code === shown}
              aria-label={lineName(network, code, lang)}
              onClick={() => setChosen({ key, code })}
              data-line={code}
              style={code === shown ? { background: colour, borderColor: colour, color: textOn(colour) } : { borderColor: colour }}
            >
              {code}
            </button>
          );
        })}
      </div>
      {strip}
    </>
  );
}
