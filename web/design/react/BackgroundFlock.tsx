/* generated from koelony/design@e6933b9b8c1d, do not edit. Change it in koelony/design and sync. */
import { FAR_WING_TRANSFORM, FLYING } from "../lib/art.ts";

const SLOTS = ["sky-b1", "sky-b2", "sky-b3", "sky-b4", "sky-b5"] as const;

/**
 * The ink-wash flock: five faint koels crossing behind the page. Put it first in <body> and give the
 * page content `position: relative; z-index: 1`. Decorative (aria-hidden), server-render safe,
 * hidden with reduced motion. Each bird's height, size, speed and opacity is `.sky-b1` to `.sky-b5`
 * in components.css; a site can retune them in its own CSS.
 */
export function BackgroundFlock() {
  return (
    <div className="bg-sky" aria-hidden="true">
      <svg className="sky-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <path id="sky-body" d={FLYING.body} />
          <path id="sky-wing" d={FLYING.wing} />
          <g id="sky-wing-far" transform={FAR_WING_TRANSFORM}>
            <use href="#sky-wing" />
          </g>
        </defs>
      </svg>
      {SLOTS.map((slot) => (
        <span key={slot} className={`sky-bird ${slot}`}>
          <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false">
            <use className="sky-wing sky-wing-far" href="#sky-wing-far" />
            <use href="#sky-body" />
            <use className="sky-wing" href="#sky-wing" />
          </svg>
        </span>
      ))}
    </div>
  );
}
