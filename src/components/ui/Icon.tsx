import type { ReactElement } from 'react';

/**
 * Monoline icon set drawn in Anthropic's illustration language: geometric
 * primitives, one uniform stroke weight, round caps, generous negative space,
 * no fills or gradients. `burst` is the house asterisk motif.
 * Icons inherit `currentColor`, so they take their color from the token the
 * surrounding text already uses. These replace the emoji the site used before.
 */

export type IconName =
  | 'burst'
  | 'warning'
  | 'info'
  | 'concept'
  | 'check'
  | 'cross'
  | 'arrow-left'
  | 'arrow-right'
  | 'menu'
  | 'download'
  | 'upload';

const PATHS: Record<IconName, ReactElement> = {
  // House asterisk — eight rays, alternating long/short.
  burst: (
    <>
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      <path d="M6.7 6.7l3.2 3.2M14.1 14.1l3.2 3.2M17.3 6.7l-3.2 3.2M9.9 14.1l-3.2 3.2" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4.2 21 19.5H3L12 4.2Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.2v5" />
      <path d="M12 8h.01" />
    </>
  ),
  // Concept — a core with an orbit around it.
  concept: (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <ellipse cx="12" cy="12" rx="9" ry="4.6" transform="rotate(-28 12 12)" />
    </>
  ),
  check: <path d="M4.5 12.6 9.5 17.5 19.5 6.9" />,
  cross: <path d="M6 6l12 12M18 6L6 18" />,
  'arrow-left': (
    <>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  // Export — arrow leaving the tray downward.
  download: (
    <>
      <path d="M12 4v10" />
      <path d="M8 10.5l4 4 4-4" />
      <path d="M4.5 18.5h15" />
    </>
  ),
  // Import — arrow arriving into the tray from below.
  upload: (
    <>
      <path d="M12 14V4" />
      <path d="M8 7.5l4-4 4 4" />
      <path d="M4.5 18.5h15" />
    </>
  ),
};

interface Props {
  name: IconName;
  /** Rendered size in px; the stroke stays visually even across sizes. */
  size?: number;
  className?: string;
  /** Give this only when the icon carries meaning no nearby text conveys. */
  label?: string;
}

export function Icon({ name, size = 18, className, label }: Props) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
