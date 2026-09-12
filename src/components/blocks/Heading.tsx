import type { HeadingBlock } from '../../types/content';
import { renderInline } from './inlineMarkdown';

export function Heading({ block }: { block: HeadingBlock }) {
  const content = renderInline(block.text);
  return block.level === 3 ? (
    <h3 className="block-heading block-heading--sub">{content}</h3>
  ) : (
    <h2 className="block-heading">{content}</h2>
  );
}
