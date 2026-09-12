/**
 * Quiz quality gate — the mechanical answer to "I knew the answer before I
 * read the question".
 *
 * In a course this site is modelled on, the correct option was reliably the
 * longest and most carefully explained one, so a reader could score well by
 * pattern-matching shape instead of knowing anything. Style guidance alone
 * does not hold that line across hundreds of questions, so it is enforced
 * here: `npm run lint` (and therefore `npm run build`) fails on a question
 * whose answer is guessable from shape alone.
 *
 * Run: node scripts/lint-quizzes.ts
 */
import { MODULES } from '../src/content/index.ts';
import type { LabBlock, LessonBlock, QuizBlock } from '../src/types/content.ts';

/** Longest-to-shortest option length ratio allowed within one question. */
const MAX_LENGTH_RATIO = 1.35;
/** Fewest options a question may offer. */
const MIN_OPTIONS = 4;

/**
 * Phrases that hand the answer over regardless of subject knowledge:
 * absolutes are almost always the wrong option, and the "of the above"
 * forms reward reading the list instead of the material.
 */
const TELLS: RegExp[] = [
  /\ball of the above\b/i,
  /\bnone of the above\b/i,
  /\bboth of the above\b/i,
  /\bnever\b/i,
  /\balways\b/i,
];

const problems: string[] = [];
const fail = (where: string, msg: string) => problems.push(`${where}: ${msg}`);

const words = (s: string) => s.trim().split(/\s+/).length;

function checkQuiz(q: QuizBlock, where: string) {
  const opts = q.options;

  if (opts.length < MIN_OPTIONS) {
    fail(where, `only ${opts.length} options (minimum ${MIN_OPTIONS})`);
  }

  const correct = opts.filter((o) => o.correct);
  if (correct.length !== 1) {
    fail(where, `must have exactly one correct option, found ${correct.length}`);
  }

  opts.forEach((o, i) => {
    if (!o.explanation || o.explanation.trim() === '') {
      fail(where, `option ${i + 1} has no explanation — wrong picks must still teach`);
    }
    for (const tell of TELLS) {
      if (tell.test(o.text)) {
        fail(where, `option ${i + 1} contains a giveaway phrase (${tell.source})`);
      }
    }
  });

  const seen = new Set<string>();
  for (const o of opts) {
    const key = o.text.trim().toLowerCase();
    if (seen.has(key)) fail(where, `duplicate option text: "${o.text}"`);
    seen.add(key);
  }

  const lengths = opts.map((o) => o.text.trim().length);
  const max = Math.max(...lengths);
  const min = Math.min(...lengths);
  if (min > 0 && max / min > MAX_LENGTH_RATIO) {
    fail(
      where,
      `option lengths too uneven (${min}..${max} chars, ratio ${(max / min).toFixed(2)} > ${MAX_LENGTH_RATIO}) — even them out`,
    );
  }

  const answer = correct[0];
  if (answer) {
    const answerLen = answer.text.trim().length;
    const longest = Math.max(...lengths);
    if (answerLen === longest && lengths.filter((l) => l === longest).length === 1) {
      fail(where, 'the correct option is the single longest — guessable without reading');
    }

    const wordCounts = opts.map((o) => words(o.text));
    const maxWords = Math.max(...wordCounts);
    if (words(answer.text) === maxWords && wordCounts.filter((w) => w === maxWords).length === 1) {
      fail(where, 'the correct option has the most words — guessable without reading');
    }
  }
}

function checkLab(lab: LabBlock, where: string) {
  if (lab.questions.length === 0) fail(where, 'lab has no questions');
  if (!lab.download.file) fail(where, 'lab has no download file');
  if (!lab.download.password) fail(where, 'lab has no zip password');
  if (lab.tools.length === 0) fail(where, 'lab names no tools');

  const seen = new Set<string>();
  for (const q of lab.questions) {
    if (seen.has(q.id)) fail(where, `duplicate lab question id "${q.id}"`);
    seen.add(q.id);
    if (q.accept.length === 0) fail(where, `lab question "${q.id}" accepts nothing`);
    if (q.accept.some((a) => a.trim() === '')) {
      fail(where, `lab question "${q.id}" has an empty accepted answer`);
    }
    if (!q.explanation || q.explanation.trim() === '') {
      fail(where, `lab question "${q.id}" has no explanation`);
    }
  }
}

// ---- walk every block, collecting ids so duplicates surface too ----

const ids = new Map<string, string>();
const claimId = (id: string, where: string) => {
  const prior = ids.get(id);
  if (prior) fail(where, `id "${id}" already used at ${prior}`);
  else ids.set(id, where);
};

let quizCount = 0;
let labCount = 0;

for (const module of MODULES) {
  for (const lesson of module.lessons) {
    const base = `${module.id}/${lesson.id}`;
    lesson.blocks.forEach((block: LessonBlock, i: number) => {
      const where = `${base} block ${i + 1}`;
      if (block.type === 'quiz') {
        claimId(block.id, where);
        checkQuiz(block, `${where} [${block.id}]`);
        quizCount++;
      } else if (block.type === 'quiz-set') {
        claimId(block.id, where);
        for (const q of block.questions) {
          claimId(q.id, where);
          checkQuiz(q, `${where} [${q.id}]`);
          quizCount++;
        }
      } else if (block.type === 'lab') {
        claimId(block.id, where);
        checkLab(block, `${where} [${block.id}]`);
        labCount++;
      } else if (block.type === 'exercise') {
        claimId(block.id, where);
      }
    });
  }
}

if (problems.length > 0) {
  console.error(`\nQuiz lint FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(`Quiz lint passed: ${quizCount} question(s), ${labCount} lab(s), ${ids.size} unique id(s).`);
