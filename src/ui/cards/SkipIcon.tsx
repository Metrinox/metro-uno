/**
 * Signal Fault mark: a circle with a slash (⊘), meaning "skip". Drawn as SVG
 * so it matches the terminus icon's size and weight whatever the device font.
 */
export function SkipIcon() {
  return (
    <svg className="card-svg-icon" viewBox="0 0 24 24" aria-hidden data-testid="skip-icon">
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M5.64 18.36 18.36 5.64" />
      </g>
    </svg>
  );
}
