import type { ProseBlock } from '../../types/content';
import { renderInline } from './inlineMarkdown';

export function Prose({ block }: { block: ProseBlock }) {
  return <p className="block-prose">{renderInline(block.text)}</p>;
}
