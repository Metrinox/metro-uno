/**
 * An original wave mark for London's plain wild card: three white swells that
 * fade towards the bottom, drawn for this game.
 *
 * Oyster is a trademark of Transport for London. This artwork deliberately does
 * not copy TfL's Oyster logo or the Underground roundel; only the name is used,
 * on a plain blue card. Keeping it in one place lets it be swapped out before
 * any public release.
 */
export function OysterArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 70" aria-hidden focusable="false" data-testid="oyster-art">
      <path
        d="M8 26 C20 10 34 10 46 24 S72 38 92 18"
        fill="none"
        stroke="#fff"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M12 43 C24 29 37 29 48 41 S73 53 90 36"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.8"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <path
        d="M14 58 C26 46 38 46 50 56 S74 64 88 52"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.55"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
