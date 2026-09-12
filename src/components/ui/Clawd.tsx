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
        viewBox="0 -26 120 118"
        width="170"
        height="167"
        role="img"
        aria-label="Clawd the crab in a hard hat, Reverse Engineering Academy mascot"
      >
        {/* hard hat: top ridge, dome, wide brim resting on the head */}
        <rect x="54" y="-25" width="12" height="6" rx="2" fill={HAT_RIDGE} />
        <rect x="34" y="-19" width="52" height="15" rx="4" fill={HAT} />
        <rect x="10" y="-4" width="100" height="10" rx="3" fill={HAT} />

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
