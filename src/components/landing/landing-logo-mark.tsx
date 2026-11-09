/** The VyntRise logo geometry as a scalable shape, used as oversized art on the blue bands. */
export function LandingLogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 292 260" fill="none" aria-hidden className={className}>
      <path
        d="M22 101 128 222c10 11 28 11 38 0l105-118"
        stroke="currentColor"
        strokeWidth="38"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M150 153 244 33" stroke="currentColor" strokeWidth="38" strokeLinecap="round" />
      <circle cx="143" cy="29" r="27" fill="currentColor" />
      <circle cx="96" cy="87" r="20" fill="currentColor" />
    </svg>
  );
}
