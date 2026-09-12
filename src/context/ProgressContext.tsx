/**
 * Progress provider — owns the in-memory ProgressData and persists every
 * change through the injected ProgressStore. Exposes intent-level actions
 * (completeLesson, answerQuiz...) rather than raw setters, so components
 * stay decoupled from the data shape.
 *
 * Writers use functional setState (prev => next) so rapid successive
 * updates can never clobber each other, and persistence happens in an
 * effect that sees the settled state.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ProgressData, ProgressStore } from '../services/progress';

interface ProgressContextValue {
  isLessonComplete: (moduleId: string, lessonId: string) => boolean;
  toggleLessonComplete: (moduleId: string, lessonId: string) => void;
  /** Count of completed lessons within one module. */
  moduleCompletedCount: (moduleId: string, lessonIds: string[]) => number;
  totalCompletedCount: () => number;
  quizAnswer: (quizId: string) => number | undefined;
  answerQuiz: (quizId: string, optionIndex: number) => void;
  isExerciseRevealed: (exerciseId: string) => boolean;
  revealExercise: (exerciseId: string) => void;
  /** What the learner typed for one lab question, key `${labId}:${questionId}`. */
  labAnswer: (key: string) => string | undefined;
  submitLabAnswer: (key: string, value: string) => void;
  /** Current data, for export and for the import summary's counts. */
  snapshot: ProgressData;
  /** Wholesale replacement — the merge/replace outcome of an import. */
  replaceProgress: (next: ProgressData) => void;
  /** This browser refuses to persist; the sidebar says so. */
  storageBlocked: boolean;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

const lessonKey = (moduleId: string, lessonId: string) => `${moduleId}/${lessonId}`;

interface Props {
  store: ProgressStore;
  children: ReactNode;
}

export function ProgressProvider({ store, children }: Props) {
  const [data, setData] = useState<ProgressData>(() => store.load());

  // Persist after every settled state change — but NOT on initial mount:
  // saving the just-loaded state back is pointless, and the guard is what
  // keeps a boot render from overwriting anything (including a value the
  // import flow is about to replace).
  const storeRef = useRef(store);
  storeRef.current = store;
  const initialData = useRef(data);
  const dirty = useRef(false);
  const [storageBlocked, setStorageBlocked] = useState(() => store.isStorageBlocked());
  useEffect(() => {
    // Reference-compare: the mount value (and StrictMode's echo of it)
    // is skipped; any real setData produces a new object and persists.
    if (data === initialData.current) return;
    dirty.current = true;
    storeRef.current.save(data);
    // A save can be the moment storage turns out to be unavailable.
    setStorageBlocked(storeRef.current.isStorageBlocked());
  }, [data]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      isLessonComplete: (m, l) => data.completedLessons.includes(lessonKey(m, l)),

      toggleLessonComplete: (m, l) =>
        setData((prev) => {
          const key = lessonKey(m, l);
          const has = prev.completedLessons.includes(key);
          return {
            ...prev,
            completedLessons: has
              ? prev.completedLessons.filter((k) => k !== key)
              : [...prev.completedLessons, key],
          };
        }),

      moduleCompletedCount: (m, lessonIds) =>
        lessonIds.filter((l) => data.completedLessons.includes(lessonKey(m, l))).length,

      totalCompletedCount: () => data.completedLessons.length,

      quizAnswer: (quizId) => data.quizAnswers[quizId],

      answerQuiz: (quizId, optionIndex) =>
        setData((prev) => ({
          ...prev,
          quizAnswers: { ...prev.quizAnswers, [quizId]: optionIndex },
        })),

      labAnswer: (key) => data.labAnswers[key],

      submitLabAnswer: (key, value) =>
        setData((prev) => ({
          ...prev,
          labAnswers: { ...prev.labAnswers, [key]: value },
        })),

      isExerciseRevealed: (id) => data.revealedExercises.includes(id),

      revealExercise: (id) =>
        setData((prev) =>
          prev.revealedExercises.includes(id)
            ? prev
            : { ...prev, revealedExercises: [...prev.revealedExercises, id] },
        ),

      snapshot: data,

      // A fresh object, so the reference-compare guard above lets it persist.
      replaceProgress: (next) => setData(() => ({ ...next })),

      storageBlocked,
    }),
    [data, storageBlocked],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
