/**
 * Canonicalising what a learner types into a binary lab.
 *
 * Two people reading the same constant out of a disassembler legitimately
 * write it differently — `0x1F`, `1f`, `31`, `0X1f `. Grading must accept all
 * of those for the same finding while still rejecting a genuinely wrong
 * value, so comparison happens on a normalised form rather than raw text.
 */
import type { LabNormalize } from '../types/content';

/** Longest input worth normalising; matches the store's per-value cap. */
const MAX_INPUT = 200;

function normalizeText(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Hex: drop an optional `0x`, separators and leading zeros, so `0x00_1F`,
 * `1f` and `1F` collapse together. A value that is not hex is left as text,
 * which simply fails to match a hex expectation.
 */
function normalizeHex(v: string): string {
  const cleaned = v.trim().toLowerCase().replace(/^0x/, '').replace(/[\s_]/g, '');
  if (!/^[0-9a-f]+$/.test(cleaned)) return normalizeText(v);
  const stripped = cleaned.replace(/^0+/, '');
  return stripped === '' ? '0' : stripped;
}

/**
 * Number: accepts decimal or `0x` hex and compares by value, so `31` and
 * `0x1f` are the same answer. Anything unparseable falls back to text.
 */
function normalizeNumber(v: string): string {
  const cleaned = v.trim().toLowerCase().replace(/[\s_,]/g, '');
  const parsed = /^0x[0-9a-f]+$/.test(cleaned)
    ? Number.parseInt(cleaned.slice(2), 16)
    : /^-?\d+$/.test(cleaned)
      ? Number.parseInt(cleaned, 10)
      : Number.NaN;
  return Number.isNaN(parsed) ? normalizeText(v) : String(parsed);
}

export function normalizeAnswer(value: string, mode: LabNormalize): string {
  const v = value.slice(0, MAX_INPUT);
  if (mode === 'hex') return normalizeHex(v);
  if (mode === 'number') return normalizeNumber(v);
  return normalizeText(v);
}

/** True when the typed value matches any accepted form of the answer. */
export function isAccepted(value: string, accept: string[], mode: LabNormalize): boolean {
  const got = normalizeAnswer(value, mode);
  if (got === '') return false;
  return accept.some((a) => normalizeAnswer(a, mode) === got);
}
