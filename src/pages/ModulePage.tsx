import { Link, Navigate, useParams } from 'react-router-dom';
import { getModule } from '../content';
import { useProgress } from '../context/ProgressContext';
import { Icon } from '../components/ui/Icon';

/** Module overview: header + ordered lesson list with completion state. */
export function ModulePage() {
  const { moduleId = '' } = useParams();
  const module = getModule(moduleId);
  const { isLessonComplete } = useProgress();

  if (!module) return <Navigate to="/" replace />;

  return (
    <div className="module-page">
      <div className="module-page__eyebrow">Module {module.number}</div>
      <h1 className="module-page__title">{module.title}</h1>
      <p className="module-page__tagline">{module.tagline}</p>

      <div className="module-page__lessons">
        {module.lessons.map((lesson, i) => {
          const complete = isLessonComplete(module.id, lesson.id);
          return (
            <Link
              key={lesson.id}
              to={`/module/${module.id}/${lesson.id}`}
              className={`card lesson-row${complete ? ' lesson-row--done' : ''}`}
            >
              <span className="lesson-row__check">
                {complete ? <Icon name="check" size={15} label="Complete" /> : i + 1}
              </span>
              <span className="lesson-row__title">{lesson.title}</span>
              <span className="lesson-row__arrow">
                <Icon name="arrow-right" size={17} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
