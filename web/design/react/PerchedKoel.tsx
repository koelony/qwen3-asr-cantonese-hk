/* generated from koelony/design@e6933b9b8c1d, do not edit. Change it in koelony/design and sync. */
import { LITTLE } from "../lib/art.ts";

/**
 * A little ink koel standing on a structural rule (header, footer, a call to action), never over
 * prose. Decorative (aria-hidden), static in server rendering; it breathes and blinks only with
 * motion allowed. Place it with your own class (see `.pkoel` in components.css).
 */
export function PerchedKoel({ className = "", face = 1 }: { className?: string; face?: 1 | -1 }) {
  return (
    <span className={`pkoel ${className}`.trim()} data-face={face} aria-hidden="true">
      <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false">
        <path d={LITTLE.body} fill="currentColor" />
        <g className="b-head">
          <path d={LITTLE.beak} fill="currentColor" />
          <circle className="b-eye" cx={LITTLE.eye.cx} cy={LITTLE.eye.cy} r={LITTLE.eye.r} />
        </g>
      </svg>
    </span>
  );
}
