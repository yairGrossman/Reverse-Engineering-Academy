/**
 * SOURCES (verified while writing this module):
 *
 * READ LOCALLY — the shipped Ghidra release, which is the exact-case source for
 * anything about the tool a learner downloads. Installed for this module:
 * ghidra_12.1.3_PUBLIC (Ghidra/application.properties: application.version=
 * 12.1.3, application.release.name=PUBLIC, application.build.date=2026-Aug-17
 * 1710 UTC), from the GitHub release Ghidra_12.1.3_build published 2026-08-18,
 * asset ghidra_12.1.3_PUBLIC_20260817.zip, 569,445,154 bytes.
 * - docs/GettingStarted.md line 54, requirements: "Java 21 64-bit Runtime and
 *   Development Kit (JDK)", plus "Python3 (3.9 to 3.14)". NOTE: the master
 *   README on GitHub says JDK 25; that tracks building from source, not this
 *   release, so the release doc is what this course cites. Module 1 carried the
 *   README figure and has been corrected.
 * - docs/GettingStarted.md "Java Notes": Ghidra requires a supported JDK "on the
 *   PATH, or specified by the JAVA_HOME environment variable. If JAVA_HOME is
 *   specified it will take precedence over the PATH."
 * - docs/languages/html/pcoderef.html: "P-code is a register transfer language
 *   designed for reverse engineering applications. ... p-code works by
 *   translating individual processor instructions into a sequence of p-code
 *   operations that take parts of the processor state as input and output
 *   variables ( varnodes )."
 * - support/analyzeHeadlessREADME.md — the headless usage forms quoted below.
 *
 * FETCHED — the hash the lab uses, so the lesson can name it:
 * - http://www.isthe.com/chongo/tech/comp/fnv/index.html: 32-bit FNV offset
 *   basis 2166136261 (0x811C9DC5) and FNV prime 16777619 (0x01000193); FNV-1a
 *   XORs the byte first and multiplies second, which is the order the decompiled
 *   loop below shows.
 *
 * MEASURED on the course build machine (every lab answer comes from here):
 * - labs/src/m05-pe-licence/licence.c, built by labs/build.mjs with mingw gcc
 *   15.2.0 at -O1 and STRIPPED. `nm licence.exe` reports "no symbols".
 * - `strings licence.exe` shows only the five messages: "usage: licence <key>",
 *   "rejected: wrong length", "rejected: bad key", "rejected: checksum
 *   mismatch", "licence accepted". The key itself is in neither the strings nor
 *   any data section.
 * - Running it: `licence.exe ghidra12` prints "licence accepted", exit 0;
 *   `licence.exe ghidra13` and `licence.exe 12345678` print "rejected: bad key",
 *   exit 2; `licence.exe short` prints "rejected: wrong length", exit 3;
 *   no argument prints the usage line, exit 1.
 * - Headless analysis actually run, with JAVA_HOME set to the installed JDK 21:
 *     support/analyzeHeadless.bat <projectdir> M05 -import licence.exe \
 *       -scriptPath <dir> -postScript DumpDecompile.java -deleteProject
 *   Log: "IMPORTING: ... licence.exe?MD5=ca342d58acd2aa5940f875e46e4b4039",
 *   "ANALYZING all memory and code", one non-fatal "ERROR MinGW
 *   pseudo-relocation list not found (MingwRelocationAnalyzer)", then "REPORT:
 *   Analysis succeeded for file: ... licence.exe".
 * - Ghidra's decompiler output, quoted verbatim in the lessons below, named the
 *   three functions FUN_140001460 (the per-character gate), FUN_1400014ad (the
 *   hash) and FUN_1400014d7 (main), and the table &DAT_140004070.
 * - The table bytes, read out of the file by resolving the address by hand:
 *   image base 0x140000000, .rdata VA 0x140004000 at file offset 0x2000, so
 *   DAT_140004070 is file offset 0x2070, holding F2 EB E0 E1 C4 DD 74 69.
 */
import type { Module } from '../../types/content';

