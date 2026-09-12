# Reverse Engineering Academy

An interactive course on reverse engineering — from your first hex dump to unpacking and
instrumentation. Fourteen modules across native code, .NET, Java, Android and Python.

**Every module ends with a real compiled binary you download and take apart yourself**, then
type your findings back into the page to be checked.

## What makes it different

**The multiple-choice questions are not guessable.** A build-time linter
(`scripts/lint-quizzes.ts`) rejects any question whose correct option is the longest, has the
most words, sits in a wildly uneven length band, or contains a giveaway phrase. You cannot
score well by pattern-matching the shape of the options.

**Nothing is written from memory.** Every module names the specifications and measurements it
was written from, in a `SOURCES` block at the top of its file. Lab answers are read off the
built artifact by running it.

**The labs are real binaries.** Six formats build from source in this repo: Windows PE, Linux
ELF, .NET assemblies, Java jars, Android APKs and Python bytecode.

## Running it

```bash
npm install
npm run dev
```

To rebuild the lab binaries you need a toolchain (mingw gcc, Zig, .NET SDK, JDK, Python,
7-Zip, and the Android command-line tools). The built artifacts are committed, so this is only
needed if you change a lab:

```bash
npm run labs:build
```

## Licence

Code is MIT (`LICENSE`). Everything under `src/content/` and `labs/` is CC BY-NC 4.0
(`LICENSE-CONTENT`), with attribution to Yair Grossman.

An independent educational project. The lab binaries are purpose-built teaching artifacts
written for this course; the course does not target commercial software.
