/**
 * Content type system — the contract between content data files and the
 * rendering layer. Every lesson is a flat list of LessonBlock values; the
 * BlockRenderer maps block.type -> component. Adding a new block type means
 * extending this union and registering one component (Open/Closed principle).
 *
 * Inline text fields support minimal markdown: **bold**, `code`, [text](url).
 */

/** Plain paragraph text. */
export interface ProseBlock {
  type: 'prose';
  text: string;
}

/** Section heading inside a lesson (renders as h2/h3). */
export interface HeadingBlock {
  type: 'heading';
  text: string;
  level?: 2 | 3;
}

/** Bulleted or numbered list. */
export interface ListBlock {
  type: 'list';
  ordered?: boolean;
  items: string[];
}

/** Code / prompt / terminal snippet with copy button. */
export interface CodeBlock {
  type: 'code';
  code: string;
  /** e.g. 'bash', 'ts', 'markdown', 'prompt' — used as a label, not for parsing. */
  language?: string;
  /** Optional title bar text, e.g. a filename. */
  title?: string;
}

export type CalloutVariant = 'tip' | 'warning' | 'info' | 'concept';

/** Highlighted aside: tips, warnings, key concepts. */
export interface CalloutBlock {
  type: 'callout';
  variant: CalloutVariant;
  title?: string;
  text: string;
}

/** One side of a good-vs-bad comparison. */
export interface ComparisonSide {
  /** The prompt / code being shown. */
  content: string;
  /** Why this side is good or bad. */
  note: string;
}

/** Side-by-side bad vs good example — the core teaching device for prompting. */
export interface ComparisonBlock {
  type: 'comparison';
  title?: string;
  bad: ComparisonSide;
  good: ComparisonSide;
}

/** Practice task with a revealable model answer. */
export interface ExerciseBlock {
  type: 'exercise';
  /** Unique across the whole site — used as the progress-store key. */
  id: string;
  title: string;
  task: string;
  hint?: string;
  /** Model answer shown after reveal (often a prompt or command). */
  answer: string;
  /** Why the answer is good — the actual teaching content. */
  explanation: string;
}

export interface QuizOption {
  text: string;
  correct: boolean;
  /** Shown after the user picks — explains why right/wrong. */
  explanation: string;
}

/** Single multiple-choice question with instant feedback. */
export interface QuizBlock {
  type: 'quiz';
  /** Unique across the whole site — used as the progress-store key. */
  id: string;
  question: string;
  options: QuizOption[];
}

/**
 * A sequence of multiple-choice questions forming a practice section.
 * Both the question order and each question's option order are shuffled by
 * code (seeded by id), so no ordering is ever hand-authored.
 */
export interface QuizSetBlock {
  type: 'quiz-set';
  /** Unique across the whole site — seeds the question shuffle. */
  id: string;
  title?: string;
  /** Each carries its own id; those ids are the progress-store keys. */
  questions: QuizBlock[];
}

/** How a typed lab answer is canonicalised before comparison. */
export type LabNormalize = 'text' | 'hex' | 'number';

/** One finding the learner must extract from the binary and type back. */
export interface LabQuestion {
  /** Unique within its lab; the store key is `${labId}:${id}`. */
  id: string;
  prompt: string;
  /** Every form counted as correct, compared after normalisation. */
  accept: string[];
  normalize: LabNormalize;
  hint?: string;
  /** Shown once answered correctly or given up on. */
  explanation: string;
}

/** The artifact formats the course ships labs in. */
export type LabFormat = 'PE' | 'ELF' | 'NET' | 'JAR' | 'APK' | 'PYC';

/**
 * Hands-on lab: download a real compiled artifact, analyse it with real
 * tools, type the findings back. The file itself is built by labs/build.mjs
 * and served from /labs; size and SHA-256 come from labs/manifest.json, never
 * hand-copied into content.
 */
export interface LabBlock {
  type: 'lab';
  /** Unique across the whole site — used as the progress-store key prefix. */
  id: string;
  title: string;
  /** What the binary is and what the learner is looking for. */
  brief: string;
  format: LabFormat;
  /** Tools this lab expects, e.g. ['Ghidra', 'x64dbg']. */
  tools: string[];
  download: {
    /** Filename under /labs, matching a key in labs/manifest.json. */
    file: string;
    /** Published openly — it defeats antivirus quarantine, not the learner. */
    password: string;
  };
  questions: LabQuestion[];
  /** Full method, revealed after the lab is solved or given up on. */
  walkthrough: string;
}

/** Simple data table. */
export interface TableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export type LessonBlock =
  | ProseBlock
  | HeadingBlock
  | ListBlock
  | CodeBlock
  | CalloutBlock
  | ComparisonBlock
  | ExerciseBlock
  | QuizBlock
  | QuizSetBlock
  | LabBlock
  | TableBlock;

export interface Lesson {
  /** URL slug, unique within the module. */
  id: string;
  title: string;
  blocks: LessonBlock[];
}

export interface Module {
  /** URL slug, unique across the site. */
  id: string;
  /** Display number, 1-based. */
  number: number;
  title: string;
  /** One-line description shown on cards and module header. */
  tagline: string;
  /** Which part of the curriculum this belongs to (1–5). */
  part: number;
  lessons: Lesson[];
}

export interface Part {
  number: number;
  title: string;
}
