import { useState } from 'react';
import type { CodeBlock } from '../../types/content';
import { Icon } from '../ui/Icon';

/**
 * Code / prompt snippet with a copy button. Horizontal overflow scrolls
 * inside the block — the page itself never scrolls sideways.
 */
export function CodeBlockView({ block }: { block: CodeBlock }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (permissions/http) — button simply does nothing.
    }
  };

  return (
    <div className="block-code">
      <div className="block-code__bar">
        <span className="block-code__label">{block.title ?? block.language ?? 'code'}</span>
        <button type="button" className="block-code__copy" onClick={copy}>
          {copied ? (
            <>
              <Icon name="check" size={14} /> Copied
            </>
          ) : (
            'Copy'
          )}
        </button>
      </div>
      <pre>
        <code>{block.code}</code>
      </pre>
    </div>
  );
}
