/* generated from koelony/design@e6933b9b8c1d, do not edit. Change it in koelony/design and sync. */
/**
 * The koel, in a 512-unit box facing right. Shared by the cursor, PerchedKoel and BackgroundFlock.
 *
 * LITTLE is the official bird (koelony/koelony brand/koel.svg) with its beak cut free so the head can
 * nod and peck. The cut follows the drawing's own circles: the head is the r = 57.729 circle, the
 * throat the r = 115.458 circle, and they meet at (389.83, 111.85); the beak is the wedge in front
 * and turns about the head's centre (`pivot`). At thirty-odd pixels the official eye (r 16.741) is a
 * pixel wide, so the little bird's eye is 1.4 times that.
 *
 * FLYING is Koelony's own flight pose (the brand has none), drawn with the same construction:
 * circular arcs only, crescents ending in sharp tips, one round eye. One wing is drawn; it is
 * mirrored through the shoulder line to flap and reused, shifted, as the far wing.
 *
 * If brand/koel.svg is redrawn, measure the cut again here.
 */
export const LITTLE = {
  body: "M370.83 72.241A57.729 57.729 0 0 1 389.83 111.85A115.458 115.458 0 0 0 355.298 195.238A256.893 256.893 0 0 1 42.812 448.283A248.234 248.234 0 0 0 303.338 223.095A427.194 427.194 0 0 1 38.073 391.298A326.168 326.168 0 0 1 232.425 136.963A92.366 92.366 0 0 0 279.815 90.889A57.729 57.729 0 0 1 370.83 72.241Z",
  beak: "M370.83 72.241A207.824 207.824 0 0 1 466.722 78.843A115.458 115.458 0 0 0 389.83 111.85L332.2 115.14Z",
  eye: { cx: 345.48, cy: 101.864, r: 23.437 },
  /** Centre of the head: the beak and eye turn about it. `.cb-head` and `.b-head` use this point. */
  pivot: { x: 332.2, y: 115.14 },
  /** Tip of the beak: the cursor's hot spot. */
  tip: { x: 466.722, y: 78.843 },
} as const;

export const FLYING = {
  body: "M386 170A190 190 0 0 1 474 190A105 105 0 0 0 398 248A330 330 0 0 1 250 292A520 520 0 0 1 30 262A700 700 0 0 0 232 222A300 300 0 0 0 30 222A620 620 0 0 1 250 178A120 120 0 0 0 300 180A52 52 0 0 1 386 170Z",
  wing: "M326 196A262 262 0 0 0 170 20A340 340 0 0 0 208 224Z",
  eye: { cx: 362, cy: 194, r: 14.5 },
  /** The wings flap about this point. `.cb-wing` and `.sky-wing` use it. */
  shoulder: { x: 268, y: 208 },
  /** Tip of the beak in flight. */
  tip: { x: 474, y: 190 },
} as const;

/** The far wing: the near one shifted back and turned up a little about the shoulder. */
export const FAR_WING_TRANSFORM = `translate(26 -2) rotate(16 ${FLYING.shoulder.x} ${FLYING.shoulder.y})`;
