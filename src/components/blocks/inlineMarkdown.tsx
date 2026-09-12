/**
 * Minimal inline-markdown renderer: **bold**, `code`, [text](url).
 * A full markdown library would be YAGNI — content is authored in-repo and
 * only needs these three inline forms. Regex tokenizer, ~50 lines, no deps.
 *
 * Link targets are ALLOWLISTED, not sanitised: http/https/mailto and relative
 * targets render as links, anything else renders as plain text. React warns on
 * `javascript:` hrefs but a warning is not a guarantee, and `data:text/html`,
 * `vbscript:` and `blob:` it does not touch at all. The allowlist is what makes
 * this parser safe to point at a string that did not come from the repo.
 */
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

// One alternation per supported form; first match wins at each position.
const TOKEN = /(\*\*(.+?)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;

const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:'];
/** Any leading scheme, e.g. `javascript:`. */
const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
/**
 * Drop whitespace and control characters (anything at or below U+0020).
 * Written as a code-point filter rather than a regex class so no literal
 * control byte ever sits in this source file.
 */
const stripIgnored = (url: string) =>
  [...url].filter((c) => (c.codePointAt(0) ?? 0) > 0x20).join('');

type Target = 'external' | 'route' | 'anchor' | 'blocked';

/**
 * Decide how (or whether) a target may be rendered, and return the cleaned
 * URL to render. Control characters and spaces come out before the scheme
 * test because a browser drops them too: `java\nscript:alert(1)` navigates, so
 * a scheme check against the raw string would wave it straight through.
 */
function classify(href: string): { target: Target; url: string } {
  const url = stripIgnored(href);
  const scheme = SCHEME.exec(url);
  if (scheme) {
    const allowed = ALLOWED_SCHEMES.includes(`${scheme[1].toLowerCase()}:`);
    return { target: allowed ? 'external' : 'blocked', url };
  }
  if (url.startsWith('#')) return { target: 'anchor', url };
  // `//host` is protocol-relative — a remote origin wearing a relative coat.
  if (url.startsWith('//')) return { target: 'blocked', url };
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return { target: 'route', url };
  }
  return { target: 'blocked', url };
}

function link(raw: string, text: string, key: number): ReactNode {
  const { target, url } = classify(raw);
  switch (target) {
    case 'external':
      // noopener alongside noreferrer: implied by both `noreferrer` and by
      // `target=_blank` in current browsers, but stated rather than assumed.
      return (
        <a key={key} href={url} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      );
    case 'route':
      // Internal links route client-side — no new tab, no full reload.
      return (
        <Link key={key} to={url}>
          {text}
        </Link>
      );
    case 'anchor':
      return (
        <a key={key} href={url}>
          {text}
        </a>
      );
    case 'blocked':
      // Not a link at all: the label survives, the target is dropped.
      return text;
  }
}

export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(TOKEN)) {
    const index = match.index;
    if (index > last) nodes.push(text.slice(last, index));

    if (match[2] !== undefined) {
      nodes.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(
        <code key={key++} className="inline-code">
          {match[4]}
        </code>,
      );
    } else if (match[6] !== undefined && match[7] !== undefined) {
      nodes.push(link(match[7], match[6], key++));
    }
    last = index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
