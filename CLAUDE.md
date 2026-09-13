# Reverse Engineering Academy

Interactive learning site: reverse engineering from zero to mastery. Vite + React 19 + TS strict, static SPA, no backend. Built from the `claude-code-academy` codebase, keeps its architecture.

> **Continuing the course (writing module 14)? Read `docs/CONTINUE-HERE.md` first.**
> It holds the authoring recipe, the per-module research plan, the sources already verified, the ones that FAILED verification, and the decisions not to re-litigate. This file is only the standing rules. `docs/ORIGINAL-PLAN.md` is the historical record of what was agreed and why.

## Commands
- Dev: `npm run dev` (port 5173)
- Typecheck: `npx tsc -b` — run after every change
- Build: `npm run build` (runs tsc first)
- Lint: `npm run lint` (oxlint **+ the quiz-quality gate**)
- Labs: `npm run labs:build` (all) or `npm run labs:build <lab-id>` (one)

## Where the project stands
- **Written:** modules 1–13 — 51 lessons, 118 questions, 18 labs wired into lessons.
- **Not written:** module 14.
- **Lab pipeline:** complete, proven for all six formats.
- **Built but not yet used by any lesson:** (none remaining — all four pre-built managed/bytecode labs are now used).

## Architecture
- **Content is data**: modules live in `src/content/modules/*.ts` as typed `Module` objects. Adding a module = new data file + import in `src/content/index.ts`. Never hardcode lesson content in components. Module files import with an explicit `.ts` extension — required so Node can run `scripts/lint-quizzes.ts` against the same content the site bundles.
- Rendering: `src/components/blocks/BlockRenderer.tsx` maps `block.type -> component` via a typed registry. New block type = extend the union in `src/types/content.ts` + one registry entry (compile error if missed). Existing types: `prose`, `heading`, `list`, `code`, `callout`, `comparison`, `exercise`, `quiz`, `quiz-set`, `lab`, `table`.
- Progress: components use `useProgress()` only. `LocalStorageProgressStore` (`src/services/progress.ts`) is the ONLY store — localStorage key `rea-progress-v1`, never renamed (the schema version lives inside the value, in a `{app, version, exportedAt, data}` envelope). **No network call of any kind** — keep `connect-src 'none'` in `public/_headers`. Cross-device transfer is the visitor's manual export/import. `parseProgressJson` is the single validation gate on BOTH the load and the import path.
- Styles: design tokens in `src/styles/tokens.css`. SINGLE light theme — no dark mode. Never hardcode colors in components or CSS — use tokens. ONE exception: `Clawd.tsx` (mascot keeps fixed colors).
- Iconography/art: **NO EMOJI anywhere in UI or content**. UI symbols come from `src/components/ui/Icon.tsx`; decorative artwork from `src/components/ui/Illustration.tsx`.
- Logo: **Clawd in a yellow construction hard hat**. `BrandMark` (`Illustration.tsx`) and `public/favicon.svg` are ONE logo, same 128 viewBox and same rect coordinates — edit both together. `Clawd.tsx` (the hero mascot) carries the same hat in negative-y headroom so the original body coordinates were never touched. Axis-aligned rects only, small `rx`, no curves/strokes/gradients; fixed colours `#da7756` body, `#0d0d0d` ink, `#f2b705` hat, `#d99106` ridge. The dome is stepped with **shrinking width deltas (+18/+10/+6)** so it reads round rather than conical, and the brim is short — a wide thin brim reads as a sun hat, which two earlier attempts did. Bump `?v=` on the `<link rel="icon">` in `index.html` whenever the icon changes.

## The two rules that make this course different

### 1. Multiple-choice answers must not be guessable from shape
The course this is built from had a real flaw: the correct option was reliably the longest and most explained, so a reader could score well without reading the question. That is now **mechanically impossible** — `scripts/lint-quizzes.ts` runs as part of `npm run lint` and fails the build when:
- the correct option is the single longest, or has the most words
- option lengths within a question vary by more than 1.35x
- there are fewer than 4 options
- an option contains a giveaway phrase (`all/none/both of the above`, `never`, `always`)
- an option has no `explanation`, options duplicate, or any id collides site-wide

When writing questions: keep every option in the same length band and register, and make each distractor a mistake a real learner makes. Expect the linter to push back on your first draft — it pushed back on every module written so far. **Fix the question, never the threshold.**

