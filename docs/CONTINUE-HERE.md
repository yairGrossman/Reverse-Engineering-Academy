# Continue here — building modules 4–14

Read this before writing course content. `CLAUDE.md` has the standing rules; this file has the
method, the research already done, and the state. `ORIGINAL-PLAN.md` in this folder is the full
argument behind both.

## Where things stand

Re-derived by running the content, not from memory:

| | |
|---|---|
| Parts defined | 5 |
| Modules written | 7 of 14 |
| Lessons | 26 |
| Quiz questions | 63 |
| Labs wired into lessons | 9 across modules 2–7 |
| Lab artifacts built | 13 |

Modules 1–7 are done. Part 1 and Part 2 are complete. Four more artifacts already build and are waiting for their modules:
`m08-net-keycheck` (.NET), `m09-jar-license` (JAR), `m10-apk-check` (APK), `m11-pyc-token`
(PYC). Read the source and the `meta.json` in `labs/src/<lab-id>/` before writing the module —
the lab's behaviour determines what the lesson can ask.

## The authoring recipe

The loop that produced modules 1–3. It is slow on purpose; the quality comes from the order.

1. **Fetch sources first, write second.** Identify the authoritative document for every factual
   claim the module will make, fetch it, and only then start writing. Do not draft from
   knowledge and verify afterwards — that produces text subtly shaped around what was
   remembered, and the verification pass tends to rubber-stamp it.
2. **Measure anything behavioural.** If the claim is about what a tool prints, what a byte
   order looks like, or what an exit code is, run it on this machine and paste the real output
   into the `SOURCES` comment. Modules 2 and 3 both do this.
3. **Build the lab before writing the lesson.** `npm run labs:build <lab-id>`, then actually
   analyse the artifact with the tool the lab names. Every `accept[]` value is read off the
   tool's output. Never write the answer first and make the binary match it.
4. **Write the lessons.** 2–3 teaching lessons, then a `practice-lab` lesson containing a
   `quiz-set`, the `lab` block(s), and 1–2 open `exercise` blocks. Module 3 is a good template:
   each teaching lesson runs roughly `prose, heading, prose, table, heading, prose, code,
   callout, ..., quiz`.
5. **Run `npm run lint` and expect to lose.** The quiz gate rejected 15 questions across Part 1.
   Rewrite the question; never touch the threshold.
6. **Open the module in a real browser.** The desktop browser pane screenshots blank.
7. **Head the file with `SOURCES`**, listing what was fetched and what was measured, quoting the
   measurements.

## Sources already verified — reuse, do not re-derive

Fetched during planning and Part 1, with the exact-case verdict recorded at the time.

