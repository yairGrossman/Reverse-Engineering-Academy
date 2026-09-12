import type { ListBlock } from '../../types/content';
import { renderInline } from './inlineMarkdown';

export function ListBlockView({ block }: { block: ListBlock }) {
  const items = block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>);
  return block.ordered ? (
    <ol className="block-list">{items}</ol>
  ) : (
    <ul className="block-list">{items}</ul>
  );
}
