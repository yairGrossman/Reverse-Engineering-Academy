import type { ComparisonBlock, ComparisonSide } from '../../types/content';
import { renderInline } from './inlineMarkdown';
import { Icon } from '../ui/Icon';

function Side({ side, kind }: { side: ComparisonSide; kind: 'bad' | 'good' }) {
  return (
    <div className={`block-compare__side block-compare__side--${kind}`}>
      <div className="block-compare__tag">
        <Icon name={kind === 'bad' ? 'cross' : 'check'} size={15} />
        {kind === 'bad' ? 'Weak' : 'Strong'}
      </div>
      <pre className="block-compare__content">{side.content}</pre>
      <p className="block-compare__note">{renderInline(side.note)}</p>
    </div>
  );
}

/** Side-by-side weak vs strong example — stacks vertically on mobile. */
export function Comparison({ block }: { block: ComparisonBlock }) {
  return (
    <div className="block-compare">
      {block.title && <div className="block-compare__title">{renderInline(block.title)}</div>}
      <div className="block-compare__grid">
        <Side side={block.bad} kind="bad" />
        <Side side={block.good} kind="good" />
      </div>
    </div>
  );
}
