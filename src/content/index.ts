/**
 * Content registry — the single place that knows which modules exist and in
 * what order. Adding a module to the site = write its data file + add the
 * import here. Nothing else in the app changes (Open/Closed).
 */
import type { LabBlock, Module, Part, QuizBlock } from '../types/content';
import { whatIsReModule } from './modules/01-what-is-re.ts';
import { sourceToBinaryModule } from './modules/02-source-to-binary.ts';
import { hexMemoryDataModule } from './modules/03-hex-memory-data.ts';
import { x86AssemblyModule } from './modules/04-x86-64-assembly.ts';
import { ghidraModule } from './modules/05-ghidra-static-analysis.ts';
import { dynamicAnalysisModule } from './modules/06-dynamic-analysis.ts';

export const PARTS: Part[] = [
  { number: 1, title: 'Foundations' },
  { number: 2, title: 'Native Code' },
  { number: 3, title: 'Managed & Bytecode' },
  { number: 4, title: 'Defeating Defenses' },
  { number: 5, title: 'Mastery' },
];

export const MODULES: Module[] = [
  whatIsReModule,
  sourceToBinaryModule,
  hexMemoryDataModule,
  x86AssemblyModule,
  ghidraModule,
  dynamicAnalysisModule,
];

export function getModule(moduleId: string): Module | undefined {
  return MODULES.find((m) => m.id === moduleId);
}

export function getLesson(moduleId: string, lessonId: string) {
  const module = getModule(moduleId);
  const lesson = module?.lessons.find((l) => l.id === lessonId);
  return module && lesson ? { module, lesson } : undefined;
}

/** Total lesson count across the site — used for the overall progress bar. */
export const TOTAL_LESSONS = MODULES.reduce((sum, m) => sum + m.lessons.length, 0);

/*
 * The real id set, derived from the content — never hand-maintained.
 * `parseProgressJson` filters stored/imported keys against these so junk ids
 * (typos, renamed lessons, a hand-edited file) can't accumulate forever.
 */

/** Every valid completed-lesson key, formatted `${moduleId}/${lessonId}`. */
export const LESSON_KEYS: ReadonlySet<string> = new Set(
  MODULES.flatMap((m) => m.lessons.map((l) => `${m.id}/${l.id}`)),
);

const allBlocks = MODULES.flatMap((m) => m.lessons.flatMap((l) => l.blocks));

const labBlocks: LabBlock[] = allBlocks.filter((b) => b.type === 'lab');

/**
 * Every valid quiz id — standalone questions AND the ones nested inside a
 * practice set, which persist individually just like standalone ones.
 */
export const QUIZ_IDS: ReadonlySet<string> = new Set(
  allBlocks.flatMap((b): QuizBlock[] =>
    b.type === 'quiz' ? [b] : b.type === 'quiz-set' ? b.questions : [],
  ).map((q) => q.id),
);

/**
 * Every id whose "revealed" state is tracked. Exercises reveal a model
 * answer; labs reveal a walkthrough — same one-way flag, so they share the
 * one collection rather than duplicating the machinery for a second.
 */
export const EXERCISE_IDS: ReadonlySet<string> = new Set([
  ...allBlocks.filter((b) => b.type === 'exercise').map((b) => b.id),
  ...labBlocks.map((b) => b.id),
]);

/** Every valid lab-answer store key, formatted `${labId}:${questionId}`. */
export const LAB_ANSWER_KEYS: ReadonlySet<string> = new Set(
  labBlocks.flatMap((lab) => lab.questions.map((q) => `${lab.id}:${q.id}`)),
);

/** Every lab on the site — used by the quiz/lab linter and the build check. */
export const LABS: readonly LabBlock[] = labBlocks;
