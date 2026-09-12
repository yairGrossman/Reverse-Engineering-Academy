# Reverse Engineering Academy

An interactive course on reverse engineering — from your first hex dump to unpacking and
instrumentation. Every module ends with **real compiled binaries you download and take apart
yourself**, then type your findings back into the page to be checked.

No backend, no accounts, no tracking. A static site; your progress lives in your own browser.

> **Status: early.** Part 1 (modules 1–3) is written and playable — 10 lessons, 23 questions
> and 3 binary labs. Modules 4–14 are planned and not yet written. The lab build pipeline is
> complete and proven for all six target formats.

---

## Why another course

Two things about this one are deliberate.

### 1. The multiple-choice answers are not guessable

Most quiz-based courses leak their answers through shape: the correct option is the longest,
the most carefully explained, the only one with a caveat. You can score well without reading
the question.

Here that is **mechanically impossible**. `scripts/lint-quizzes.ts` runs as part of
`npm run lint` — and therefore `npm run build` — and fails the build when:

- the correct option is the single longest, or has the most words
- option lengths within one question vary by more than 1.35×
- there are fewer than four options
- any option contains a giveaway phrase (`all/none/both of the above`, `never`, `always`)
- an option has no explanation, options duplicate, or an id collides anywhere on the site

It is not a style guide anyone has to remember. It is a build error. It rejected 15 questions
during the writing of Part 1 alone, and every one was rewritten rather than the rule relaxed.

Question order **and** option order are shuffled by code, seeded by id — never hand-authored,
and stable across visits so a saved answer always maps back correctly.

### 2. Nothing is written from memory

Every module file opens with a `SOURCES` comment listing what was actually fetched or measured
while writing it. Format facts come from the format's own specification — PE from Microsoft,
ELF from the System V gABI, class files from the JVM Spec matching the JDK in use, dex from
AOSP, CIL from ECMA-335. Behavioural claims are measured on the build machine and the
measurement is quoted in the file. Lab answers are read off the built artifact by running it
or the named tool.

Where a specification does not cover the exact case, the lesson says so instead of guessing.

---

## The labs

The part that makes this more than reading. Each lab ships a genuine compiled artifact, built
from source in this repo, with questions you answer by analysing it:

| Format | Built with | Status |
|---|---|---|
| Windows PE | mingw `gcc` | In lessons |
| Linux ELF | `zig cc -target x86_64-linux-gnu` | In lessons |
| .NET assembly | `dotnet build` | Built, lands in Module 8 |
| Java JAR | `javac` + `jar` | Built, lands in Module 9 |
| Android APK | `javac` → `d8` → `aapt2` → `zipalign` → `apksigner` (no Gradle) | Built, lands in Module 10 |
| Python `.pyc` | `compileall` | Built, lands in Module 11 |

Every artifact is format-checked against its own specification's magic bytes before shipping,
and the page shows the size and SHA-256 of the exact file it serves — read from a generated
manifest, so content can never quote a stale hash.

**Answers are graded but forgiving.** A finding is normalised before comparison, so `0x1F`,
`1f` and `31` all count as the same answer when that is what the tool prints.

### About the download password

Lab archives are password-protected and **the password is printed next to the download
button**. It is not there to keep you out. These are unsigned executables that behave like
licence checks, so antivirus quarantines them and browsers block them; a password stops a
scanner reading inside the archive.

The archives use classic ZipCrypto rather than AES on purpose — measured, an AES zip cannot be
opened by Info-ZIP `unzip` or Python's `zipfile`, while ZipCrypto opens in 7-Zip, `unzip` and
`zipfile` alike.

---

## Curriculum

Fourteen modules across five parts. Modules 1–3 are written; the rest are planned.

