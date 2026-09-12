import type { CalloutBlock, CalloutVariant } from '../../types/content';
import { renderInline } from './inlineMarkdown';
import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';

const VARIANT_META: Record<CalloutVariant, { icon: IconName; defaultTitle: string }> = {
  tip: { icon: 'burst', defaultTitle: 'Tip' },
  warning: { icon: 'warning', defaultTitle: 'Warning' },
  info: { icon: 'info', defaultTitle: 'Note' },
  concept: { icon: 'concept', defaultTitle: 'Key concept' },
};

export function Callout({ block }: { block: CalloutBlock }) {
  const meta = VARIANT_META[block.variant];
  return (
    <aside className={`block-callout block-callout--${block.variant}`}>
      <div className="block-callout__title">
        <Icon name={meta.icon} /> {block.title ?? meta.defaultTitle}
      </div>
      <p>{renderInline(block.text)}</p>
    </aside>
  );
}
