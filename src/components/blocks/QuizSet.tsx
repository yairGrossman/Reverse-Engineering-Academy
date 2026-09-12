import { useMemo } from 'react';
import type { QuizSetBlock } from '../../types/content';
import { useProgress } from '../../context/ProgressContext';
import { shuffledOrder } from '../../lib/shuffle';
import { Quiz } from './Quiz';
import { Icon } from '../ui/Icon';

/**
 * A practice section's multiple-choice run. The question order is shuffled by
 * code (seeded by the set id) exactly as each question's options already are,
 * so nothing about the sequence is hand-authored.
 *
 * Each question renders through the existing `Quiz` component rather than a
 * parallel implementation — one answer/feedback/persistence behaviour, one
 * place to change it.
 */
export function QuizSet({ block }: { block: QuizSetBlock }) {
  const { quizAnswer } = useProgress();
  const order = useMemo(
    () => shuffledOrder(block.id, block.questions.length),
    [block.id, block.questions.length],
  );

  const total = block.questions.length;
  const answered = block.questions.filter((q) => quizAnswer(q.id) !== undefined).length;
  const correct = block.questions.filter((q) => {
    const picked = quizAnswer(q.id);
    return picked !== undefined && q.options[picked]?.correct === true;
  }).length;
  const done = answered === total;

  return (
    <section className="block-quizset">
      <header className="block-quizset__head">
        <span className="block-quizset__badge">Practice</span>
        {block.title && <h3 className="block-quizset__title">{block.title}</h3>}
        <span className="block-quizset__count">
          {answered}/{total} answered
        </span>
      </header>

      <div className="block-quizset__track">
        <div
          className="block-quizset__fill"
          style={{ width: `${total === 0 ? 0 : (answered / total) * 100}%` }}
        />
      </div>

      <ol className="block-quizset__list">
        {order.map((originalIndex, position) => (
          <li key={block.questions[originalIndex]!.id} className="block-quizset__item">
            <span className="block-quizset__num">{position + 1}</span>
            <Quiz block={block.questions[originalIndex]!} />
          </li>
        ))}
      </ol>

      {done && (
        <p className="block-quizset__score">
          <Icon name="check" size={16} /> {correct} of {total} correct
          {correct < total && ' — reread the explanations on the ones you missed.'}
        </p>
      )}
    </section>
  );
}