| Source | URL | Confirms | Case match |
|---|---|---|---|
| PE format | `learn.microsoft.com/windows/win32/debug/pe-format` | DOS stub, `PE\0\0`, COFF + optional header, section table, data directories, RVA | Official, updated 2026-09-10 |
| JVM Spec **SE 21** ch.4 | `docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html` | `ClassFile`, magic `0xCAFEBABE`, constant pool, `Code` attribute | **Exact match to installed JDK 21** |
| DEX format | `source.android.com/docs/core/runtime/dex-format` | `header_item`, `DEX_FILE_MAGIC`, `string_ids`, `class_defs` | Official AOSP |
| System V gABI ch.4 | `sco.com/developers/gabi/latest/ch4.eheader.html` | `EI_MAG0..3` = `0x7f 'E' 'L' 'F'`, `e_type`, `e_machine` | Generic ABI |
| System V gABI ch.4 **sheader** | `sco.com/developers/gabi/latest/ch4.sheader.html` | `sh_addr`/`sh_offset`/`sh_size`, SHF_EXECINSTR/ALLOC/WRITE, `.text`/`.rodata`/`.data` | Generic ABI — fetched for module 7 |
| ECMA-335 | `ecma-international.org/publications-and-standards/standards/ecma-335/` | Partition II metadata, Partition III CIL | 6th ed. 2012 — **see failure 4** |
| Intel SDM | `intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html` | Vol. 2 instruction reference, Vol. 1 basic architecture | version 092, 2026-08-19 |
| Cloudflare `_headers` | `developers.cloudflare.com/pages/configuration/headers/` | 100 rules, 2,000 chars per line | Official — **see failure 1** |
| Android cmdline-tools | `developer.android.com/studio` | `commandlinetools-win-15859902_latest.zip`, SHA-256 `90ae805d…fb04a` | Official |
| Ghidra · x64dbg · jadx · ILSpy · CFR | `github.com/NationalSecurityAgency/ghidra` · `x64dbg.com` · `github.com/skylot/jadx` · `github.com/icsharpcode/ILSpy` · `github.com/leibnitz27/cfr` | licences, capabilities, entry points | Cited in module 1 |
| gcc 15.2.0 · Python 3.14 · .NET 10.0.401 | local `--help` output | accepted flags | **Exact binaries in use** |
| Intel SDM **Vol. 1** | `cdrdv2.intel.com/v1/dl/getContent/671436` | Sec. 3.4.1.1 registers, Table 3-2 widths, Sec. 3.4.3.1 flag bits, App. B condition codes | Order 253665-**092US**, June 2026 |
| Intel SDM **Vol. 2A** | `cdrdv2.intel.com/v1/dl/getContent/671199` | CMP p. 3-161, Jcc p. 3-502 (signed vs unsigned wording) | Order 253666-**092US**, June 2026 |
| System V AMD64 psABI | `gitlab.com/x86-psABIs/x86-64-ABI` → `x86-64-ABI/low-level-sys-info.tex` | arg registers RDI/RSI/RDX/RCX/r8/r9, Register Usage figure, 128-byte red zone | master, last commit 2025-03-12 — the wiki PDF link is JS-only, read the `.tex` |
| MS x64 calling convention | `learn.microsoft.com/cpp/build/x64-calling-convention` | RCX/RDX/R8/R9, RAX return, volatile vs nonvolatile, 32-byte shadow store | msvc-170, page updated 2026-05-21 |
| Ghidra, **installed here** | `C:\Users\yairg\tools\ghidra_12.1.3_PUBLIC` | `docs/GettingStarted.md` (Java 21 requirement, JAVA_HOME precedence), `docs/languages/html/pcoderef.html` (p-code definition), `support/analyzeHeadlessREADME.md` | 12.1.3, build 2026-Aug-17 — the release's own docs, so exact-case |
| FNV hash | `isthe.com/chongo/tech/comp/fnv/index.html` | 32-bit offset basis 0x811C9DC5, prime 0x01000193, FNV-1a XORs before multiplying | names the m05 lab's second gate |
| GDB manual | `sourceware.org/gdb/current/onlinedocs/gdb.html/` → `Registers.html`, `Memory.html` | `info registers` scope, `$` register syntax, `x/nfu` formats and unit sizes | current manual; the page does not state a version, so behaviour was measured against local gdb 16.3 |
| x64dbg docs | `help.x64dbg.com/en/latest/commands/` → `breakpoint-control`, `debug-control` | SetBPX/bp, SetHardwareBreakpoint/bph, SetMemoryBPX/bpm, run/go, StepInto/sti, StepOver/sto, StepOut/rtr, StopDebug | command reference only — the intro page returns just a TOC, so NOTHING about the GUI or versions is claimed |

## Sources that FAILED the validity test

Each was rejected during planning. A fresh session cannot regenerate this — it would simply use
the bad source. The remediation is owed by the module named.

1. **Cloudflare and `Content-Disposition` / `Content-Type`** — the documentation is *silent* on
   whether they are honoured. A silent source is a failed source. So `/labs/*` carries only
   `Cache-Control`, and downloading is driven by the `<a download>` attribute, proven in a
   browser.
2. **Zig `-target x86_64-linux-gnu`** — the fetched overview is ~0.15 and demonstrates only
   **aarch64**, a different version and a different target. It was gated behind an ELF-magic
   check before any ELF lab was authored. That gate passed and module 2 ships a real ELF.
   Re-gate if the Zig version changes.
3. **PEP 552 for `.pyc`** — describes a four-word header but is **Python 3.7** and gives no byte
   sizes; the installed interpreter is **3.14**. → **Owed by module 11:** read the exact-version
   local source, `importlib/_bootstrap_external.py` in the installed 3.14 tree, plus
   `importlib.util.MAGIC_NUMBER`. Do not cite PEP 552 for byte layout.
4. **ECMA-335 is dated 2012** while the SDK is .NET 10. Core PE/CLI metadata is stable, but the
   standard may be silent on newer additions. → **Owed by module 8:** also fetch
   `docs/design/specs/Ecma-335-Augments.md` from the `dotnet/runtime` repository, and cite both.