### 2. No technical claim from memory
Every module file opens with a `SOURCES` comment listing what was actually fetched or measured while writing it. Format facts come from the format's own specification (PE: learn.microsoft.com; ELF: System V gABI; class files: JVMS for the JDK in use; dex: source.android.com; CIL: ECMA-335). Behavioural facts are **measured on this machine** and the measurement is quoted. Lab answers are read off the built artifact by running it or the named tool — never recalled. If a source does not cover the exact case, the lesson stops and says so rather than guessing. `docs/CONTINUE-HERE.md` lists which sources already passed this test and which failed it.

## Labs (the binary exercises)
- Sources in `labs/src/<lab-id>/` with a `meta.json`; `labs/build.mjs` compiles, verifies, packages and records.
- Six formats work end to end: `PE` (mingw gcc), `ELF` (`zig cc -target x86_64-linux-gnu`), `NET` (dotnet), `JAR` (javac+jar), `APK` (javac to d8 to aapt2 to zipalign to apksigner, **no Gradle**), `PYC` (compileall).
- Every artifact is format-checked before shipping, using magic values from each spec. **DEX version digits vary with `--min-api`** (d8 emits `dex\n035\0` at api 21, not the `039` in the docs) — the check accepts any three-digit version. Do not pin one.
- Node cannot spawn `.bat` directly, so the Android wrappers are bypassed: `java -cp lib/d8.jar com.android.tools.r8.D8` and `java -jar lib/apksigner.jar`. Both entry points were read out of the shipped tools.
- Packaging is **ZipCrypto, not AES** — measured: an AES zip cannot be opened by Info-ZIP `unzip` ("need PK compat. v5.1") nor Python's `zipfile`, while ZipCrypto opens in 7-Zip, `unzip` and `zipfile` alike. The password is published in the lesson; it exists to stop antivirus quarantine, not to protect anything.
- `src/content/lab-manifest.ts` is **generated** — never hand-edit. Sizes and hashes come from the artifact the build actually produced, so content can never quote a stale hash.
- `public/labs/*.zip` **are committed**: the deploy host has no compilers.
- Tool paths in `build.mjs` are overridable by env: `REA_GCC`, `REA_GXX`, `REA_ZIG`, `REA_DOTNET`, `REA_JAVA`, `REA_JAVAC`, `REA_JAR`, `REA_KEYTOOL`, `REA_PYTHON`, `REA_STRIP`, `REA_7Z`, `REA_BUILD_TOOLS`, `REA_ANDROID_PLATFORM`, `ANDROID_SDK_ROOT`.

## Conventions
- TypeScript only, strict mode. No `any`.
- Quiz/exercise/lab `id` fields must be unique site-wide (`m<module>-quiz-<slug>`, `m<module>-set-<slug>`, `m<module>-lab-<slug>`, `m<module>-ex-<slug>`) — they are progress-store keys, and the linter enforces uniqueness.
- Lab answer grading normalises before comparing (`src/lib/labAnswer.ts`): `hex` accepts `0x1F`/`1f`, `number` accepts `31` or `0x1f`, `text` trims and lowercases. Pick the mode that matches how the tool actually prints the value.
- Shuffling lives in ONE place, `src/lib/shuffle.ts` — used for option order inside a question and question order inside a `quiz-set`. Stored quiz answers are ORIGINAL option indices, never display indices.
- State updates in providers: functional form (`setData(prev => ...)`).
- Content prose supports inline markdown: **bold**, `code`, [link](url) only. Link targets are ALLOWLISTED.
- YAGNI: no new dependencies without asking. The lab pipeline deliberately adds zero npm packages — it shells out to system tools.

## Gotchas
- `tsconfig.app.json` has `erasableSyntaxOnly` — no enums, use unions.
- Content strings use double quotes when they contain apostrophes; template literals for multi-line code.
- Each module's last lesson is a `practice-lab` (a `quiz-set`, one or more `lab` blocks, open exercises) — keep that convention.
- The desktop browser pane renders these pages blank in screenshots (a known style-recalc/IntersectionObserver bug). Verify visuals in a real browser; use DOM/JS checks in the pane, which work fine.
- WSL on the build machine is broken (`Wsl/CallMsi/Install/REGDB_E_CLASSNOTREG`) and is deliberately not used — Zig provides ELF cross-compilation instead.
- README claims are verified mechanically before committing (TOC anchors resolve, relative links exist, short description under 120 chars, Licence is the final section). Keep it that way.
