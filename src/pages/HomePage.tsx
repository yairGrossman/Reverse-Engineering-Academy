import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { MODULES, PARTS, TOTAL_LESSONS } from '../content';
import { useProgress } from '../context/ProgressContext';
import { useReveal } from '../hooks/useReveal';
import { Clawd } from '../components/ui/Clawd';
import { CardMotif, HeroArt, PartMark } from '../components/ui/Illustration';

/** Landing page: hero (with Clawd) + curriculum grid grouped by part. */
export function HomePage() {
  const { moduleCompletedCount, totalCompletedCount } = useProgress();
  const done = totalCompletedCount();
  const reveal = useReveal();

  return (
    <div className="home">
      <section className="home__hero">
        {/* Flat geometric artwork behind the hero */}
        <HeroArt />

        <Clawd />
        <h1 className="home__title">
          Take any binary
          <br />
          <span className="gradient-text">apart</span>
        </h1>
        <p className="home__subtitle">
          A complete course on reverse engineering, from your first hex dump to unpacking
          and instrumentation. Native code, .NET, Java, Android and Python — every module
          ends with real compiled binaries to download and take apart yourself.
        </p>
        {done > 0 && (
          <p className="home__resume">
            {done} of {TOTAL_LESSONS} lessons complete — keep going
          </p>
        )}
      </section>

      {PARTS.map((part) => {
        const partModules = MODULES.filter((m) => m.part === part.number);
        if (partModules.length === 0) return null;
        return (
          <section key={part.number} className="home__part">
            <h2 className="home__part-title">
              <PartMark />
              <span className="home__part-num">Part {part.number}</span> {part.title}
            </h2>
            <div className="home__grid">
              {partModules.map((module, mi) => {
                const completed = moduleCompletedCount(
                  module.id,
                  module.lessons.map((l) => l.id),
                );
                const total = module.lessons.length;
                const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
                return (
                  <Link
                    key={module.id}
                    to={`/module/${module.id}`}
                    ref={reveal}
                    className="card module-card reveal"
                    style={{ '--reveal-i': mi } as CSSProperties}
                  >
                    <CardMotif index={module.number} />
                    <div className="module-card__num">{String(module.number).padStart(2, '0')}</div>
                    <h3 className="module-card__title">{module.title}</h3>
                    <p className="module-card__tagline">{module.tagline}</p>
                    <div className="module-card__footer">
                      <div className="module-card__track">
                        <div className="module-card__fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="module-card__count">
                        {completed}/{total}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <footer className="home__footer">
        <p>
          Built by{' '}
          <a href="https://github.com/yairGrossman" target="_blank" rel="noopener noreferrer">
            Yair Grossman
          </a>{' '}
          ·{' '}
          <a
            href="https://github.com/yairGrossman/claude-code-academy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source on GitHub
          </a>
        </p>
        <p className="home__footer-fineprint">
          An independent educational project — not affiliated with, endorsed by, or sponsored by
          Anthropic.
        </p>
      </footer>
    </div>
  );
}
