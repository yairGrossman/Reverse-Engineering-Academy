/**
 * Decorative artwork drawn in Anthropic's editorial illustration style, taken
 * from their own published art (e.g. the "Teaching Claude why" hand-and-tangle
 * drawing) rather than from a generic minimal-icon look:
 *
 *  - ONE loose, continuous, hand-drawn line — gestural and a little wobbly,
 *    never a compass-perfect arc or a mathematically even polygon.
 *  - Line terminals are round and the weight varies slightly stroke to stroke,
 *    the way a marker does. Anthropic ship these as filled outlines; strokes
 *    with uneven widths get the same feel at a fraction of the path data.
 *  - Naive anatomy: a hand is four open finger strokes and a palm curve. No
 *    knuckles, no fingertips, no closed contours.
 *  - Exactly two tones on the warm ground: ink, plus one irregular off-white
 *    blob sitting behind the drawing. No gradients, no glow, no blur.
 *  - Recurring motifs: tangles, knots, loops and scribbles — complexity being
 *    handled, which is the whole idea the drawings carry.
 *
 * All of it is presentational, so every piece is aria-hidden and carries no
 * information the surrounding copy does not already state.
 */

/** Tangled ball of line — the "knot being worked out" motif. */
function Tangle() {
  return (
    <g strokeWidth="3.4">
      <path d="M44 82C24 76 12 56 20 38S54 10 74 18s26 34 12 50-44 14-50-6 10-38 28-34 26 20 16 34-28 12-36-2" />
      <path d="M52 46c-8 4-10 14-4 20s18 4 20-4-4-16-12-16" strokeWidth="2.8" />
    </g>
  );
}

/** Hand: four open finger strokes fanning off one palm curve. */
function Hand() {
  return (
    <g strokeWidth="3.4">
      <path d="M4 46C2 26 8 10 20 2" />
      <path d="M20 50C22 28 32 12 44 8" strokeWidth="3.1" />
      <path d="M36 56C40 34 52 20 64 20" strokeWidth="3.6" />
      <path d="M52 64C58 44 70 34 82 36" strokeWidth="3" />
      <path d="M4 46c-10 16-8 38 6 52" />
    </g>
  );
}

/** Large hero composition: off-white blob, a tangle, a hand reaching in. */
export function HeroArt() {
  return (
    <svg
      className="art art--hero"
      viewBox="0 0 1200 420"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {/* Irregular off-white patch — hand-cut, never a circle */}
      <path
        className="art__blob"
        d="M196 36c104-26 214 12 258 96s30 196-44 250-186 44-254-12S138 208 160 134s6-84 36-98Z"
      />

      <g
        className="art__ink"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g transform="translate(140 96) scale(2.1)">
          <Tangle />
        </g>
        <g transform="translate(400 130) rotate(-12) scale(1.9)">
          <Hand />
        </g>

        {/* Loose satellite loops, drifting right */}
        <g strokeWidth="6">
          <path d="M712 150c-26 12-32 46-10 64s56 2 56-26-26-42-48-30" />
          <path d="M876 268c-20 20-12 50 16 58s50-16 42-42-38-34-58-16" />
          <path d="M980 108c42-20 88 8 92 50s-34 72-72 60-54-52-28-80" />
          <path d="M1096 300c16-34 64-38 84-8s-8 68-38 64-52-26-46-56" />
        </g>
      </g>
    </svg>
  );
}

/** Four hand-drawn doodles, cycled across the module grid so cards vary. */
const CARD_MOTIFS = [
  <g key="knot">
    <path d="M18 34C8 30 6 18 14 12s22-2 24 8-8 20-18 16-8-18 2-20 16 8 12 18" />
  </g>,
  <g key="spiral">
    <path d="M46 10c-14-4-26 6-26 18s12 20 22 16 12-18 2-22-16 6-12 14" />
  </g>,
  <g key="loops">
    <path d="M14 30c6-14 24-16 30-4s-6 24-16 20-10-20 2-24 22 4 24 16" />
  </g>,
  <g key="squiggle">
    <path d="M8 32c10-16 20 8 30-6s18 10 28-4" />
    <path d="M12 12c8 4 18-2 26 2" />
  </g>,
];

export function CardMotif({ index }: { index: number }) {
  return (
    <svg
      className="art art--card"
      viewBox="0 0 70 46"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {CARD_MOTIFS[index % CARD_MOTIFS.length]}
    </svg>
  );
}

/**
 * Brand mark — Clawd in a construction hard hat. Same geometry as
 * `public/favicon.svg`; they are one logo, so edit both together. The only
 * difference: the favicon paints an ivory tile behind it (a browser tab may be
 * dark), while in-app the mark sits straight on the page.
 * Clawd's colours are fixed by design — see the note in Clawd.tsx.
 */
export function BrandMark({ size = 26 }: { size?: number }) {
  const BODY = '#da7756';
  const INK = '#0d0d0d';
  const HAT = '#f2b705';
  const HAT_RIDGE = '#d99106';
  return (
    <svg
      className="art art--brand"
      width={size}
      height={size}
      viewBox="0 0 128 128"
      aria-hidden="true"
      focusable="false"
    >
      {/* hard hat: top ridge, dome, then the wide brim resting on the head */}
      <rect x="56" y="12" width="16" height="8" rx="2" fill={HAT_RIDGE} />
      <rect x="34" y="19" width="60" height="17" rx="4" fill={HAT} />
      <rect x="8" y="35" width="112" height="10" rx="3" fill={HAT} />
      {/* ears */}
      <rect x="12" y="60" width="14" height="13" rx="2" fill={BODY} />
      <rect x="102" y="60" width="14" height="13" rx="2" fill={BODY} />
      {/* body: ONE solid rectangle */}
      <rect x="26" y="45" width="76" height="46" rx="4" fill={BODY} />
      {/* 4 legs, centre gap wider than the outer gaps */}
      <rect x="32" y="91" width="11" height="15" rx="2" fill={BODY} />
      <rect x="50" y="91" width="11" height="15" rx="2" fill={BODY} />
      <rect x="72" y="91" width="11" height="15" rx="2" fill={BODY} />
      <rect x="90" y="91" width="11" height="15" rx="2" fill={BODY} />
      {/* square eyes */}
      <rect x="41" y="60" width="13" height="13" fill={INK} />
      <rect x="76" y="60" width="13" height="13" fill={INK} />
    </svg>
  );
}

/** Small hand-drawn asterisk heading each curriculum part — deliberately uneven. */
export function PartMark() {
  return (
    <svg
      className="art art--part"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3c-.6 6 .4 12 .2 18" strokeWidth="2.6" />
      <path d="M4 11c6-.8 12 .6 16 .2" strokeWidth="2.3" />
      <path d="M6 6c4 4 8 8 12 13" strokeWidth="2.1" />
      <path d="M18 6c-4 4-8 8-12 13" strokeWidth="2.4" />
    </svg>
  );
}
