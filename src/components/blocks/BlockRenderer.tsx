/**
 * Block registry (Registry/Strategy pattern) — the Open/Closed seam of the
 * site. Renders any LessonBlock by looking up its component in a typed map.
 * Adding a block type = extend the union in types/content.ts + one entry
 * here. The mapped type below forces every union member to have an entry,
 * so forgetting one is a compile error, not a runtime blank.
 */
import type { ComponentType, CSSProperties } from 'react';
import type { LessonBlock } from '../../types/content';
import { useReveal } from '../../hooks/useReveal';
import { Prose } from './Prose';
import { Heading } from './Heading';
import { ListBlockView } from './ListBlockView';
import { CodeBlockView } from './CodeBlockView';
import { Callout } from './Callout';
import { Comparison } from './Comparison';
import { Exercise } from './Exercise';
import { Quiz } from './Quiz';
import { QuizSet } from './QuizSet';
import { Lab } from './Lab';
import { TableBlockView } from './TableBlockView';

type BlockOf<K extends LessonBlock['type']> = Extract<LessonBlock, { type: K }>;

type Registry = {
  [K in LessonBlock['type']]: ComponentType<{ block: BlockOf<K> }>;
};

const registry: Registry = {
  prose: Prose,
  heading: Heading,
  list: ListBlockView,
  code: CodeBlockView,
  callout: Callout,
  comparison: Comparison,
  exercise: Exercise,
  quiz: Quiz,
  'quiz-set': QuizSet,
  lab: Lab,
  table: TableBlockView,
};

export function BlockRenderer({ blocks }: { blocks: LessonBlock[] }) {
  const reveal = useReveal();
  return (
    <>
      {blocks.map((block, i) => {
        // TS can't correlate the key with the block at the lookup site,
        // but the Registry mapped type guarantees the pairing is sound.
        const Component = registry[block.type] as ComponentType<{ block: LessonBlock }>;
        return (
          <div
            key={i}
            ref={reveal}
            className="reveal"
            style={{ '--reveal-i': i % 3 } as CSSProperties}
          >
            <Component block={block} />
          </div>
        );
      })}
    </>
  );
}
