import { useEffect, useRef, useState } from 'react';

/**
 * Clawd — Anthropic's pixel-art crab mascot in a construction hard hat:
 * blocky terracotta rectangles, square black eyes, stubby side claws, four
 * legs with a center notch. The hat sits in the negative-y headroom added to
 * the viewBox, so every original body coordinate is untouched.
 * Alive via: body float + claw wave + eye blink (CSS keyframes), eyes that
 * track the cursor, and a cycling speech bubble.
 * Fixed colors on purpose: Clawd is an illustration with a brand identity,
 * not a themed UI surface — same terracotta in both themes.
 */

const PHRASES = [
  'Ready to dig in?',
  'Every binary talks.',
  'Follow the strings…',
  'Assume nothing. Verify.',
  'Ship no guesses!',
];

const BODY = '#da7756';
const EYE = '#0d0d0d';
const HAT = '#f2b705';
const HAT_RIDGE = '#d99106';
const HAT_LIGHT = '#ffd23f';

export function Clawd() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [eye, setEye] = useState({ x: 0, y: 0 });
  const [phrase, setPhrase] = useState(0);

  // Square eyes shift slightly toward the cursor.
  useEffect(() => {
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = svgRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height * 0.35);
        const len = Math.hypot(dx, dy) || 1;
        const m = Math.min(len, 140) / 140;
        setEye({ x: (dx / len) * 2.4 * m, y: (dy / len) * 2 * m });
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPhrase((p) => (p + 1) % PHRASES.length), 3800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="clawd">
      <div className="clawd__bubble" key={phrase}>
        {PHRASES[phrase]}
      </div>
      <svg
        ref={svgRef}
        className="clawd__svg"
        viewBox="0 -34 120 126"
        width="170"
        height="179"
        role="img"
        aria-label="Clawd the crab in a hard hat, Reverse Engineering Academy mascot"
      >
        {/* hard hat: tall stepped dome (axis-aligned rects only, no curves) with a
            centre ridge, over a short thick brim that overhangs the dome by only a
            few units. Row widths widen fast then slow so the shoulder reads round
            rather than conical; a wide thin brim would read as a sun hat. */}
        <rect x="43" y="-33" width="34" height="6" rx="3" fill={HAT} />
        <rect x="35" y="-28" width="50" height="8" fill={HAT} />
        <rect x="29" y="-21" width="62" height="9" fill={HAT} />
        <rect x="26" y="-13" width="68" height="10" fill={HAT} />
        <rect x="53" y="-33" width="14" height="30" fill={HAT_LIGHT} />
        <rect x="20" y="-4" width="80" height="12" rx="3" fill={HAT} />
        <rect x="20" y="3" width="80" height="5" rx="2" fill={HAT_RIDGE} />

        {/* left ear */}
        <g className="clawd__claw">
          <rect x="6" y="22" width="16" height="14" rx="2" fill={BODY} />
        </g>
        {/* right ear (waves) */}
        <g className="clawd__claw clawd__claw--wave">
          <rect x="98" y="22" width="16" height="14" rx="2" fill={BODY} />
        </g>

        {/* body: ONE solid rectangle — Clawd is just a box with legs */}
        <rect x="20" y="6" width="80" height="52" rx="3" fill={BODY} />

        {/* 4 legs, center gap slightly wider than the outer gaps */}
        <rect x="26" y="56" width="11" height="32" rx="2" fill={BODY} />
        <rect x="44" y="56" width="11" height="32" rx="2" fill={BODY} />
        <rect x="65" y="56" width="11" height="32" rx="2" fill={BODY} />
        <rect x="83" y="56" width="11" height="32" rx="2" fill={BODY} />

        {/* square eyes, tracking the cursor */}
        <rect x={38 + eye.x} y={20 + eye.y} width="11" height="11" fill={EYE} />
        <rect x={71 + eye.x} y={20 + eye.y} width="11" height="11" fill={EYE} />

        {/* eyelids: body-colored covers that blink shut */}
        <rect className="clawd__lid" x="35" y="17" width="17" height="17" fill={BODY} />
        <rect className="clawd__lid" x="68" y="17" width="17" height="17" fill={BODY} />
      </svg>
    </div>
  );
}