5. **Intel SDM volume numbering** — the landing page was loose about which volume covers general
   registers versus MSRs. → **Discharged for module 4:** Vol. 1 (253665-092US, June 2026) and
   Vol. 2A (253666-092US, June 2026) were downloaded and quoted from directly; both PDFs convert
   cleanly with `pdftotext -layout`, which is how the tables were read. **Discharged for module 6** as well: the
   flags material reuses the Vol. 1 sections module 4 quoted, and every debugger
   fact in module 6 is either GDB-manual text or measured output from gdb 16.3.

## Corrected while writing module 5

**Module 1 told learners to install JDK 25 for Ghidra. That was the wrong case.** The figure came
from the GitHub master README, which tracks building Ghidra from source. The release a learner
downloads — 12.1.3 — states **Java 21** in its own `docs/GettingStarted.md` line 54. Module 1 now
cites the release doc and warns that the README number is for source builds. Recheck whenever the
Ghidra version moves: read `GettingStarted.md` inside the version you unpacked, never the repo
README.

**Now installed on this machine** (both missing when this handoff was first written): Ghidra 12.1.3
at `C:\Users\yairg\tools\ghidra_12.1.3_PUBLIC`, and JDK 25 next to the existing JDK 21. Ghidra runs headless with `JAVA_HOME` pointed
at the **21** tree. The invocation that produced module 5's listings:

```bash
JAVA_HOME=<jdk-21 dir> support/analyzeHeadless.bat <existing-project-dir> NAME   -import <file> -scriptPath <dir> -postScript DumpDecompile.java -deleteProject
```

The project directory must exist first — Ghidra aborts with `Directory not found` rather than
creating it. `DumpDecompile.java` is a GhidraScript that walks every function through
`DecompInterface` and prints the C; it is the reason module 5 quotes real decompiler output. Promote
it into `labs/` tooling if a later module needs the same.

## Still to fetch, when that module is written

| Module | Documents | Notes |
|---|---|---|
| 12 · Obfuscation and packing | UPX docs; vendor docs per technique covered | Teach detection, not evasion. |
| 13 · Patching and instrumentation | Frida documentation | |
| 14 · Capstone | None new | Reuses the above. |

## Labs still to build

Modules 12–14 have no artifacts yet. Follow `labs/src/m03-pe-xorsecret/` as the
template — a `meta.json` plus source. The `meta.json` shape:

```json
{
  "format": "PE",
  "zip": "m03-pe-xorsecret.zip",
  "password": "reverse",
  "sources": ["xorsecret.c"],
  "artifactName": "xorsecret.exe",
  "flags": ["-O1"],
  "strip": true
}
```

Design each lab so its answer cannot be found with the previous module's technique. Module 3's
binary is stripped and XOR-encodes its secret precisely so that `strings` fails and the learner
has to go further.

## Authoring contract (types)

`quiz-set` holds `QuizBlock[]`, each with its own site-unique id. `lab` holds:

```ts
{
  type: 'lab'; id: string; title: string; brief: string;
  format: LabFormat; tools: string[];
  download: { file: string; password: string };   // file matches a key in labs/manifest.json
  questions: {
    id: string; prompt: string;
    accept: string[];                              // every form counted correct
    normalize: 'text' | 'hex' | 'number';
    hint?: string; explanation: string;
  }[];
  walkthrough: string;                             // revealed on solve or give-up
}
```

## Decisions already made — do not re-litigate

Each was argued through and settled. Reopening one wastes a session.

- **Lab answers ship as plaintext, not hashed.** `QuizOption.correct` and `ExerciseBlock.answer`
  already ship in the bundle, and `walkthrough` and `explanation` ship too — a hash buys no real
  secrecy while adding async crypto and a build step. `normalize` solves the actual problem,
  which is `0x1F` versus `1f` versus `31`.
- **One shuffle implementation.** `shuffledOrder` was lifted from the parent project into
  `src/lib/shuffle.ts` and serves both `Quiz` and `QuizSet`. Do not add a second.
- **APK is built without Gradle.** A Gradle/AGP APK is megabytes of androidx, generated `R`
  classes and multidex; the hand-assembled one is small enough that module 10 can walk every
  entry in the zip, which is the lesson. Fallback ladder if it ever breaks: Gradle-less, then
  Gradle+AGP, then `.dex`+`.jar` — and the module says so rather than shipping a fake artifact.
- **`labs/` is the one new top-level folder**, because the inherited structure has nowhere for
  compiler sources. Everything else goes where the parent project puts it.
