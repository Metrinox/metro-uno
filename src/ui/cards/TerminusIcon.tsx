/**
 * Terminus mark: a T wrapped in a two-headed circular arrow that is open at
 * the bottom, i.e. "end of the line, turn back". It replaces the old ⇆ glyph,
 * which looked too much like the interchange ⇄.
 *
 * The arc is a circle of radius 9 around (12, 12), with a gap 40° either side
 * of the bottom. The arrowheads sit on its ends, along the tangent.
 */
export function TerminusIcon() {
  return (
    <svg className="terminus-icon" viewBox="0 0 24 24" aria-hidden data-testid="terminus-icon">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M6.21 18.89A9 9 0 1 1 17.79 18.89" strokeWidth="1.8" />
        <path d="M8 8.5H16M12 8.5V16.5" strokeWidth="2.4" />
      </g>
      <g fill="currentColor">
        <path d="M16.11 20.3 20.23 20.24 16.89 16.26Z" />
        <path d="M7.89 20.3 3.77 20.24 7.11 16.26Z" />
      </g>
    </svg>
  );
}
