import { NavLink } from 'react-router-dom';
import { MODULES, PARTS, TOTAL_LESSONS } from '../../content';
import { useProgress } from '../../context/ProgressContext';
import { Icon } from '../ui/Icon';
import { BrandMark } from '../ui/Illustration';
import { ProgressTransfer } from './ProgressTransfer';

interface Props {
  open: boolean;
  onNavigate: () => void;
}

/**
 * Module navigation grouped by curriculum part, with per-module progress.
 * On mobile the sidebar slides in as an overlay; `onNavigate` lets the
 * layout close it after a link tap.
 */
export function Sidebar({ open, onNavigate }: Props) {
  const { moduleCompletedCount, totalCompletedCount } = useProgress();

  return (
    <nav className={`sidebar${open ? ' sidebar--open' : ''}`} aria-label="Course modules">
      <NavLink to="/" className="sidebar__logo" onClick={onNavigate}>
        <BrandMark size={26} />
        <span>
          <span className="gradient-text">Claude Code</span>&nbsp;Academy
        </span>
      </NavLink>

      <div className="sidebar__scroll">
        {PARTS.map((part) => {
          const partModules = MODULES.filter((m) => m.part === part.number);
          if (partModules.length === 0) return null;
          return (
            <div key={part.number} className="sidebar__part">
              <div className="sidebar__part-title">
                Part {part.number} · {part.title}
              </div>
              {partModules.map((module) => {
                const done = moduleCompletedCount(
                  module.id,
                  module.lessons.map((l) => l.id),
                );
                const total = module.lessons.length;
                return (
                  <NavLink
                    key={module.id}
                    to={`/module/${module.id}`}
                    className={({ isActive }) =>
                      `sidebar__module${isActive ? ' sidebar__module--active' : ''}`
                    }
                    onClick={onNavigate}
                  >
                    <span className="sidebar__module-num">{module.number}</span>
                    <span className="sidebar__module-title">{module.title}</span>
                    <span
                      className={`sidebar__module-progress${done === total && total > 0 ? ' sidebar__module-progress--done' : ''}`}
                    >
                      {done === total && total > 0 ? (
                        <Icon name="check" size={14} label="Module complete" />
                      ) : (
                        `${done}/${total}`
                      )}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__count">
          {totalCompletedCount()} / {TOTAL_LESSONS} lessons complete
        </div>
        <ProgressTransfer />
      </div>
    </nav>
  );
}
