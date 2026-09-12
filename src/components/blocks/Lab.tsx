import { useState } from 'react';
import type { LabBlock, LabQuestion } from '../../types/content';
import { useProgress } from '../../context/ProgressContext';
import { isAccepted } from '../../lib/labAnswer';
import { LAB_MANIFEST } from '../../content/lab-manifest';
import { renderInline } from './inlineMarkdown';
import { Icon } from '../ui/Icon';

/** Bytes -> a short human size for the download button. */
function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * One finding: type it, check it, keep it. The typed value persists so a
 * returning learner sees their own work; correctness is recomputed from the
 * content each render rather than stored, so fixing a lab's accepted answers
 * can never leave a stale "solved" mark behind.
 */
function LabQuestionRow({ labId, question }: { labId: string; question: LabQuestion }) {
  const { labAnswer, submitLabAnswer } = useProgress();
  const storeKey = `${labId}:${question.id}`;
  const saved = labAnswer(storeKey);
  const [draft, setDraft] = useState(saved ?? '');
  const [showHint, setShowHint] = useState(false);

  const submitted = saved !== undefined && saved !== '';
  const correct = submitted && isAccepted(saved, question.accept, question.normalize);
  const state = !submitted ? '' : correct ? ' is-correct' : ' is-wrong';

  return (
    <li className={`block-lab__q${state}`}>
      <p className="block-lab__q-prompt">{renderInline(question.prompt)}</p>

      <form
        className="block-lab__q-form"
        onSubmit={(e) => {
          e.preventDefault();
          submitLabAnswer(storeKey, draft);
        }}
      >
        <input
          className="block-lab__q-input"
          type="text"
          value={draft}
          maxLength={200}
          spellCheck={false}
          autoComplete="off"
          placeholder="Your finding…"
          aria-label={question.prompt}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="btn btn--primary" disabled={draft.trim() === ''}>
          Check
        </button>
      </form>

      {submitted && (
        <p className="block-lab__q-verdict">
          {correct ? (
            <>
              <Icon name="check" size={15} /> Correct
            </>
          ) : (
            <>
              <Icon name="cross" size={15} /> Not that — look again, then resubmit.
            </>
          )}
        </p>
      )}

      {correct && <p className="block-lab__q-explain">{renderInline(question.explanation)}</p>}

      {!correct && question.hint && (
        <>
          <button type="button" className="btn btn--ghost" onClick={() => setShowHint((h) => !h)}>
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
          {showHint && (
            <p className="block-lab__q-hint">
              <Icon name="burst" size={15} /> {renderInline(question.hint)}
            </p>
          )}
        </>
      )}
    </li>
  );
}

/**
 * Hands-on lab: a real compiled artifact to download and analyse, then type
 * the findings back. The zip's size and SHA-256 come from the generated
 * manifest, so they always describe the file actually served.
 */
export function Lab({ block }: { block: LabBlock }) {
  const { labAnswer, isExerciseRevealed, revealExercise } = useProgress();
  const artifact = LAB_MANIFEST[block.download.file];
  const revealed = isExerciseRevealed(block.id);

  const solved = block.questions.filter((q) => {
    const saved = labAnswer(`${block.id}:${q.id}`);
    return saved !== undefined && isAccepted(saved, q.accept, q.normalize);
  }).length;
  const allSolved = solved === block.questions.length;

  return (
    <section className="block-lab">
      <header className="block-lab__head">
        <span className="block-lab__badge">Lab</span>
        <h3 className="block-lab__title">{block.title}</h3>
        <span className="block-lab__format">{block.format}</span>
      </header>

      <p className="block-lab__brief">{renderInline(block.brief)}</p>

      <div className="block-lab__tools">
        <span className="block-lab__tools-label">Tools for this lab:</span>
        {block.tools.map((t) => (
          <span key={t} className="block-lab__tool">
            {t}
          </span>
        ))}
      </div>

      <div className="block-lab__download">
        {artifact ? (
          <>
            <a className="btn btn--primary" href={`/labs/${block.download.file}`} download>
              <Icon name="burst" size={16} /> Download {block.download.file}
            </a>
            <span className="block-lab__meta">
              {humanSize(artifact.bytes)} · zip password{' '}
              <code className="block-lab__pw">{block.download.password}</code>
            </span>
            <span className="block-lab__hash" title="SHA-256 of the zip you just downloaded">
              SHA-256 {artifact.sha256}
            </span>
          </>
        ) : (
          <span className="block-lab__missing">
            This lab's artifact has not been built yet — run <code>npm run labs:build</code>.
          </span>
        )}
      </div>

      <p className="block-lab__note">
        The password is published openly: it exists so antivirus does not quarantine a teaching
        binary, not to protect anything. Open it with 7-Zip, WinRAR, or any <code>unzip</code>.
      </p>

      <ol className="block-lab__questions">
        {block.questions.map((q) => (
          <LabQuestionRow key={q.id} labId={block.id} question={q} />
        ))}
      </ol>

      <div className="block-lab__footer">
        <span className="block-lab__progress">
          {solved}/{block.questions.length} findings confirmed
        </span>
        {!revealed && (
          <button type="button" className="btn btn--ghost" onClick={() => revealExercise(block.id)}>
            {allSolved ? 'Show the full method' : "I'm stuck — show the walkthrough"}
          </button>
        )}
      </div>

      {revealed && (
        <div className="block-lab__walkthrough">
          <div className="block-lab__walkthrough-label">Walkthrough</div>
          <pre className="block-lab__walkthrough-body">{block.walkthrough}</pre>
        </div>
      )}
    </section>
  );
}
