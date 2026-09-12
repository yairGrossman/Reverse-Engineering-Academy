import { useState } from 'react';
import type { ExerciseBlock } from '../../types/content';
import { useProgress } from '../../context/ProgressContext';
import { renderInline } from './inlineMarkdown';
import { Icon } from '../ui/Icon';

/**
 * Practice exercise: task -> user's scratch area -> revealable model answer.
 * The textarea is a thinking space, never graded; the learning happens when
 * the user compares their attempt against the model answer + explanation.
 * Reveal state persists so returning users see what they already worked on.
 */
export function Exercise({ block }: { block: ExerciseBlock }) {
  const { isExerciseRevealed, revealExercise } = useProgress();
  const revealed = isExerciseRevealed(block.id);
  const [showHint, setShowHint] = useState(false);
  const [attempt, setAttempt] = useState('');

  return (
    <div className="block-exercise">
      <div className="block-exercise__head">
        <span className="block-exercise__badge">Exercise</span>
        <span className="block-exercise__title">{block.title}</span>
      </div>

      <p className="block-exercise__task">{renderInline(block.task)}</p>

      <textarea
        className="block-exercise__attempt"
        placeholder="Write your attempt here (not graded — it's your thinking space)…"
        value={attempt}
        onChange={(e) => setAttempt(e.target.value)}
        rows={4}
      />

      <div className="block-exercise__actions">
        {block.hint && !revealed && (
          <button type="button" className="btn btn--ghost" onClick={() => setShowHint((s) => !s)}>
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
        )}
        {!revealed && (
          <button type="button" className="btn btn--primary" onClick={() => revealExercise(block.id)}>
            Reveal answer
          </button>
        )}
      </div>

      {showHint && block.hint && !revealed && (
        <p className="block-exercise__hint">
          <Icon name="burst" size={16} /> {renderInline(block.hint)}
        </p>
      )}

      {revealed && (
        <div className="block-exercise__answer">
          <div className="block-exercise__answer-label">Model answer</div>
          <pre className="block-exercise__answer-content">{block.answer}</pre>
          <p className="block-exercise__why">
            <strong>Why this works: </strong>
            {renderInline(block.explanation)}
          </p>
        </div>
      )}
    </div>
  );
}
