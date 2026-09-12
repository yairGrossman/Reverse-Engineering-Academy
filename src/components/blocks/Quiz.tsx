import { useMemo, useState } from 'react';
import type { QuizBlock } from '../../types/content';
import { useProgress } from '../../context/ProgressContext';
import { renderInline } from './inlineMarkdown';
import { Icon } from '../ui/Icon';
import { shuffledOrder } from '../../lib/shuffle';

/**
 * Single multiple-choice question with instant feedback. The selected answer
 * persists via the progress store; after answering, every option shows its
 * explanation so wrong picks still teach.
 */
export function Quiz({ block }: { block: QuizBlock }) {
  const { quizAnswer, answerQuiz } = useProgress();
  const selected = quizAnswer(block.id);
  const answered = selected !== undefined;
  // Shake/pop feedback only for an answer given right now — a quiz
  // answered in a previous visit renders its state without re-animating.
  const [justAnswered, setJustAnswered] = useState(false);
  const order = useMemo(
    () => shuffledOrder(block.id, block.options.length),
    [block.id, block.options.length],
  );

  return (
    <div className="block-quiz">
      <div className="block-quiz__head">
        <span className="block-quiz__badge">Quiz</span>
        <span className="block-quiz__question">{renderInline(block.question)}</span>
      </div>

      <div className="block-quiz__options">
        {order.map((originalIndex, displayIndex) => {
          const opt = block.options[originalIndex]!;
          const isSelected = selected === originalIndex;
          const letter = String.fromCharCode(65 + displayIndex);
          const stateClass = !answered
            ? ''
            : opt.correct
              ? ' block-quiz__option--correct'
              : isSelected
                ? ' block-quiz__option--wrong'
                : ' block-quiz__option--dim';
          const freshClass =
            justAnswered && isSelected
              ? opt.correct
                ? ' block-quiz__option--fresh-correct'
                : ' block-quiz__option--fresh-wrong'
              : '';

          return (
            <button
              key={originalIndex}
              type="button"
              disabled={answered}
              className={`block-quiz__option${stateClass}${freshClass}`}
              onClick={() => {
                setJustAnswered(true);
                answerQuiz(block.id, originalIndex);
              }}
            >
              <span className="block-quiz__marker">
                {!answered ? (
                  letter
                ) : opt.correct ? (
                  <Icon name="check" size={15} />
                ) : isSelected ? (
                  <Icon name="cross" size={15} />
                ) : (
                  letter
                )}
              </span>
              <span>
                {renderInline(opt.text)}
                {answered && (isSelected || opt.correct) && (
                  <span className="block-quiz__explain">{renderInline(opt.explanation)}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
