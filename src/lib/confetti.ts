/**
 * Hand-rolled confetti burst — no dependency. Spawns absolutely-positioned
 * particles at (x, y) that animate outward via the confetti-fall keyframes
 * and self-clean. Colors come from the design tokens at call time, so the
 * burst always matches the active theme.
 */

const PARTICLES = 26;

function tokenColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function burstConfetti(x: number, y: number): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const colors = ['--accent', '--accent-strong', '--sea', '--good', '--warn'].map(tokenColor);

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:999;pointer-events:none;';
  document.body.appendChild(host);

  for (let i = 0; i < PARTICLES; i++) {
    const p = document.createElement('span');
    const angle = (Math.PI * 2 * i) / PARTICLES + Math.random() * 0.5;
    const dist = 60 + Math.random() * 90;
    const size = 5 + Math.random() * 6;
    p.style.cssText = `
      position:absolute;
      left:${x}px;top:${y}px;
      width:${size}px;height:${size * (Math.random() > 0.5 ? 0.45 : 1)}px;
      background:${colors[i % colors.length]};
      border-radius:${Math.random() > 0.6 ? '50%' : '2px'};
      --cx:${Math.cos(angle) * dist}px;
      --cy:${Math.sin(angle) * dist - 70}px;
      --cr:${Math.random() > 0.5 ? '' : '-'}${180 + Math.random() * 360}deg;
      animation:confetti-fall ${650 + Math.random() * 500}ms cubic-bezier(0.22,1,0.36,1) forwards;
    `;
    host.appendChild(p);
  }

  setTimeout(() => host.remove(), 1400);
}
