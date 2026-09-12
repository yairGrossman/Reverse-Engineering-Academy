import { useProgress } from '../../context/ProgressContext';
import { TOTAL_LESSONS } from '../../content';
import { Icon } from '../ui/Icon';

interface Props {
  onMenuToggle: () => void;
}

/**
 * Top bar: mobile menu + overall progress. Saving is automatic to this
 * browser's localStorage; moving progress elsewhere is the export/import
 * pair in the sidebar footer.
 */
export function TopBar({ onMenuToggle }: Props) {
  const { totalCompletedCount } = useProgress();

  const done = totalCompletedCount();
  const pct = TOTAL_LESSONS === 0 ? 0 : Math.round((done / TOTAL_LESSONS) * 100);

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar__menu"
        onClick={onMenuToggle}
        aria-label="Toggle navigation"
      >
        <Icon name="menu" size={22} />
      </button>

      <div className="topbar__progress" title={`${done} of ${TOTAL_LESSONS} lessons complete`}>
        <div className="topbar__progress-track">
          <div className="topbar__progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="topbar__progress-label">{pct}%</span>
      </div>
    </header>
  );
}
