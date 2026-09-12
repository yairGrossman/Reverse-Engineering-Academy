/**
 * Export / import of the visitor's progress — the only way progress moves
 * between browsers, because nothing is ever sent anywhere.
 *
 * Two rules drive the whole component:
 *  1. Nothing is written until the visitor picks Merge or Replace. Choosing a
 *     file only shows a summary.
 *  2. The file's CONTENT decides whether it is accepted. The `accept`
 *     attribute is a filepicker hint any visitor can bypass, and a valid file
 *     with a wrong extension must still work.
 */
import { useRef, useState } from 'react';
import { useProgress } from '../../context/ProgressContext';
import {
  MAX_IMPORT_BYTES,
  PARSE_MESSAGES,
  makeEnvelope,
  mergeProgress,
  parseProgressJson,
  progressCounts,
} from '../../services/progress';
import type { ProgressData } from '../../services/progress';
import { Icon } from '../ui/Icon';

type Stage =
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
  | { kind: 'choose'; incoming: ProgressData }
  | { kind: 'confirm-replace'; incoming: ProgressData }
  | { kind: 'done'; message: string };

/** Local date, no time — same-day re-exports collide into the browser's (1). */
function exportFilename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `claude-code-academy-progress-${stamp}.json`;
}

export function ProgressTransfer() {
  const { snapshot, replaceProgress, storageBlocked } = useProgress();
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const fileInput = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = JSON.stringify(makeEnvelope(snapshot), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename();
    a.click();
    URL.revokeObjectURL(url);
    setStage({ kind: 'done', message: 'Progress file saved to your downloads.' });
  };

  const handleFile = async (file: File) => {
    // Cheap check first: never read a huge file into memory to reject it.
    if (file.size > MAX_IMPORT_BYTES) {
      setStage({ kind: 'error', message: PARSE_MESSAGES['too-large'] });
      return;
    }
    const result = parseProgressJson(await file.text());
    if (!result.ok) {
      setStage({ kind: 'error', message: PARSE_MESSAGES[result.reason] });
      return;
    }
    setStage({ kind: 'choose', incoming: result.data });
  };

  const applyMerge = (incoming: ProgressData) => {
    const merged = mergeProgress(snapshot, incoming);
    replaceProgress(merged);
    const c = progressCounts(merged);
    setStage({
      kind: 'done',
      message: `Merged. Now ${c.lessons} lessons, ${c.answers} answers, ${c.exercises} exercises.`,
    });
  };

  const applyReplace = (incoming: ProgressData) => {
    replaceProgress(incoming);
    const c = progressCounts(incoming);
    setStage({
      kind: 'done',
      message: `Replaced. Now ${c.lessons} lessons, ${c.answers} answers, ${c.exercises} exercises.`,
    });
  };

  const mine = progressCounts(snapshot);

  return (
    <div className="transfer">
      <p className="transfer__note">
        Progress is saved in this browser only. Export a backup to keep it or move it to another
        device.
      </p>

      {storageBlocked && (
        <p className="transfer__note transfer__note--warn">
          <Icon name="warning" size={14} /> This browser is blocking storage — your progress won't
          be saved this session.
        </p>
      )}

      <div className="transfer__actions">
        <button type="button" className="btn btn--ghost transfer__btn" onClick={handleExport}>
          <Icon name="download" size={15} /> Export
        </button>
        <button
          type="button"
          className="btn btn--ghost transfer__btn"
          onClick={() => fileInput.current?.click()}
        >
          <Icon name="upload" size={15} /> Import
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        className="transfer__file"
        accept="application/json,.json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so picking the same file again re-fires onChange.
          e.target.value = '';
          if (file) void handleFile(file);
        }}
      />

      {stage.kind === 'error' && (
        <p className="transfer__panel transfer__panel--error" role="alert">
          {stage.message} Nothing was changed.
        </p>
      )}

      {stage.kind === 'done' && <p className="transfer__panel">{stage.message}</p>}

      {stage.kind === 'choose' &&
        (() => {
          const file = progressCounts(stage.incoming);
          const merged = progressCounts(mergeProgress(snapshot, stage.incoming));
          return (
            <div className="transfer__panel">
              <p>
                <strong>This file:</strong> {file.lessons} lessons, {file.answers} quiz answers,{' '}
                {file.exercises} exercises revealed.
              </p>
              <p>
                <strong>This browser:</strong> {mine.lessons} lessons, {mine.answers} quiz answers,{' '}
                {mine.exercises} exercises.
              </p>
              <p>
                <strong>Merge</strong> &rarr; {merged.lessons} lessons, {merged.answers} answers,{' '}
                {merged.exercises} exercises. <strong>Replace</strong> &rarr; exactly the file.
              </p>
              <div className="transfer__actions">
                <button
                  type="button"
                  className="btn btn--primary transfer__btn"
                  onClick={() => applyMerge(stage.incoming)}
                >
                  Merge (recommended)
                </button>
                <button
                  type="button"
                  className="btn btn--ghost transfer__btn"
                  onClick={() => setStage({ kind: 'confirm-replace', incoming: stage.incoming })}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className="btn btn--ghost transfer__btn"
                  onClick={() => setStage({ kind: 'idle' })}
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        })()}

      {stage.kind === 'confirm-replace' && (
        <div className="transfer__panel transfer__panel--error">
          <p>
            Discard the {mine.lessons} lessons and {mine.answers} answers saved in this browser?
          </p>
          <div className="transfer__actions">
            <button
              type="button"
              className="btn btn--primary transfer__btn"
              onClick={() => applyReplace(stage.incoming)}
            >
              Discard and replace
            </button>
            <button
              type="button"
              className="btn btn--ghost transfer__btn"
              onClick={() => setStage({ kind: 'idle' })}
            >
              Keep mine
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
