import type { TableBlock } from '../../types/content';
import { renderInline } from './inlineMarkdown';

export function TableBlockView({ block }: { block: TableBlock }) {
  return (
    <div className="block-table-wrap">
      <table className="block-table">
        <thead>
          <tr>
            {block.headers.map((h, i) => (
              <th key={i}>{renderInline(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c}>{renderInline(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
