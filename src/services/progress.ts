/**
 * Progress persistence — Dependency Inversion in practice.
 * The UI depends on the ProgressStore interface, never on localStorage
 * directly. localStorage is the ONLY store: nothing is ever transmitted.
 * Moving progress to another browser is the visitor's explicit export/import
 * of the same versioned envelope this file writes to storage.
 *
 * `parseProgressJson` is the single validation gate on BOTH paths — the
 * stored value and an imported file are equally untrusted input.
 */
import { EXERCISE_IDS, LAB_ANSWER_KEYS, LESSON_KEYS, QUIZ_IDS } from '../content';

export interface ProgressData {
  /** Keys of completed lessons, formatted `${moduleId}/${lessonId}`. */
  completedLessons: string[];
  /** quizId -> index of the option the user selected. */
  quizAnswers: Record<string, number>;
  /** Exercise ids the user has revealed the answer for. */
  revealedExercises: string[];
  /**
   * What the learner typed into a binary-lab question, keyed
   * `${labId}:${questionId}`. Stored verbatim so a returning visitor sees
   * their own wording; correctness is recomputed from the content, never
   * persisted — a lab whose accepted answers change must not leave a stale
   * "solved" flag behind.
   */
  labAnswers: Record<string, string>;
}

/**
 * What gets written to localStorage and to an export file — identical shapes,
 * so the load path and the import path exercise the same code.
 */
export interface ProgressEnvelope {
  app: typeof APP_ID;
  version: number;
  /** ISO timestamp; informational only, never trusted for logic. */
  exportedAt: string;
  data: ProgressData;
}

export interface ProgressStore {
  /** Synchronous load for instant first render. */
  load(): ProgressData;
  save(data: ProgressData): void;
  /** True when this browser refuses to persist (blocked or full storage). */
  isStorageBlocked(): boolean;
}

export const emptyProgress = (): ProgressData => ({
  completedLessons: [],
  quizAnswers: {},
  revealedExercises: [],
  labAnswers: {},
});

const APP_ID = 'reverse-engineering-academy';

/** Bump ONLY together with a migrator; see MIGRATIONS below. */
export const CURRENT_VERSION = 1;

/** 250x the largest legitimate file. Checked before JSON.parse. */
export const MAX_IMPORT_BYTES = 1_000_000;
/** Post-parse cap per collection — a huge array would hang the render loop. */
const MAX_ENTRIES = 2000;
/** Quiz answers are option indices, not arbitrary numbers. */
const MAX_OPTION_INDEX = 100;
/** A lab answer is a short finding (an address, a key, a name), never prose. */
const MAX_LAB_ANSWER_LENGTH = 200;
/** Keys that must never reach an object literal, enforced not assumed. */
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];

export type ParseFailure = 'not-ours' | 'too-large' | 'newer-version' | 'malformed';

export type ParseResult =
  | { ok: true; data: ProgressData }
  | { ok: false; reason: ParseFailure };

/** Copy shown by the import UI. Two reasons share the generic message. */
export const PARSE_MESSAGES: Record<ParseFailure, string> = {
  'not-ours': 'Not a Reverse Engineering Academy progress file.',
  malformed: 'Not a Reverse Engineering Academy progress file.',
  'too-large': 'File is too large (max 1 MB).',
  'newer-version': 'This file was made by a newer version of the site.',
};

/**
 * Version dispatch table: MIGRATIONS[n] takes a version-n payload and returns
 * a version-(n+1) payload. Each migrator is pure and is NEVER edited after it
 * ships — old files must keep parsing forever.
 *
 * Empty today: version 1 is current. The additive-only rule keeps it that way
 * — new fields are optional with a default from emptyProgress(); renaming or
 * repurposing an existing field requires a version bump AND a migrator here.
 */
const MIGRATIONS: Record<number, (data: unknown) => unknown> = {};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const hasForbiddenKey = (o: object) =>
  FORBIDDEN_KEYS.some((k) => Object.prototype.hasOwnProperty.call(o, k));

/**
 * Validate a candidate against the CURRENT schema.
 * Wrong-typed values reject the whole payload; well-typed values whose ids the
 * site doesn't know are filtered out (renamed or removed lessons).
 */
function validateCurrent(candidate: unknown): ParseResult {
  if (!isRecord(candidate)) return { ok: false, reason: 'malformed' };

  const stringArray = (v: unknown, cap: number): string[] | null => {
    if (!Array.isArray(v) || v.length > cap) return null;
    if (!v.every((s) => typeof s === 'string')) return null;
    return v as string[];
  };

  const lessons = stringArray(candidate.completedLessons, MAX_ENTRIES);
  const revealed = stringArray(candidate.revealedExercises, MAX_ENTRIES);
  if (!lessons || !revealed) return { ok: false, reason: 'malformed' };

  const rawAnswers = candidate.quizAnswers;
  if (!isRecord(rawAnswers)) return { ok: false, reason: 'malformed' };
  if (hasForbiddenKey(rawAnswers)) return { ok: false, reason: 'malformed' };
  const answerEntries = Object.entries(rawAnswers);
  if (answerEntries.length > MAX_ENTRIES) return { ok: false, reason: 'malformed' };
  for (const [, n] of answerEntries) {
    if (!Number.isInteger(n) || (n as number) < 0 || (n as number) >= MAX_OPTION_INDEX) {
      return { ok: false, reason: 'malformed' };
    }
  }

  // Lab answers: same treatment, but the values are short strings.
  const rawLab = candidate.labAnswers ?? {};
  if (!isRecord(rawLab)) return { ok: false, reason: 'malformed' };
  if (hasForbiddenKey(rawLab)) return { ok: false, reason: 'malformed' };
  const labEntries = Object.entries(rawLab);
  if (labEntries.length > MAX_ENTRIES) return { ok: false, reason: 'malformed' };
  for (const [, v] of labEntries) {
    if (typeof v !== 'string' || v.length > MAX_LAB_ANSWER_LENGTH) {
      return { ok: false, reason: 'malformed' };
    }
  }

  // Shape is sound — now keep only ids this build of the site knows about.
  const quizAnswers: Record<string, number> = {};
  for (const [id, n] of answerEntries) {
    if (QUIZ_IDS.has(id)) quizAnswers[id] = n as number;
  }

  const labAnswers: Record<string, string> = {};
  for (const [key, v] of labEntries) {
    if (LAB_ANSWER_KEYS.has(key)) labAnswers[key] = v as string;
  }

  return {
    ok: true,
    data: {
      completedLessons: [...new Set(lessons.filter((k) => LESSON_KEYS.has(k)))],
      quizAnswers,
      revealedExercises: [...new Set(revealed.filter((id) => EXERCISE_IDS.has(id)))],
      labAnswers,
    },
  };
}