| Part | # | Module | |
|---|---|---|---|
| **1 · Foundations** | 1 | What Reverse Engineering Is — the loop, the law, your toolbox | ✅ |
| | 2 | How Source Becomes a Binary — what the compiler keeps and discards | ✅ |
| | 3 | Hex, Memory & Data — bytes, endianness, XOR obfuscation | ✅ |
| **2 · Native Code** | 4 | x86-64 Assembly You Actually Need | ⏳ |
| | 5 | Static Analysis with Ghidra | ⏳ |
| | 6 | Dynamic Analysis with x64dbg and gdb | ⏳ |
| | 7 | PE & ELF File Formats | ⏳ |
| **3 · Managed & Bytecode** | 8 | .NET — IL, metadata, assembly patching | ⏳ |
| | 9 | Java — class format, JVM bytecode | ⏳ |
| | 10 | Android — dex, manifests, repack and resign | ⏳ |
| | 11 | Interpreted — Python bytecode, bundled JS | ⏳ |
| **4 · Defeating Defenses** | 12 | Obfuscation, Packing, Anti-Analysis | ⏳ |
| | 13 | Patching, Keygenning, Instrumentation | ⏳ |
| **5 · Mastery** | 14 | Methodology & Capstone | ⏳ |

The course teaches free, open tools — Ghidra, x64dbg, ILSpy, CFR, jadx. Paid tools are named
so you recognise them; none is required.

---

## Running it

Requires Node 20+ (developed on 24).

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

```bash
npm run build    # typecheck, quiz-quality gate, production build
npm run lint     # oxlint + the quiz-quality gate
```

### Rebuilding the lab binaries

**You do not need this to run the course** — the built artifacts are committed, because the
deploy host has no compilers. You only need it if you change a lab.

```bash
npm run labs:build            # all labs
npm run labs:build <lab-id>   # one lab
```

That requires a toolchain. Versions this was built and verified against:

| Tool | Version | For |
|---|---|---|
| mingw `gcc` | 15.2.0 | PE labs |
| Zig | 0.16.0 | ELF labs |
| .NET SDK | 10.0.401 | .NET labs |
| JDK | 21 | JAR and APK labs |
| Python | 3.14 | `.pyc` labs |
| 7-Zip | 26.03 | Packaging |
| Android build-tools / platform | 37.0.0 / android-36 | APK labs |

Tool locations are overridable by environment variable (`REA_ZIG`, `REA_7Z`,
`ANDROID_SDK_ROOT`, and others — see `labs/build.mjs`).

---

## Project layout

```
src/
  content/modules/     course content as typed data, one file per module
  components/blocks/   one component per block type, via a typed registry
  services/progress.ts the only progress store (localStorage, validated on load and import)
  lib/                 shuffling, lab-answer normalisation
labs/
  src/<lab-id>/        lab sources + meta.json
  build.mjs            compile → verify → package → write manifest
public/labs/           the shipped artifacts (committed)
scripts/               the quiz-quality gate
```

Content is data, never markup: adding a module is a new file in `src/content/modules/` plus
one import. Adding a block type means extending one union and one registry — the compiler
catches a missed entry.

`CLAUDE.md` holds the full architecture notes and authoring rules.

---

## Privacy

There is no backend and no network call of any kind — `grep -rnE "fetch\(|XMLHttpRequest|WebSocket|sendBeacon" src` comes back
empty. Progress is kept in your browser's `localStorage` and never leaves your machine; moving
it between devices is a manual export and import that you trigger.

The Content-Security-Policy in `public/_headers` sets `connect-src 'none'` to make that
property browser-enforced rather than merely promised. It ships **report-only** for the first
deploy so an untested policy cannot break anything, and the file documents exactly what to
check before switching it to enforcing.

---

## Licence

Dual-licensed:

- **Code** — MIT, see [`LICENSE`](LICENSE)
- **Course content and labs** — CC BY-NC 4.0, see [`LICENSE-CONTENT`](LICENSE-CONTENT), with
  attribution to Yair Grossman

## Legal note

Every lab binary in this repository is a purpose-built teaching artifact written for this
course. The course teaches analysis on its own files, states the legal boundary in Module 1,
and does not target commercial software. Reverse engineering law varies by jurisdiction and by
what you do with the result — the course orients you, it is not legal advice.

An independent educational project.
