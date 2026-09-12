<!--
  HISTORICAL RECORD — not a live to-do list.

  This is the project plan approved before any code was written, copied verbatim
  from the planning session. Steps 0-4 are COMPLETE: the toolchain is installed,
  the app is scaffolded, the lab pipeline builds all six formats, and Part 1
  (modules 1-3) is written. What remains is Steps 5+, modules 4-14.

  Kept because it records WHY things are the way they are - the gate-by-gate
  reasoning, the alternatives rejected, the sources that failed their validity
  test, and the two risks that were gated up front rather than discovered late.
  A summary would lose exactly the reasoning that stops a future session
  re-deciding a settled question.

  For what is still actionable, read CONTINUE-HERE.md in this folder.
-->

# Reverse Engineering Academy

## Context

`D:\claude-code-academy` is a working interactive-course SPA (Vite + React 19 + TS strict, static, no backend). We want a second course — **reverse engineering, zero to mastery** — reusing that codebase's architecture but with new content and three new capabilities the original lacks:

1. **Practice sections that combine MCQ + exercises**, with option AND question order randomized by code.
2. **MCQ distractors that can't be guessed without reading the question.** In the Claude Code course the correct answer was reliably the longest/most-explained option. That must become mechanically impossible.
3. **Real binary labs**: the learner downloads an actual compiled file, analyzes it with real tools, and types the result into the page to be checked.

Coverage: C, C++, C#/.NET, Java, Android/APK, Python bytecode, on both Windows PE and Linux ELF.

Target directory `D:\Reverse-Engineering` is empty. New standalone repo, not a fork.

---

## Toolchain facts (verified on this machine, this session)

| Tool | Status | Used for |
|---|---|---|
| gcc/g++ 15.2.0, `-dumpmachine` = `x86_64-w64-mingw32` | present | C/C++ → **Windows PE x64** |
| binutils: `objdump`, `readelf`, `strip`, `objcopy`, `nm` | present | build verification |
| .NET SDK 10.0.401 | present | C# → managed PE |
| JDK 21 (Adoptium): `javac`, `jar`, `javap`, `jarsigner`, `keytool` | present | Java `.class` / `.jar`; also required by Android `sdkmanager` |
| Python 3.14 + pip 25.3 | present | `.pyc` labs |
| Node 24.14, npm 11.9, git 2.53, cmake, winget | present | app + build scripts |
| **ELF compiler** | **MISSING** | — |
| **WSL** | **BROKEN** — `wsl --status` → `Wsl/CallMsi/Install/REGDB_E_CLASSNOTREG` | — |
| **Android build-tools** (d8, aapt2, apksigner, zipalign) | **MISSING** | — |
| **7z / zip** | **MISSING** (`unzip` only) | — |

### Installs — **I run these myself, as Step 0, immediately after you approve this plan**

You don't run anything. The only thing needed from you is a UAC click if the 7-Zip installer asks for elevation.

```bash
winget install --id 7zip.7zip -e --accept-package-agreements --accept-source-agreements
```
```bash
winget install --id zig.zig -e --accept-package-agreements --accept-source-agreements
```

Then the Android tools, also by me: download `commandlinetools-win`, verify its SHA-256 against the published value below, extract to `C:\Users\yairg\Android\sdk\cmdline-tools\latest` (user-local — no admin needed), accept licenses, and `sdkmanager` the build-tools + platform. `JAVA_HOME` points at the installed JDK 21, already present.

**WSL is not installed and not repaired.** It is broken at COM-registration level here, repair needs elevation plus a reboot, and the plan does not need it — Zig produces the ELF binaries. If a later module turns out to genuinely need native Linux tooling (e.g. `gdb` on ELF rather than static analysis), I raise it then instead of guessing now.

- **7-Zip 26.03** (winget id `7zip.7zip` — confirmed present via `winget search --exact`). System tool, **no package.json dependency added**. Its encryption flags are read from `7z --help` after install, before the build script uses them.
- **Zig 0.16.0** (winget id `zig.zig` — confirmed present via `winget search --exact`), to produce ELF without WSL, since WSL here is broken at COM-registration level and repairing it needs elevation + reboot.
  **Source status: PARTIAL, and treated as such.** ziglang.org/learn/overview (fetched) states cross-compilation is "a first-class use case", that "Zig is also a C compiler", and shows C cross-compiled to **aarch64**-linux-gnu — but that page tracks ~Zig 0.15 and does not show the **x86_64**-linux-gnu case we need. Different version + different variant = failed validity test. So this is a **Step 0 gate, not an assumption**: after install, run `zig targets` and compile one throwaway C file with `-target x86_64-linux-gnu`, then confirm bytes `0x7f 'E' 'L' 'F'`. Only on a pass does any ELF lab get authored. On a fail I stop and report instead of substituting something similar.