export const ghidraModule: Module = {
  id: 'ghidra-static-analysis',
  number: 5,
  title: 'Static Analysis with Ghidra',
  tagline: 'A decompiler turns an afternoon of disassembly into a minute of reading — once you know what its output is and is not.',
  part: 2,
  lessons: [
    {
      id: 'what-a-decompiler-does',
      title: 'What a Decompiler Actually Does',
      blocks: [
        {
          type: 'callout',
          variant: 'info',
          title: 'Setup for this module',
          text: "Install **Ghidra**, and install the JDK **its own release notes ask for** — for the release used to write this module, `docs/GettingStarted.md` requires Java 21, 64-bit, the JDK rather than just a runtime. Ghidra finds Java on your `PATH` or via `JAVA_HOME`, and `JAVA_HOME` wins when both are set. Unpack it to a path with no spaces in it.",
        },
        {
          type: 'prose',
          text: "Module 4 taught you to read instructions. That skill does not stop being necessary, but doing it by hand across a few thousand instructions is slow and error-prone. A decompiler does the mechanical part: it reads machine code and prints something that looks like C. Ghidra is the one this course uses, because it is free, open source, and its decompiler is genuinely good.",
        },
        {
          type: 'heading',
          text: 'Three stages, not one',
        },
        {
          type: 'prose',
          text: "Ghidra does not translate x86 straight into C. Its own documentation describes the middle step: **p-code**, which it calls a register transfer language designed for reverse engineering, general enough to model many different processors. Instructions are translated into sequences of p-code operations over values called varnodes, and the decompiler then works on that.",
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Disassemble** — bytes become instructions, the same view `objdump` gives you.',
            '**Lift to p-code** — each instruction becomes one or more processor-independent operations.',
            '**Decompile** — p-code is simplified, control flow is recovered, and the result is printed as C-like code.',
          ],
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Why the middle step matters to you',
          text: "Because analysis is written against p-code rather than x86, the same decompiler handles ARM, MIPS, PowerPC and more. It also explains the flavour of the output: what you read is a reconstruction of behaviour, expressed in C syntax, not a recovery of anyone's source file.",
        },
        {
          type: 'heading',
          text: 'What the output is not',
        },
        {
          type: 'prose',
          text: "This is the point where beginners get burned. Decompiler output is **not** the original source. Names, comments, macros, most types and all formatting were destroyed by compilation, as module 2 showed. What comes back is a faithful-behaviour rewrite with placeholders where information is missing.",
        },
        {
          type: 'table',
          headers: ['What you see', 'What it means', 'What it does not mean'],
          rows: [
            ['`FUN_140001460`', 'A function Ghidra found, named after its address', 'That the function had no name in the source'],
            ['`DAT_140004070`', 'A data location with no known symbol', 'That the data is untyped or unimportant'],
            ['`uVar1`, `lVar2`', 'Invented local names, typed by size and use', 'That the original had variables in that shape'],
            ['`undefined8`', 'Eight bytes whose type the decompiler will not guess', 'That the value is meaningless'],
            ['`* 2` where you expected a shift', 'The same operation, printed differently', 'That the compiler emitted a multiply'],
          ],
        },
        {
          type: 'prose',
          text: "The stripped lab binary in this module is a good example. It was compiled from a file whose functions are called `stage_transform`, `stage_hash` and `main`. Ghidra sees none of those names, because `strip` removed them, so it prints `FUN_140001460`, `FUN_1400014ad` and `FUN_1400014d7`. The logic survives perfectly; the labels do not.",
        },
        {
          type: 'quiz',
          id: 'm5-quiz-pcode',
          question: 'Why does Ghidra translate instructions into p-code before decompiling?',
          options: [
            {
              text: 'So one decompiler can serve many processors',
              correct: true,
              explanation: "P-code is processor-independent, so the analysis and decompilation are written once and retargeted by describing a new instruction set.",
            },
            {
              text: 'So the original source code can be recovered',
              correct: false,
              explanation: "No intermediate form brings back names or comments; those were destroyed before the binary existed.",
            },
            {
              text: 'So the binary can be executed inside Ghidra',
              correct: false,
              explanation: "P-code models behaviour for analysis. Running the target is dynamic analysis, which is the next module's subject.",
            },
            {
              text: 'So the compiler that produced the file can be identified',
              correct: false,
              explanation: "Toolchain fingerprints come from layout, strings and runtime stubs, not from the intermediate representation.",
            },
          ],
        },
      ],
    },
    {
      id: 'driving-ghidra',
      title: 'Driving Ghidra',
      blocks: [
        {
          type: 'prose',
          text: "Ghidra is organised around a **project** that holds imported programs. You make a project once, import a binary, let the automatic analysis run, and then read. The steps below are the whole loop; everything else is refinement.",
        },
        {
          type: 'list',
          ordered: true,
          items: [
            'Create or open a project, then import the file. Ghidra identifies the format and the processor for you.',
            'Accept the analysis prompt. Automatic analysis finds functions, strings, cross-references and more.',
            'Read the analysis log. Warnings are normal and are not failures — see the callout below.',
            'Find a foothold: a string, an imported API, or an exported function name.',
            'Follow references from that foothold to the code that uses it.',
            'Rename and retype as you understand things, so your knowledge accumulates in the tool.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Warnings in the log are not failures',
          text: "Analysing this module's binary produced one error line — `MinGW pseudo-relocation list not found` — and then reported that analysis succeeded. An analyser that does not apply is normal. Read the final verdict, not the loudest line.",
        },
        {
          type: 'heading',
          text: 'The four windows that do the work',
        },
        {
          type: 'table',
          headers: ['Window', 'What it shows', 'When you reach for it'],
          rows: [
            ['Listing', 'Disassembly, addresses, comments, cross-references', 'When the decompiler output looks wrong or too smooth'],
            ['Decompile', 'The C-like reconstruction of the current function', 'Almost always — start here, confirm in the Listing'],
            ['Symbol Tree', 'Functions, labels, imports and exports', 'To find entry points and imported APIs'],
            ['Defined Strings', 'Every string the analysis recognised', 'As the fastest foothold into unfamiliar code'],
          ],
        },
        {
          type: 'heading',
          text: 'Start from a string, arrive at the logic',
        },
        {
          type: 'prose',
          text: "The most reliable way into an unknown binary is a string you already know the program prints. Find it in Defined Strings, look at its references, and you land in the function that uses it. In the lab binary, `licence accepted` is referenced from exactly one place — the function Ghidra calls `FUN_1400014d7`, which is `main`. From there the two functions it calls are the two gates you have to defeat.",
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Rename as you go, or lose the thread',
          text: "The moment you work out that `FUN_140001460` checks characters against a table, rename it. Ghidra propagates the new name everywhere it is called, so the next function you read becomes easier. Analysis you keep only in your head has to be redone after every break.",
        },
        {
          type: 'heading',
          text: 'Headless Ghidra, for when clicking will not do',
        },
        {
          type: 'prose',
          text: "Ghidra ships a command-line driver, `analyzeHeadless`, which imports and analyses without the GUI and can run a script afterwards. It is how this module's decompiler listings were produced, so that the lesson quotes real output rather than a description of it. The shape of the command, straight from the shipped README:",
        },
        {
          type: 'code',
          language: 'bash',
          title: 'analyzeHeadless, import and analyse one file',
          code: `analyzeHeadless <projectDirectory> <projectName> -import <file>`,
        },
        {
          type: 'code',
          language: 'bash',
          title: 'The variant used to produce this module (a post-script dumps the decompilation)',
          code: `analyzeHeadless <projectDirectory> M05 \\
  -import licence.exe \\
  -scriptPath <scriptDir> \\
  -postScript DumpDecompile.java \\
  -deleteProject`,
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Two things that bit during this module',
          text: "The project directory must already exist — Ghidra aborts with `Directory not found` rather than creating it. And `JAVA_HOME` takes precedence over your `PATH`, which is convenient when you keep several JDKs, and confusing when you forget you set it.",
        },
        {
          type: 'quiz',
          id: 'm5-quiz-workflow',
          question: 'You open an unfamiliar stripped binary in Ghidra. Which foothold gets you into the interesting code fastest?',
          options: [
            {
              text: 'A string the program is known to print',
              correct: true,
              explanation: "Defined Strings plus references takes you straight to the function that uses it, without reading anything else first.",
            },
            {
              text: 'The first function listed in the Symbol Tree',
              correct: false,
              explanation: "In a stripped binary that is usually runtime startup code, which tells you nothing about the program's own logic.",
            },
            {
              text: 'The function at the lowest address in the file',
              correct: false,
              explanation: "Address order is a layout artefact. Nothing says the earliest function matters, and it often belongs to the CRT.",
            },
            {
              text: 'Whichever function has the most instructions',
              correct: false,
              explanation: "Size correlates with library code and loop unrolling at least as often as with the logic you actually want.",
            },
          ],
        },
      ],
    },
    {
      id: 'reading-decompiler-output',
      title: 'Reading What It Gives You',
      blocks: [
        {
          type: 'prose',
          text: "Here is the real decompilation of the first gate in this module's lab, exactly as Ghidra printed it. Six lines of logic, and every one of them needs translating from decompiler-ese back into intent.",
        },
        {
          type: 'code',
          language: 'c',
          title: 'FUN_140001460, verbatim from the Decompile window',
          code: `undefined8 FUN_140001460(longlong param_1)

{
  longlong lVar1;
  byte bVar2;

  bVar2 = 0;
  lVar1 = 0;
  do {
    if ((&DAT_140004070)[lVar1] != (byte)(*(char *)(param_1 + lVar1) * '\\x02' ^ bVar2 ^ 0x3c)) {
      return 0;
    }
    lVar1 = lVar1 + 1;
    bVar2 = bVar2 + 7;
  } while (lVar1 != 8);
  return 1;
}`,
        },
        {
          type: 'table',
          headers: ['What Ghidra wrote', 'What it means'],
          rows: [
            ['`param_1`, a `longlong`', 'A pointer to the candidate string; the type is a guess about width, not about meaning'],
            ['`(&DAT_140004070)[lVar1]`', 'Index `lVar1` into a table in read-only data — so a table exists and you can read it'],
            ["`* '\\x02'`", 'Multiply by two, which is how the decompiler rendered a shift left by one'],
            ['`bVar2 = bVar2 + 7`', 'A counter stepping by 7 each pass, so the loop body mixes in `index * 7`'],
            ['`while (lVar1 != 8)`', 'Exactly eight iterations, so the key is eight bytes long'],
            ['`return 0` / `return 1`', 'Fail fast on the first mismatch, succeed only after all eight'],
          ],
        },
        {
          type: 'prose',
          text: "Put together: for each index `i`, the function computes `(key[i] << 1) XOR (i * 7) XOR 0x3C` and compares it against the table byte. Every step is invertible, so eight table bytes determine eight key bytes exactly — no guessing and no brute force.",
        },
        {
          type: 'heading',
          text: 'The second gate names itself',
        },
        {
          type: 'code',
          language: 'c',
          title: 'FUN_1400014ad, verbatim',
          code: `uint FUN_1400014ad(byte *param_1)

{
  uint uVar1;
  byte *pbVar2;

  pbVar2 = param_1 + 8;
  uVar1 = 0x811c9dc5;
  do {
    uVar1 = (uVar1 ^ *param_1) * 0x1000193;
    param_1 = param_1 + 1;
  } while (param_1 != pbVar2);
  return uVar1;
}`,
        },
        {
          type: 'prose',
          text: "Two constants identify this immediately. `0x811C9DC5` is 2166136261 and `0x01000193` is 16777619 — the published 32-bit **FNV** offset basis and prime. The loop XORs the byte and then multiplies, which is the FNV-1a variant rather than FNV-1. You did not have to recognise the algorithm by eye: two unusual constants pasted into a search engine name it.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Constants are identifiers',
          text: "Cryptographic and hashing code is full of fixed magic numbers, and they survive compilation untouched because they are the algorithm. `0x811C9DC5`, `0x67452301`, `0x6A09E667` and friends are more reliable identification than any control-flow pattern. When a function looks like a hash, read its constants first.",
        },
        {
          type: 'heading',
          text: 'And main ties it together',
        },
        {
          type: 'code',
          language: 'c',
          title: 'FUN_1400014d7 — main, trimmed to the decision structure',
          code: `if (param_1 == 2) {
  _Str = *(byte **)(param_2 + 8);
  sVar3 = strlen((char *)_Str);
  if (sVar3 == 8) {
    uVar4 = FUN_140001460((longlong)_Str);
    if ((int)uVar4 == 0) {
      puts("rejected: bad key");
      uVar2 = 2;
    }
    else {
      uVar1 = FUN_1400014ad(_Str);
      if (uVar1 == 0x9e97fe09) {
        puts("licence accepted");
        uVar2 = 0;
      }
      else {
        puts("rejected: checksum mismatch");
        uVar2 = 4;
      }
    }
  }
  else {
    puts("rejected: wrong length");
    uVar2 = 3;
  }
}`,
        },
        {
          type: 'prose',
          text: "Notice how much this one listing gives you: the argument count check, the length requirement, the order of the two gates, the expected hash, and a distinct exit code for each outcome. In module 4 you would have reconstructed this from forty lines of disassembly. That difference is why the decompiler is the tool of first resort — and why you still confirm anything surprising in the Listing view, because the decompiler is an interpretation.",
        },
        {
          type: 'quiz',
          id: 'm5-quiz-reading',
          question: "Ghidra shows `*(char *)(param_1 + lVar1) * '\\x02'`. What did the compiler almost certainly emit?",
          options: [
            {
              text: 'A shift of the byte left by one place',
              correct: true,
              explanation: "Multiplying by two is a left shift; the decompiler chose arithmetic notation for the same operation.",
            },
            {
              text: 'A multiply instruction with a constant',
              correct: false,
              explanation: "Possible in principle, but compilers reach for shifts and `lea` for small powers of two, as module 4 measured.",
            },
            {
              text: 'A lookup of the character in a table',
              correct: false,
              explanation: "The table access is the other side of the comparison, indexing `DAT_140004070`, not this expression.",
            },
            {
              text: 'A conversion of the byte to a wider type',
              correct: false,
              explanation: "The `(char *)` cast affects how the byte is read, but the `* 2` is arithmetic on the value rather than a widening.",
            },
          ],
        },
      ],
    },
    {
      id: 'practice-lab',
      title: 'Practice Lab',
      blocks: [
        {
          type: 'prose',
          text: "One binary, stripped, with two gates in front of it. The key is not a string and it is not encoded data — it is defined by a loop, so you have to read the loop. Reading it by hand in a disassembler is possible and slow; that contrast is the point of the module.",
        },
        {
          type: 'quiz-set',
          id: 'm5-set-ghidra',
          title: 'Static analysis check',
          questions: [
            {
              type: 'quiz',
              id: 'm5-set-q-fun',
              question: 'Ghidra names a function `FUN_140001460`. What does that tell you?',
              options: [
                {
                  text: 'Its name was removed before you got it',
                  correct: true,
                  explanation: "Ghidra falls back to FUN_ plus the address whenever no symbol survives for that function.",
                },
                {
                  text: 'The function was generated by the compiler',
                  correct: false,
                  explanation: "Compiler-generated helpers often do keep names; the placeholder says nothing about who wrote the code.",
                },
                {
                  text: 'Ghidra could not fully analyse the function',
                  correct: false,
                  explanation: "Analysis quality and naming are separate. A FUN_ function can decompile perfectly, as this lab's do.",
                },
                {
                  text: 'The function has no callers in this binary',
                  correct: false,
                  explanation: "Call references are listed separately; a placeholder name carries no information about callers.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm5-set-q-notsource',
              question: 'Why is decompiler output not the original source code?',
              options: [
                {
                  text: 'Compilation destroyed names, types and comments',
                  correct: true,
                  explanation: "The decompiler reconstructs behaviour and invents placeholders for everything the build threw away.",
                },
                {
                  text: 'Ghidra deliberately obscures what it recovers',
                  correct: false,
                  explanation: "Nothing is hidden from you; the information simply is not present in the binary any more.",
                },
                {
                  text: 'The C standard forbids reproducing source code',
                  correct: false,
                  explanation: "This is a technical limit rather than a legal one. Module 1 covers the legal boundary separately.",
                },
                {
                  text: 'Optimised builds are decompiled but unoptimised ones are not',
                  correct: false,
                  explanation: "Both decompile. Optimisation changes how far the output drifts from any plausible original.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm5-set-q-constants',
              question: 'A function mixes bytes using `0x811C9DC5` and `0x01000193`. Best next move?',
              options: [
                {
                  text: 'Search for those constants to name the algorithm',
                  correct: true,
                  explanation: "Published algorithms carry fixed constants through compilation, so the constants identify them directly.",
                },
                {
                  text: 'Rename the function to `encrypt` and move on',
                  correct: false,
                  explanation: "A hash is not encryption, and guessing at a label buries the mistake in your own notes.",
                },
                {
                  text: 'Step through the loop in a debugger to learn the maths',
                  correct: false,
                  explanation: "Useful later, but slower than identifying a published algorithm you can then read about.",
                },
                {
                  text: 'Assume the constants are compiler padding and skip them',
                  correct: false,
                  explanation: "Padding is zeros or alignment filler, not distinctive odd values used inside arithmetic.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm5-set-q-listing',
              question: 'The decompiler output for one function looks impossible. What do you do?',
              options: [
                {
                  text: 'Check the same address in the Listing view',
                  correct: true,
                  explanation: "The decompilation is an interpretation; the disassembly is the ground truth you can fall back on.",
                },
                {
                  text: 'Reimport the binary into a clean new project',
                  correct: false,
                  explanation: "Analysis is deterministic, so a fresh import of the same bytes reproduces the same output.",
                },
                {
                  text: 'Trust the output and write the conclusion down',
                  correct: false,
                  explanation: "Recording something you already doubt is how a wrong conclusion ends up in a final report.",
                },
                {
                  text: 'Switch to a different decompiler before reading further',
                  correct: false,
                  explanation: "Second opinions help eventually, but the cheapest check is the disassembly already in front of you.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm5-set-q-headless',
              question: 'What is `analyzeHeadless` for?',
              options: [
                {
                  text: 'Importing and analysing without the GUI',
                  correct: true,
                  explanation: "It drives the same analysis from a command line and can run a script afterwards, which makes results scriptable.",
                },
                {
                  text: 'Analysing binaries whose headers are missing',
                  correct: false,
                  explanation: "The name refers to running without a display, not to files with damaged or absent headers.",
                },
                {
                  text: 'Decompiling faster by skipping the analysis passes',
                  correct: false,
                  explanation: "The same analysers run. `-noanalysis` is a separate flag, and skipping them gives worse output.",
                },
                {
                  text: 'Running Ghidra on a machine with no JDK installed',
                  correct: false,
                  explanation: "It is the same Java application, so it needs the JDK the release asks for just as the GUI does.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm5-set-q-warning',
              question: 'The analysis log contains an ERROR line but ends with analysis succeeded. What now?',
              options: [
                {
                  text: 'Carry on — an analyser that did not apply is normal',
                  correct: true,
                  explanation: "Analysers run speculatively. The measured run of this lab logged a MinGW relocation error and still succeeded.",
                },
                {
                  text: 'Start over with automatic analysis turned off',
                  correct: false,
                  explanation: "That discards functions, strings and references — the things making the decompilation readable.",
                },
                {
                  text: 'Treat every listed function as untrustworthy now',
                  correct: false,
                  explanation: "One inapplicable analyser does not invalidate the rest of a run that reported success.",
                },
                {
                  text: 'Assume the file is packed and go looking for an unpacker',
                  correct: false,
                  explanation: "Packing has its own signs, covered in module 12; one analyser message is not among them.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm5-set-q-invert',
              question: 'A check computes `(key[i] << 1) ^ (i * 7) ^ 0x3C` and compares it to a table. Why is that weak?',
              options: [
                {
                  text: 'Every step can be run backwards exactly',
                  correct: true,
                  explanation: "XOR is its own inverse and the shift is recoverable for ASCII input, so the table determines the key.",
                },
                {
                  text: 'The table is stored in read-only data',
                  correct: false,
                  explanation: "Where the table lives affects how you find it, not whether the transform can be inverted.",
                },
                {
                  text: 'Eight bytes is too short to be secure',
                  correct: false,
                  explanation: "Length would matter against brute force; here no search is needed at all, which is a stronger weakness.",
                },
                {
                  text: 'A hash check is layered behind this one',
                  correct: false,
                  explanation: "The second gate is extra work for an attacker, not the reason the first one falls apart.",
                },
              ],
            },
          ],
        },
        {
          type: 'lab',
          id: 'm5-lab-licence',
          title: 'Defeat a two-stage licence check',
          brief:
            "`licence.exe` accepts exactly one key and is **stripped**, so every function arrives as `FUN_<address>`. `strings` gives you the five messages and nothing else — the key is not stored anywhere. Import it into Ghidra, start from the string `licence accepted`, and read the two functions `main` calls.",
          format: 'PE',
          tools: ['Ghidra', 'a terminal', '7-Zip'],
          download: { file: 'm05-pe-licence.zip', password: 'reverse' },
          questions: [
            {
              id: 'length',
              prompt: 'How many characters must the key have?',
              accept: ['8'],
              normalize: 'number',
              hint: 'Two places tell you: the `strlen` comparison in `main`, and the loop bound in the first gate.',
              explanation:
                "Eight. `main` rejects anything else with `rejected: wrong length`, and both gate functions walk exactly eight bytes.",
            },
            {
              id: 'firstbyte',
              prompt: 'What is the first byte of the comparison table, in hex?',
              accept: ['0xf2', 'f2'],
              normalize: 'hex',
              hint: 'The gate indexes `&DAT_140004070`. Double-click that symbol in Ghidra to jump to the bytes, or work out the file offset from the section headers.',
              explanation:
                "0xF2. The full table is F2 EB E0 E1 C4 DD 74 69, sitting in `.rdata` at file offset 0x2070 — the address resolves through image base 0x140000000 and the `.rdata` header.",
            },
            {
              id: 'prime',
              prompt: 'Which multiplier does the second gate use in its hash loop?',
              accept: ['0x1000193', '1000193', '16777619'],
              normalize: 'hex',
              hint: 'One constant is the starting value, the other is applied every pass. You want the one inside the loop.',
              explanation:
                "0x01000193, which is 16777619 — the published 32-bit FNV prime. Together with the 0x811C9DC5 starting value it identifies the loop as FNV-1a, because the byte is XORed before the multiply.",
            },
            {
              id: 'key',
              prompt: 'Which key does the program accept?',
              accept: ['ghidra12'],
              normalize: 'text',
              hint: 'For each index i, the gate needs `(key[i] << 1) ^ (i * 7) ^ 0x3C` to equal the table byte. Invert it: XOR the table byte with `i * 7` and 0x3C, then shift right by one.',
              explanation:
                "`ghidra12`. Running it confirms the read: `licence.exe ghidra12` prints `licence accepted` and exits 0, while `ghidra13` gives `rejected: bad key` and exit 2.",
            },
            {
              id: 'lenexit',
              prompt: 'Which exit code does a key of the wrong length produce?',
              accept: ['3'],
              normalize: 'number',
              hint: 'Each rejection path in `main` returns its own value. Read them off the decompilation, then confirm with `./licence.exe short; echo $?`.',
              explanation:
                "3. The four outcomes are 0 accepted, 1 no argument, 2 bad key, 3 wrong length — and 4 for a checksum mismatch, which the first gate makes unreachable.",
            },
          ],
          walkthrough:
            "1. Unzip with the password above. Confirm what you are dealing with:\n     nm licence.exe          -> no symbols   (it is stripped)\n     strings licence.exe     -> five messages, no key\n\n2. In Ghidra: new project, import licence.exe, accept the analysis prompt.\n   The log ends with \"Analysis succeeded\"; an earlier MinGW relocation error is\n   normal and harmless.\n\n3. Window > Defined Strings, find \"licence accepted\", and follow its reference.\n   You land in main (Ghidra calls it FUN_1400014d7 in the build measured here).\n   Read its structure: argument count, then strlen == 8, then two calls.\n\n4. First gate, decompiled:\n     if ((&DAT_140004070)[i] != (byte)(key[i] * 2 ^ counter ^ 0x3c)) return 0;\n   with counter stepping by 7 per iteration. So the requirement is\n     (key[i] << 1) ^ (i * 7) ^ 0x3C == table[i]\n\n5. Read the table. Double-click DAT_140004070:\n     F2 EB E0 E1 C4 DD 74 69\n\n6. Invert it. In python:\n     >>> tbl = [0xF2,0xEB,0xE0,0xE1,0xC4,0xDD,0x74,0x69]\n     >>> ''.join(chr(((b ^ (i*7) ^ 0x3C) & 0xFF) >> 1) for i, b in enumerate(tbl))\n     'ghidra12'\n\n7. The second gate is FNV-1a over the same eight bytes, compared against\n   0x9E97FE09. Check rather than assume:\n     >>> h = 0x811C9DC5\n     >>> for c in b'ghidra12': h = ((h ^ c) * 0x01000193) & 0xFFFFFFFF\n     >>> hex(h)\n     '0x9e97fe09'\n\n8. Run it:\n     ./licence.exe ghidra12   -> licence accepted   (exit 0)\n     ./licence.exe ghidra13   -> rejected: bad key  (exit 2)\n     ./licence.exe short      -> rejected: wrong length (exit 3)\n\nWorth noticing: the second gate never rejected anything. Because the first gate\npins every byte, any key reaching the hash already is the key. A layered check\nthat adds no search space adds no security — it only adds reading.",
        },
        {
          type: 'exercise',
          id: 'm5-ex-rename',
          title: 'Leave the project better than you found it',
          task: "Work through the lab binary in Ghidra and rename the three interesting functions and the table to something meaningful, then add a comment on the hash function recording what the constants identify. Afterwards, say what a colleague opening your project would learn in the first thirty seconds that they could not learn from the stripped binary.",
          hint: 'Ghidra propagates a rename to every call site, so rename the callee first and then reread the caller.',
          answer:
            "A reasonable set of names:\n  FUN_140001460  -> check_key_table\n  FUN_1400014ad  -> fnv1a_hash\n  FUN_1400014d7  -> main\n  DAT_140004070  -> key_table (typed as byte[8])\n\nComment on fnv1a_hash:\n  \"FNV-1a, 32-bit: offset basis 0x811C9DC5, prime 0x01000193, XOR before\n   multiply. Result compared against 0x9E97FE09 in main.\"\n\nWhat the colleague gains in thirty seconds: the shape of the program. main reads\nas a length check, a table check and a hash check, in that order, with named\ncallees — so they can decide where to look without redoing the analysis.",
          explanation: "Renaming is not cosmetic. It is how analysis compounds: each name you apply makes the next function cheaper to read, and it converts a private understanding into something transferable. This is the same habit as the environment notes in module 1, applied to the tool instead of the machine.",
        },
        {
          type: 'exercise',
          id: 'm5-ex-deadgate',
          title: 'Find the unreachable branch',
          task: "One of the five exit codes in this program can never be produced by any input. Identify it, explain why, and describe how you would have noticed this from the decompilation alone rather than by running the program thousands of times.",
          hint: 'Compare what the first gate guarantees about the input against what the second gate tests.',
          answer:
            "Exit code 4, `rejected: checksum mismatch`, is unreachable.\n\nWhy: the first gate compares every one of the eight bytes against a fixed table\nthrough an invertible transform, so exactly one string passes it. That string is\nalso the only input the hash sees, and its hash is the constant main compares\nagainst. Any input that fails the hash was already rejected by the first gate.\n\nHow you see it statically: the gates are ordered, and the first one leaves no\nfreedom in the input. Once a check pins every byte, every later check on the\nsame bytes is decided.",
          explanation: "Reasoning about reachability from the structure of the checks is a large part of real analysis, and it is much cheaper than experiment. It also tells you something about the program's author: a dead defensive branch usually means the two checks were written at different times, which is a hint about where else the code may not do what it appears to.",
        },
      ],
    },
  ],
};
