# Reverse Engineering Academy

Learn reverse engineering by taking apart real compiled binaries — PE, ELF, .NET, JAR, APK and Python bytecode.

[![Code licence: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![Content licence: CC BY-NC 4.0](https://img.shields.io/badge/content-CC%20BY--NC%204.0-lightgrey.svg)](LICENSE-CONTENT)
[![Status: complete](https://img.shields.io/badge/course-14%20modules%20%C2%B7%20complete-brightgreen.svg)](#project-status)

A free, interactive course that starts at "what is a hex dump" and works toward unpacking and
instrumentation. It runs entirely in your browser — no backend, no account, no tracking.

Most courses stop at reading. This one hands you **an actual compiled program** at the end of
each module. You download it, open it in real tools, work out what it does, and type your
findings back into the page to be checked.

## Table of Contents

- [Who this is for](#who-this-is-for)
- [What you will learn](#what-you-will-learn)
- [The labs](#the-labs)
- [Install](#install)
- [Usage](#usage)
- [Project status](#project-status)
- [Support](#support)
- [Contributing](#contributing)
- [Privacy](#privacy)
- [Legal note](#legal-note)
- [Licence](#licence)

## Who this is for

Anyone who can program a little and wants to understand what happens after the compiler runs.
No prior reverse engineering knowledge is assumed — module 1 starts with what the discipline
is and which tools to install.

You will need a machine you can install free tools on (Ghidra, x64dbg, jadx and friends) and a
willingness to run unfamiliar executables inside a virtual machine.

## What you will learn

Fourteen modules across five parts — all written.

| Part | # | Module |
|---|---|---|
| **1 · Foundations** | 1 | What Reverse Engineering Is — the loop, the law, your toolbox |
| | 2 | How Source Becomes a Binary — what the compiler keeps and discards |
| | 3 | Hex, Memory & Data — bytes, endianness, XOR obfuscation |
| **2 · Native Code** | 4 | x86-64 Assembly You Actually Need |
| | 5 | Static Analysis with Ghidra |
| | 6 | Dynamic Analysis with x64dbg and gdb |
| | 7 | PE & ELF File Formats |
| **3 · Managed & Bytecode** | 8 | .NET — IL, metadata, assembly patching |
| | 9 | Java — class format, JVM bytecode |
| | 10 | Android — dex, manifests, repack and resign |
| | 11 | Interpreted — Python bytecode, bundled JS |
| **4 · Defeating Defenses** | 12 | Obfuscation, Packing, Anti-Analysis |
| | 13 | Patching, Keygenning, Instrumentation |
| **5 · Mastery** | 14 | Methodology & Capstone |

The course teaches free, open tools — Ghidra, x64dbg, ILSpy, CFR, jadx. Paid tools such as IDA
Pro are named so you recognise them; none is required.

## The labs

Each lab is a genuine compiled artifact, built from source in this repository. A lab gives you
a brief, the tools to use, and questions you can only answer by analysing the file.

For example, module 3 ships a stripped Windows executable whose secret is XOR-encoded, so
`strings` shows nothing useful. You recover the key, then the word, then confirm both by
running the program.

| Format | Built with |
|---|---|
| Windows PE | mingw `gcc` |
| Linux ELF | `zig cc -target x86_64-linux-gnu` |
| .NET assembly | `dotnet build` |
| Java JAR | `javac` + `jar` |
| Android APK | `javac` → `d8` → `aapt2` → `zipalign` → `apksigner` |
| Python `.pyc` | `compileall` |

Answers are checked but forgiving: `0x1F`, `1f` and `31` all count as the same finding when
that is what your tool prints.

**About the download password.** Lab archives are password-protected and the password is
printed next to the download button. It is not there to keep you out — these are unsigned
executables that behave like licence checks, so antivirus quarantines them and browsers block
them. A password stops a scanner reading inside the archive. Open them with 7-Zip, WinRAR, or
any command-line `unzip`.

## Install

Requires [Node](https://nodejs.org/) 20 or newer (developed on 24).

```bash
git clone https://github.com/yairGrossman/Reverse-Engineering-Academy.git
cd Reverse-Engineering-Academy
npm install
```

## Usage

Run the course locally:

```bash
npm run dev
```

Then open <http://localhost:5173>.

Other tasks:

```bash
npm run build    # typecheck, quiz-quality checks, production build
npm run lint     # oxlint plus the quiz-quality checks
npm run preview  # serve the production build
```

### Rebuilding the lab binaries

You do **not** need this to take the course — the built artifacts are committed, because the
deploy host has no compilers. You only need it if you change a lab.

```bash
npm run labs:build            # every lab
npm run labs:build <lab-id>   # a single lab
```

This needs a toolchain. Versions it was built and verified against:

| Tool | Version | Used for |
|---|---|---|
| mingw `gcc` | 15.2.0 | PE labs |
| Zig | 0.16.0 | ELF labs |
| .NET SDK | 10.0.401 | .NET labs |
| JDK | 21 | JAR and APK labs |
| Python | 3.14 | `.pyc` labs |
| 7-Zip | 26.03 | Packaging |
| Android build-tools / platform | 37.0.0 / android-36 | APK labs |

Tool locations are overridable by environment variable (`REA_ZIG`, `REA_7Z`,
`ANDROID_SDK_ROOT` and others) — see [`labs/build.mjs`](labs/build.mjs).

## Project status

**Complete.** All 14 modules across 5 parts are written: **54 lessons, 125 questions and 20
binary labs** covering Windows PE, Linux ELF, .NET, Java, Android and Python bytecode.

Every lab answer was verified by deriving it from the built artifact with the tool the lab
names — see [`docs/AUDIT-2026-09-13.md`](docs/AUDIT-2026-09-13.md) for an independent check of
all 83 lab answers.

## Support

Questions, bug reports and corrections are welcome as
[GitHub issues](https://github.com/yairGrossman/Reverse-Engineering-Academy/issues). If a lab
answer seems wrong, please include the tool and version you used — that is almost always the
useful detail.

## Contributing

Contributions are welcome, particularly new modules and labs.
[`CLAUDE.md`](CLAUDE.md) documents the architecture and the authoring rules in full. The two
that surprise people:

- **Quiz options are linted.** `npm run lint` fails the build if a correct answer is guessable
  from its shape — if it is the longest option, has the most words, or the options vary too
  much in length. Fix the question rather than the threshold.
- **Technical claims need a source.** Every module file opens with a `SOURCES` comment naming
  the specification or measurement behind its facts, and lab answers are read off the built
  artifact rather than recalled.

Course content lives in `src/content/modules/` as typed data, never as markup — adding a
module is a new file plus one import.

## Privacy

No backend and no network request of any kind. Your progress is kept in your browser's
`localStorage` and never leaves your machine; moving it to another device is a manual export
and import that you trigger. The Content-Security-Policy in
[`public/_headers`](public/_headers) sets `connect-src 'none'` so a browser can enforce that
rather than you having to trust it.

## Legal note

Every lab binary here is a purpose-built teaching artifact written for this course. The course
teaches analysis on its own files and does not target commercial software. Reverse engineering
law varies by country, by contract, and by what you do with your results — module 1 orients
you, but it is not legal advice.

## Licence

Dual-licensed:

- **Code** — MIT © Yair Grossman, see [`LICENSE`](LICENSE)
- **Course content and lab sources** — Creative Commons Attribution-NonCommercial 4.0
  International (CC BY-NC 4.0) © Yair Grossman, see [`LICENSE-CONTENT`](LICENSE-CONTENT)

An independent educational project.