- **Android command-line tools** — manual download, `commandlinetools-win-15859902_latest.zip`, 155.7 MB, SHA-256 `90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a`, from https://developer.android.com/studio (§"Command line tools only"). Then `sdkmanager` installs `build-tools;<ver>` + `platforms;android-<n>` — **exact version strings read from `sdkmanager --list` at execution, not assumed**. winget has only `Google.PlatformTools` (adb/fastboot), which is not enough.

**APK approach — recommended: Gradle-less.** `javac` → `d8` → `aapt2 compile/link` (against `android.jar` from `platforms;android-<n>`) → `zipalign` → `apksigner` with a `keytool` debug key. `sdkmanager` supplies every one of those binaries, so nothing beyond the command-line tools gets installed, and the chain matches how `build.mjs` already drives the other five formats.

Chosen for the *teaching artifact*, not just build convenience: a Gradle/AGP APK is megabytes of androidx, generated `R` classes and multidex, whereas a hand-assembled minimal APK is small enough that Module 10 can open jadx and walk **every entry in the zip** — `AndroidManifest.xml`, `classes.dex`, `resources.arsc`. That is the lesson.

The one narrow difficulty is getting `aapt2 link` arguments right against `android.jar` — a single command to get correct, not an unknown.

**Fallback ladder: Gradle-less → Gradle + AGP → `.dex` + `.jar`.** Gradle costs a large download and a noisy artifact but still yields a genuine APK, so it outranks retreating to `.dex`. The `.dex` + `.jar` lab fires only if both fail, and the APK module then says so explicitly. No fake artifact ships at any rung.

---

## Structure map (Gate 1)

New repo mirrors `D:\claude-code-academy` file-for-file. Same layers, same names, same conventions — content is data, blocks render via a typed registry, progress goes through one localStorage store, tokens drive all color.

```
D:\Reverse-Engineering\
  src\                       ← same tree as claude-code-academy
    types\content.ts         ← + LabBlock, QuizSetBlock
    components\blocks\       ← + Lab.tsx, QuizSet.tsx
    content\modules\01..14   ← all-new content
    services\progress.ts     ← + labAnswers field
  labs\                      ← NEW TOP-LEVEL (map has no place for compiler sources)
    src\<lab-id>\            ← .c/.cpp/.cs/.java/.py + meta.json + solution.md
    build.mjs                ← compile → strip → zip(-p) → write manifest.json
    manifest.json            ← generated; sha256/size per artifact (committed)
  public\labs\*.zip          ← generated artifacts, COMMITTED (Cloudflare Pages has no toolchain)
  scripts\lint-quizzes.mjs   ← NEW: the anti-guessable-MCQ gate
```

`labs/` is the one new top-level folder: the existing map has nowhere for C/C#/Java sources or a compiler driver. Everything else lands where the original puts it.

---

## 1. Anti-guessable MCQs — enforced, not promised

**Authoring rule** (documented in the new `CLAUDE.md`): every option is a mistake a real learner makes, all options in the same register and length band, the correct one never the most detailed.

**Mechanical gate** — `scripts/lint-quizzes.mjs`, wired into `npm run lint` and therefore into `npm run build`. Imports the built content and **fails the build** on:

- correct option is the longest option (character count) — hard fail
- `maxLen / minLen > 1.35` across a question's options
- fewer than 4 options
- correct option has the highest word count
- any option containing `all of the above`, `none of the above`, `never`, `always` — giveaway tells
- duplicate option text within a question
- any option missing an `explanation`
- duplicate quiz/lab/exercise id site-wide

This is the concrete answer to "I knew the answer before reading the question": the failure mode is now a build error.

## 2. Randomization — reuse, don't reinvent (Gate 2)

`shuffledOrder(seedText, length)` already exists at `D:\claude-code-academy\src\components\blocks\Quiz.tsx:13` (djb2 → mulberry32 → Fisher-Yates, deterministic per id, stored answers are ORIGINAL indices). **Reuse it**, extracted to `src/lib/shuffle.ts` so both `Quiz` and the new `QuizSet` call one implementation.