- **WSL is not used or repaired.** Broken at COM-registration level here; Zig covers ELF.
- **No new npm dependencies.** The lab pipeline shells out to system tools on purpose.

## The learner's toolbox — a design already decided

The installed toolchain builds the labs. The **learner needs their own tools to solve them**,
and the course says so in exactly three places, with no duplication:

1. **Module 1 has a "Your Toolbox" lesson** — one table of every download the course needs, with
   platform and licence. Free tools are the spine; IDA Pro and Binary Ninja are named as
   alternatives a learner should recognise, never required.
2. **Each module that introduces a new tool opens with a setup callout** — what to install, why
   this module needs it, and the one configuration step that matters.
3. **Each lab states its own tools** via the existing `LabBlock.tools` field, rendered next to
   the download. Do not add a parallel mechanism.

Every download URL and version in that table is fetched from the vendor's own release page when
written. A tool whose current download cannot be verified does not go in the table.

## Curriculum, and the lab each module owes

| Part | # | Module | Lab artifact |
|---|---|---|---|
| 1 Foundations | 1 | What RE Is — legality, ethics, workflow, toolbox | none (setup checks) — done |
| | 2 | How Source Becomes a Binary | PE + ELF from one source — done |
| | 3 | Hex, Memory & Data | stripped PE — done |
| 2 Native Code | 4 | x86-64 Assembly You Actually Need | ELF + PE from one source — done |
| | 5 | Static Analysis with Ghidra | stripped PE, two gates — done |
| | 6 | Dynamic Analysis — x64dbg and gdb | PE, gdb-measurable — done |
| | 7 | PE and ELF File Formats | PE + ELF from one source — done |
| 3 Managed & Bytecode | 8 | .NET — IL, metadata, patching | .NET PE (**already built**) |
| | 9 | Java — class format, JVM bytecode | JAR (**already built**) |
| | 10 | Android — dex, manifest, repack and resign | APK (**already built**) |
| | 11 | Interpreted — Python bytecode, bundled JS | PYC (**already built**) |
| 4 Defeating Defenses | 12 | Obfuscation, Packing, Anti-Analysis | PE with anti-debug |
| | 13 | Patching, Keygenning, Instrumentation | PE + .NET |
| 5 Mastery | 14 | Methodology and Capstone | multi-format capstone |

Shape per module: 3–4 teaching lessons, then a `practice-lab` lesson with one `quiz-set` of 6–8
questions, one or two `lab` blocks, and open `exercise` blocks.

## Verification checklist per module

The standard Part 1 was held to:

- `npx tsc -b` clean; `npm run lint` clean (oxlint plus the quiz gate).
- `npm run labs:build` — the artifact passes its magic-byte check, and `unzip -P <pw>`
  round-trips the archive.
- Every `accept[]` value confirmed by running the named tool against the built artifact.
- The module's `SOURCES` block lists URLs actually fetched while writing it.
- Walk the module in a **real browser**: download the lab, unzip it, submit one right answer and
  one wrong one, and confirm both survive a reload.
- Progress export/import round-trips, and a hand-edited junk id is filtered by
  `parseProgressJson`.

## Open items

- **`1995630.png` is in git history at commit `179fbed`** — a third-party reference image swept
  in by `git add -A`, in a repo published under MIT plus CC BY-NC. It is deleted from the working
  tree but still in history, and the repository is now public, so removing it needs a history
  rewrite and a force-push. Unresolved; the owner has been told.
- **No screenshot in the README.** Visuals belong near the top and the project has none. Needs a
  real browser capture — the desktop browser pane cannot write a file.
- **CSP is report-only.** `public/_headers` carries the enforcing policy commented out. Before
  switching it on, verify the progress Export button still works: it builds a `blob:` URL in
  `ProgressTransfer.tsx`. If a browser blocks that, allow `blob:` in the right directive — do
  not loosen `connect-src`.
- **`package.json` `homepage`** points at a Cloudflare Pages URL that may not be deployed yet.

## Token economy for the next session

Part 1 cost roughly 473k tokens, including all the scaffolding and pipeline work, which is done
and will not be repeated. Per-module cost from here is much lower. To keep it that way:

- Read `labs/src/<lab-id>/` and one existing module as a template — not all three.
- Fetch each specification once and quote what is needed into `SOURCES`; do not re-fetch per
  lesson.
- Use `npm run lint` as the feedback loop rather than re-reading content files to self-check.
- Write one module per session where possible, and commit it before starting the next.
