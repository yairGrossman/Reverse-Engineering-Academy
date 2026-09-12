import { Link, Navigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { MODULES, getLesson } from '../content';
import { BlockRenderer } from '../components/blocks/BlockRenderer';
import { useProgress } from '../context/ProgressContext';
import { burstConfetti } from '../lib/confetti';
import { Icon } from '../components/ui/Icon';

/**
 * Global prev/next navigation: lessons flattened across all modules so the
 * "Next" button walks the entire curriculum in order.
 */
function flatLessons() {
  return MODULES.flatMap((m) => m.lessons.map((l) => ({ moduleId: m.id, lessonId: l.id, title: l.title })));
}

export function LessonPage() {
  const { moduleId = '', lessonId = '' } = useParams();
  const found = getLesson(moduleId, lessonId);
  const { isLessonComplete, toggleLessonComplete } = useProgress();

  // New lesson -> start reading from the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [moduleId, lessonId]);

  if (!found) return <Navigate to="/" replace />;
  const { module, lesson } = found;

  const all = flatLessons();
  const idx = all.findIndex((e) => e.moduleId === moduleId && e.lessonId === lessonId);
  const prev = idx > 0 ? all[idx - 1] : undefined;
  const next = idx < all.length - 1 ? all[idx + 1] : undefined;
  const complete = isLessonComplete(module.id, lesson.id);

  return (
    <article className="lesson-page">
      <div className="lesson-page__breadcrumb">
        <Link to={`/module/${module.id}`}>Module {module.number} · {module.title}</Link>
      </div>
      <h1 className="lesson-page__title">{lesson.title}</h1>

      <BlockRenderer blocks={lesson.blocks} />

      <div className="lesson-page__complete">
        <button
          type="button"
          className={`btn ${complete ? 'btn--ghost' : 'btn--primary'}`}
          onClick={(e) => {
            if (!complete) {
              const r = e.currentTarget.getBoundingClientRect();
              burstConfetti(r.left + r.width / 2, r.top + r.height / 2);
            }
            toggleLessonComplete(module.id, lesson.id);
          }}
        >
          {complete ? (
            <>
              <Icon name="check" size={16} /> Completed — click to undo
            </>
          ) : (
            'Mark lesson complete'
          )}
        </button>
      </div>

      <nav className="lesson-page__nav">
        {prev ? (
          <Link to={`/module/${prev.moduleId}/${prev.lessonId}`} className="card lesson-nav">
            <span className="lesson-nav__dir">
              <Icon name="arrow-left" size={15} /> Previous
            </span>
            <span className="lesson-nav__title">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/module/${next.moduleId}/${next.lessonId}`} className="card lesson-nav lesson-nav--next">
            <span className="lesson-nav__dir">
              Next <Icon name="arrow-right" size={15} />
            </span>
            <span className="lesson-nav__title">{next.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