New `quiz-set` block shuffles **question order** with the same function seeded by the set id, and each question's options with the existing per-question seeding. Order is generated by code, stable per learner, never hand-authored.

## 3. New block types

Extend the union in `src/types/content.ts` + add one registry entry each in `BlockRenderer.tsx` — the mapped `Registry` type makes a missed entry a compile error.

```ts
/** Practice section: a sequence of MCQs, question order and option order both code-shuffled. */
interface QuizSetBlock { type: 'quiz-set'; id: string; title?: string; questions: QuizBlock[] }

/** Download a real compiled artifact, analyze it, type the findings back. */
interface LabBlock {
  type: 'lab';
  id: string;                                   // mX-lab-<slug>
  title: string;
  brief: string;
  format: 'PE' | 'ELF' | 'NET' | 'JAR' | 'APK' | 'PYC';
  tools: string[];                              // e.g. ['Ghidra', 'x64dbg']
  download: { file: string; password: string }; // /labs/<file>; rest read from manifest.json
  questions: LabQuestion[];
  walkthrough: string;                          // revealed on solve or give-up
}
interface LabQuestion {
  id: string;
  prompt: string;
  accept: string[];                             // accepted answers
  normalize: 'text' | 'hex' | 'number';         // canonicalizer before compare
  hint?: string;
  explanation: string;
}
```

**Answers ship as plaintext**, matching the existing convention (`QuizOption.correct` and `ExerciseBlock.answer` already ship in the bundle). Hashing was considered and rejected: the `walkthrough` and `explanation` fields ship anyway, so a hash would buy no real secrecy while adding async crypto and a build step — YAGNI. `normalize` handles the real problem, which is `0x1F` vs `1f` vs `31`.

`Lab.tsx` renders: brief → download button (`<a download href="/labs/x.zip">`) + password + SHA-256 + size from `manifest.json` → per-question input with check/✗ feedback → walkthrough reveal. `crypto`-free, network-free, CSP unchanged.

## 4. Progress store

`src/services/progress.ts` — copy, then:

- `APP_ID = 'reverse-engineering-academy'`, `STORAGE_KEY = 'rea-progress-v1'`, `CURRENT_VERSION = 1` (fresh app: the new field exists from day one, no migrator needed — matches the file's documented additive-only rule).
- `ProgressData` gains `labAnswers: Record<string, string>` keyed `${labId}:${questionId}`.
- `validateCurrent` validates it the same way `quizAnswers` is validated: record shape, forbidden-key check, `MAX_ENTRIES` cap, per-value length cap, then filter against known ids.
- `src/content/index.ts` gains `LAB_QUESTION_KEYS`, derived from content exactly like `QUIZ_IDS`; `QUIZ_IDS` also flattens `quiz-set` questions.
- `ProgressContext` gains `labAnswer(key)` / `submitLabAnswer(key, value)`, functional-setState like the existing actions.
- `PARSE_MESSAGES` copy renamed to the new course.

## 5. Lab build pipeline

`labs/build.mjs` (Node, no new npm deps), driven by `npm run labs:build`:

1. Read each `labs/src/<lab-id>/meta.json` (`lang`, `target`, `flags`, `artifact`, `password`).
2. Compile by target:
   - `PE` → `gcc`/`g++` with `-ffile-prefix-map` + `-fno-ident` for reproducibility, `strip` where the lab calls for stripped symbols
   - `ELF` → `zig cc -target x86_64-linux-gnu`
   - `NET` → `dotnet build -c Release`
   - `JAR` → `javac` + `jar`
   - `APK` → `javac` → `d8` → `aapt2` → `zipalign` → `apksigner` (debug key via `keytool`)
   - `PYC` → `python -m compileall`
3. Verify magic bytes — **each value taken from the spec fetched this session, not from memory**:
   - PE → `MZ` at offset 0, `PE\0\0` at the `e_lfanew` offset (learn.microsoft.com PE format, rev. 2026-09-10)
   - ELF → `0x7f 'E' 'L' 'F'` (`EI_MAG0..EI_MAG3`, System V gABI ch.4)
   - Java class → `0xCAFEBABE` (JVMS **SE 21** §4.1 — version-exact to the installed JDK 21)
   - DEX → `{0x64 0x65 0x78 0x0a 0x30 0x33 0x39 0x00}` = `"dex\n039\0"` (source.android.com dex-format). **Correction: an earlier draft of this plan wrongly used `0xCAFEBABE` for DEX; that is the Java class magic.**
   - ZIP → `PK`
   Plus `objdump -f` for PE and `javap -c` for Java. A lab failing verification aborts the build.
4. Package with 7-Zip AES. **Exact flag syntax is read from `7z --help` on the installed 26.03 before first use** — not asserted here (see §Sourcing).
5. Write `labs/manifest.json` — artifact → `{ sha256, bytes, format, builtAt }`. `Lab.tsx` reads it, so hashes never get hand-copied into content.

Artifacts and manifest are **committed**; Cloudflare Pages just serves them.

`public/_headers` gains **one** rule, mirroring the `/assets/*` rule already proven in your own deployment (`D:\claude-code-academy\public\_headers`):
```
/labs/*
  Cache-Control: public, max-age=31536000, immutable
```
**`Content-Disposition` and `Content-Type` are deliberately NOT set here.** Cloudflare's `_headers` documentation (developers.cloudflare.com/pages/configuration/headers/, fetched this session) is *silent* on whether those specific headers are honored — it documents only the 100-rule and 2,000-character limits and shows security/CORS examples. Under Gate 3 a silent source is a failed source, so the download is instead driven by the `download` attribute on the same-origin `<a>` and confirmed empirically in `npm run preview` before any lab ships.

The existing CSP is untouched — no new origins, no `connect-src` change, still nothing transmitted.

## 6. Branding — Clawd in a yellow hard hat

Three files, edited together, all axis-aligned rects only (Clawd's documented rules), fixed colors `#da7756` body / `#0d0d0d` ink / `#f2b705` hat — Clawd is the one documented exception to "never hardcode colors":

- `src/components/ui/Clawd.tsx` — hard hat added to the hero mascot (dome + wide brim + center ridge), phrases swapped to RE lines.
- `src/components/ui/Illustration.tsx` → `BrandMark` — mortarboard + tassel rects replaced by hat rects, same 128 viewBox.
- `public/favicon.svg` — identical geometry, keeps its ivory tile; bump `?v=` in `index.html`.

Also updated: `<title>`, meta description, hero copy, `package.json` name/description/homepage/repo, `README.md`, `LICENSE-CONTENT` attribution, footer. Design tokens in `tokens.css` are reused unchanged.

## 7. Curriculum — 14 modules, 5 parts

| Part | # | Module | Lab artifact |
|---|---|---|---|
| 1 Foundations | 1 | What RE Is — legality, ethics, workflow, safe lab setup, toolbox install | — (setup checks) |
| | 2 | How Source Becomes a Binary — compile/assemble/link, symbols, sections, static vs dynamic | PE + ELF pair, same source |
| | 3 | Hex, Memory & Data — endianness, two's complement, stack/heap, strings, structs | stripped PE |
| 2 Native Code | 4 | x86-64 Assembly You Actually Need — registers, flags, jcc, SysV vs MS x64 calling conventions | ELF |
| | 5 | Static Analysis with Ghidra — decompiler, retyping, xrefs | PE |
| | 6 | Dynamic Analysis — x64dbg / gdb, breakpoints, patching, memory | PE |
| | 7 | PE & ELF File Formats — headers, imports, RVA↔offset, entry point | PE + ELF |
| 3 Managed & Bytecode | 8 | .NET — IL, metadata, dnSpy/ILSpy, assembly patching | .NET PE |
| | 9 | Java — class format, JVM bytecode, `javap`, CFR, jar patching | JAR |
| | 10 | Android/APK — dex, manifest, jadx, smali, repack + resign | APK |
| | 11 | Interpreted — Python `.pyc`, bundled JS/Electron | PYC |
| 4 Defeating Defenses | 12 | Obfuscation, Packing, Anti-Analysis — anti-debug, string encryption, unpacking workflow | PE (anti-debug) |
| | 13 | Patching, Keygenning, Instrumentation — patch vs keygen, hooking, Frida basics | PE + .NET |
| 5 Mastery | 14 | Methodology & Capstone — unknown-binary workflow, note-taking, reporting; multi-stage capstone | multi-format capstone |

### The learner's own toolbox — stated in the course, not assumed

The tools I install above are for *building* the labs. The **learner needs their own set to solve them**, and the course must say so explicitly. Three places, no duplication:

1. **Module 1 gets a dedicated "Your Toolbox" lesson** — one table of every download the whole course needs, grouped by what it's for, with platform and licence, so a beginner sets up once before Module 2. Free/open tools are the spine (Ghidra, x64dbg, dnSpy/ILSpy, jadx, CFR, 7-Zip, JDK, Python); paid tools (IDA Pro, Binary Ninja) are named as alternatives so the learner recognises them, never required.
2. **Each module that introduces a new tool opens with a short setup callout** — what to install, why this module needs it, and the one configuration step that matters.
3. **Each lab states its own tools** — `LabBlock.tools: string[]` already exists in the type above, and `Lab.tsx` renders it as "Tools for this lab" next to the download. No separate mechanism needed (Gate 2: reuse the field, don't add a parallel one).

**Gate 3 applies here too**: every download URL, version number and platform claim in that table is fetched from the vendor's own release page while Module 1 is written — none is asserted in this plan. A tool whose current download I cannot verify does not go in the table.

Every module: 3–4 teaching lessons + a final **Practice Lab** lesson containing one `quiz-set` (6–8 MCQs), one or two `lab` blocks, and open `exercise` blocks — keeping the original's `practice-lab` convention. Ids: `mX-quiz-*`, `mX-set-*`, `mX-lab-*`, `mX-ex-*`.

All binaries are purpose-built teaching artifacts we author. The course teaches analysis on our own files, states the legal boundary in Module 1, and does not target commercial software.

---

## Sourcing (Gate 3) — binding rule for this course

A course that teaches a wrong offset is worse than no course. **No technical claim enters a lesson from memory.** Every module file opens with a `SOURCES` comment block listing the URLs actually fetched while writing it, and any topic the spec is silent on stops that lesson and gets reported rather than filled in.

### Verified this session — cited, exact-case

| Source | URL | Confirms | Case match |
|---|---|---|---|
| PE format | learn.microsoft.com/windows/win32/debug/pe-format | DOS stub, `PE\0\0`, COFF header, optional header, section table, data directories, RVA | Official, updated **2026-09-10** ✓ |
| JVM Spec **SE 21** ch.4 | docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html | `ClassFile` struct, magic `0xCAFEBABE`, constant pool, `Code` attribute | **Exact match to installed JDK 21** ✓ |
| DEX format | source.android.com/docs/core/runtime/dex-format | `header_item`, `DEX_FILE_MAGIC = "dex\n039\0"`, `string_ids`, `class_defs` | Official AOSP ✓ |
| System V gABI ch.4 | sco.com/developers/gabi/latest/ch4.eheader.html | `EI_MAG0..3` = `0x7f 'E' 'L' 'F'`, `e_type`, `e_machine` | Generic ABI ✓ |
| ECMA-335 | ecma-international.org/publications-and-standards/standards/ecma-335/ | Partition II metadata layout, Partition III CIL instruction set | 6th ed., **June 2012** — see caveat |
| Intel SDM | intel.com/.../intel-sdm.html | Vol. 2 = instruction set reference A–Z; Vol. 1 = basic architecture | **version 092**, updated 2026-08-19 ✓ |
| Android cmdline-tools | developer.android.com/studio | `commandlinetools-win-15859902_latest.zip`, 155.7 MB, SHA-256 `90ae805d…fb04a` | Official ✓ |
| Cloudflare `_headers` | developers.cloudflare.com/pages/configuration/headers/ | 100 rules max, 2,000 chars/line | Official ✓ (but see failure below) |
| Installed gcc 15.2.0 | local `gcc --help=common`, and `-fno-ident` test compile → exit 0 | `-ffile-prefix-map`, `-fno-ident` both accepted | **Exact binary in use** ✓ |
| Installed Python 3.14 | local `python -m compileall --help` | `-b`, `--invalidation-mode` | **Exact binary in use** ✓ |
| Installed .NET 10.0.401 | local `dotnet build --help` | `-c, --configuration` | **Exact binary in use** ✓ |
| Your codebase | `D:\claude-code-academy\**` | architecture, conventions, `shuffledOrder`, progress store, `_headers` | Read directly ✓ |

### Failed the validity test — NOT used as written

1. **Cloudflare + `Content-Disposition`/`Content-Type`** — doc is *silent*. → header rule reduced to `Cache-Control`; download behavior proven empirically instead.
2. **Zig `-target x86_64-linux-gnu`** — doc is ~0.15 and shows only aarch64. → Step 0 gate with an ELF-magic check; no ELF lab authored until it passes.
3. **PEP 552 for `.pyc`** — confirms a 4-word header (magic, flags, then timestamp+size *or* hash) but is **Python 3.7** and gives no byte sizes; installed Python is **3.14**. → before Module 11, read the exact-version local source: `importlib/_bootstrap_external.py` in the installed 3.14 tree, plus `importlib.util.MAGIC_NUMBER`.
4. **ECMA-335 is from 2012** while the SDK is .NET 10 — core PE/CLI metadata is stable but the standard may be silent on newer additions. → before Module 8, fetch `dotnet/runtime` `docs/design/specs/Ecma-335-Augments.md` and cite both.
5. **Intel SDM volume numbering for registers/flags** — the page summary was loose about which volume covers general registers vs MSRs. → confirmed by opening the actual volume before Modules 3/4/6, not from the landing page.

### Verified at execution, deliberately not asserted now

`7z` encryption flags (`7z --help`, installed 26.03) · `aapt2`/`d8`/`apksigner`/`zipalign` invocations (each tool's `--help`) · `sdkmanager` package version strings (`sdkmanager --list`) · Ghidra / x64dbg / dnSpy / jadx workflow steps (each tool's own docs, fetched when its module is written).

### The labs are the strongest evidence

For every lab I write the source, compile it, then **actually open the artifact in the tool the lesson names and read the answer off the tool**. Every `accept[]` value is empirical output, never recalled. This costs nothing extra — the binary has to be built and checked anyway.

---

## Build order (per your "skeleton + Part 1 first")

**Step 0 — I install the toolchain + run the source gates.** I run both `winget` commands, download and SHA-256-verify the Android command-line tools, and drive `sdkmanager`. Then I verify each tool is on PATH, run `7z --help` / `zig targets` / `sdkmanager --list` to read the real flag and package names, and run the Zig ELF-magic gate. Any gate that fails stops there and gets reported — no substitution. Your only involvement is a possible UAC prompt.

**Step 1 — app skeleton.** Copy the codebase into `D:\Reverse-Engineering`, `git init`, rebrand (§6), strip all Claude Code content, new `CLAUDE.md` carrying the conventions above plus the MCQ authoring rule.

**Step 2 — new capabilities.** `src/lib/shuffle.ts`, `QuizSet.tsx`, `Lab.tsx`, type union + registry entries, progress-store changes, `scripts/lint-quizzes.mjs`, `_headers` rule.

**Step 3 — lab pipeline.** `labs/build.mjs` + one lab per format (PE, ELF, .NET, JAR, APK, PYC) proving all six chains end-to-end before any content is written around them.

**Step 4 — Modules 1–3 complete**, with real labs, real MCQs passing the linter.

**Checkpoint — you review.** Then Steps 5+: Modules 4–14 in the same shape.

## Verification

- `npx tsc -b` clean; `npm run lint` clean (oxlint **+ quiz linter**).
- `npm run labs:build` from scratch → every artifact passes its magic-byte/format check; `unzip -P <pw>` round-trips each zip.
- I solve every lab myself with the real tool named in that lab and confirm each `accept[]` entry matches what the tool actually shows — no answer ships unverified.
- Every module file carries a `SOURCES` block whose URLs were fetched while writing it; any lesson with an unsourced technical claim does not ship.
- `npm run dev` → walk Modules 1–3 in a real browser (not the desktop browser pane, per the original's noted breakage): download a lab, unzip it, submit a right answer and a wrong one, confirm both persist across reload.
- Export/import progress round-trip including `labAnswers`; confirm a hand-edited junk id is filtered by `parseProgressJson`.
- `npm run build` → `npm run preview`, check `/labs/*.zip` downloads and the favicon updates.

## Open risk, stated

Two, both gated at Step 0 rather than discovered late:

1. **`aapt2 link` in the Gradle-less APK chain** (§Installs) — has the Gradle → `.dex`/`.jar` ladder behind it.
2. **Zig emitting x86_64 ELF** (§Installs) — doc coverage is partial, so it is a pass/fail check on ELF magic bytes before any ELF lab is written.

Every other format runs on toolchains verified present on this machine by direct command output.
