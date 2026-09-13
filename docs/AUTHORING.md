# Authoring reference

How this course's content is made, and what was already established while making it. The
curriculum is complete (14 modules); this is the standing reference for editing a module or
adding one, not a to-do list.

`ORIGINAL-PLAN.md` is the historical record of what was agreed and why.
`AUDIT-2026-09-13.md` records an independent verification of the finished course.

## The authoring recipe


The loop that produced all 14 modules. It is slow on purpose; the quality comes from the order.

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


Fetched while writing the course, with the exact-case verdict recorded at the time.

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
3. **PEP 552 for `.pyc`** — Python 3.7, no byte sizes. → **Discharged for module 11:** the header
   was read from `importlib/_bootstrap_external.py` in the installed 3.14 tree (16 bytes: magic,
   flags, then mtime+size OR an 8-byte hash depending on flag bit 0) and MAGIC_NUMBER measured as
   2b0e0d0a. PEP 552 is not cited for layout.
4. **ECMA-335 is dated 2012** while the SDK is .NET 10. → **Discharged for module 8:** both the
   standard (downloaded ecma335.pdf, read via pdftotext — metadata root 0x424A5342, CLI header,
   the evaluation-stack model) AND `docs/design/specs/Ecma-335-Augments.md` from `dotnet/runtime`
   were fetched and cited. Module 8 stays on the stable core both agree on; anything from the
   augments' feature list (module initializers, default interface methods, ref fields, ...) must
   cite the augments if a later module touches it.
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

## Verification checklist per module


Every module was held to this:

- `npx tsc -b` clean; `npm run lint` clean (oxlint plus the quiz gate).
- `npm run labs:build` — the artifact passes its magic-byte check, and `unzip -P <pw>`
  round-trips the archive.
- Every `accept[]` value confirmed by running the named tool against the built artifact.
- The module's `SOURCES` block lists URLs actually fetched while writing it.
- Walk the module in a **real browser**: download the lab, unzip it, submit one right answer and
  one wrong one, and confirm both survive a reload.
- Progress export/import round-trips, and a hand-edited junk id is filtered by
  `parseProgressJson`.