/**
 * The only gate. Parses a stored value or an imported file, dispatches on the
 * version inside it, migrates forward, then validates.
 *
 * A bare `{completedLessons, quizAnswers, revealedExercises}` object with no
 * envelope is treated as version 1 — that keeps every file exported before
 * the envelope existed, and the old progress.json, readable forever.
 */
export function parseProgressJson(json: string): ParseResult {
  if (json.length > MAX_IMPORT_BYTES) return { ok: false, reason: 'too-large' };

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'not-ours' };
  }
  if (!isRecord(raw)) return { ok: false, reason: 'not-ours' };
  if (hasForbiddenKey(raw)) return { ok: false, reason: 'malformed' };

  // Envelope form.
  if (raw.version !== undefined) {
    if (!Number.isInteger(raw.version) || (raw.version as number) < 1) {
      return { ok: false, reason: 'malformed' };
    }
    let version = raw.version as number;
    if (version > CURRENT_VERSION) return { ok: false, reason: 'newer-version' };
    if (!isRecord(raw.data)) return { ok: false, reason: 'malformed' };

    let payload: unknown = raw.data;
    while (version < CURRENT_VERSION) {
      const migrate = MIGRATIONS[version];
      if (!migrate) return { ok: false, reason: 'malformed' };
      payload = migrate(payload);
      version += 1;
    }
    return validateCurrent(payload);
  }

  // Bare legacy form (version 1). Anything with none of our keys isn't ours.
  const looksLikeOurs =
    'completedLessons' in raw || 'quizAnswers' in raw || 'revealedExercises' in raw;
  if (!looksLikeOurs) return { ok: false, reason: 'not-ours' };

  // Missing collections default in, so a partial old file still loads.
  return validateCurrent({ ...emptyProgress(), ...raw });
}

export const makeEnvelope = (data: ProgressData): ProgressEnvelope => ({
  app: APP_ID,
  version: CURRENT_VERSION,
  exportedAt: new Date().toISOString(),
  data,
});

/** Counts shown in the import summary before anything is written. */
export const progressCounts = (d: ProgressData) => ({
  lessons: d.completedLessons.length,
  answers: Object.keys(d.quizAnswers).length,
  exercises: d.revealedExercises.length,
  labs: Object.keys(d.labAnswers).length,
});

/**
 * Non-destructive by construction: set-union on both lists, and on a quiz
 * conflict the LOCAL answer wins — someone who answered on this device keeps
 * that answer, imported answers fill only the gaps.
 */
export const mergeProgress = (local: ProgressData, incoming: ProgressData): ProgressData => ({
  completedLessons: [...new Set([...local.completedLessons, ...incoming.completedLessons])],
  quizAnswers: { ...incoming.quizAnswers, ...local.quizAnswers },
  revealedExercises: [...new Set([...local.revealedExercises, ...incoming.revealedExercises])],
  labAnswers: { ...incoming.labAnswers, ...local.labAnswers },
});

/**
 * Never rename this key. The schema version lives inside the value (see
 * ProgressEnvelope) — bumping the key would orphan every visitor's data.
 */
const STORAGE_KEY = 'rea-progress-v1';
const PROBE_KEY = 'rea-storage-probe';

export class LocalStorageProgressStore implements ProgressStore {
  /**
   * Blocked storage is not full storage: Firefox with dom.storage.enabled
   * off, hardened privacy extensions and locked-down WebViews throw
   * SecurityError on setItem. Probe once up front so the UI can say so
   * honestly instead of pretending to save.
   */
  private blocked: boolean;

  constructor() {
    this.blocked = !this.probe();
  }

  private probe(): boolean {
    try {
      localStorage.setItem(PROBE_KEY, '1');
      localStorage.removeItem(PROBE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  isStorageBlocked(): boolean {
    return this.blocked;
  }

  load(): ProgressData {
    let raw: string | null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      return emptyProgress();
    }
    if (!raw) return emptyProgress();

    const result = parseProgressJson(raw);
    // A wrong-typed stored value used to white-screen the app on every later
    // visit. Discard it instead — losing a corrupt value costs nothing.
    return result.ok ? result.data : emptyProgress();
  }

  save(data: ProgressData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(makeEnvelope(data)));
      this.blocked = false;
    } catch {
      // Full or blocked: progress won't persist. Non-fatal, but not silent —
      // the sidebar renders the flag.
      this.blocked = true;
    }
  }
}
