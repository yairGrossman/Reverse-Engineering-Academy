/**
 * SOURCES (verified while writing this module):
 * - PE structure ("MZ", then "PE\0\0" at the offset stored at 0x3C):
 *   https://learn.microsoft.com/en-us/windows/win32/debug/pe-format
 * - ELF identification (EI_MAG0..EI_MAG3 = 0x7f 'E' 'L' 'F'):
 *   https://www.sco.com/developers/gabi/latest/ch4.eheader.html
 * - Both lab binaries are built by labs/build.mjs from ONE source file
 *   (labs/src/m02-pe-firstlook/firstlook.c) — the PE with mingw gcc 15.2.0,
 *   the ELF with `zig cc -target x86_64-linux-gnu`. Every answer below was
 *   read off the built artifacts, not recalled: `strings` shows the
 *   passphrase, and running the binary produces the exit codes quoted.
 */
import type { Module } from '../../types/content';

export const sourceToBinaryModule: Module = {
  id: 'source-to-binary',
  number: 2,
  title: 'How Source Becomes a Binary',
  tagline: 'What the compiler keeps, what it throws away, and why that decides your method.',
  part: 1,
  lessons: [
    {
      id: 'the-pipeline',
      title: 'The Pipeline',
      blocks: [
        {
          type: 'prose',
          text: "Reverse engineering is easier once you know precisely what was done to the source on its way to becoming the file in front of you. It is not one step. It is four, and each one destroys something different.",
        },
        {
          type: 'table',
          headers: ['Stage', 'Input', 'Output', 'What it destroys'],
          rows: [
            ['Preprocess', '`.c` with `#include`, `#define`', 'One expanded source', 'Macros — they become their expansion, with no trace of the name'],
            ['Compile', 'Expanded source', 'Assembly for one architecture', 'Comments, most local names, your control flow as written'],
            ['Assemble', 'Assembly text', 'Object file with machine code', 'Mnemonics — `mov` becomes opcode bytes'],
            ['Link', 'Object files, libraries', 'The executable', 'Separation between your code and the library code pulled in'],
          ],
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Compilation is lossy, not encrypted',
          text: "Nothing here is hidden on purpose. The compiler discards what the CPU does not need — names, comments, types — because the CPU executes bytes, not intentions. That is why reversing is *reconstruction* rather than *decryption*: you are rebuilding information that was thrown away, not unlocking information that was concealed.",
        },
        {
          type: 'heading',
          text: 'Optimisation makes it worse',
        },
        {
          type: 'prose',
          text: "At `-O2` the compiler may inline a function so it no longer exists as a callable unit, unroll a loop so the repetition disappears, reorder work, or delete code it can prove has no effect. A decompiler later shows you *the compiler's* program, not yours. Two functions you wrote can become one; one you wrote can vanish entirely.",
        },
        {
          type: 'comparison',
          title: 'Same source, different survivability',
          bad: {
            content: 'gcc app.c -O2 -s -o app',
            note: 'Optimised and stripped. No symbol names, inlined helpers, restructured loops. Everything must be inferred from behaviour.',
          },
          good: {
            content: 'gcc app.c -O0 -g -o app',
            note: 'Unoptimised with debug info. Function names, line numbers and your original structure survive — which is why you build practice targets this way first.',
          },
        },
        {
          type: 'prose',
          text: "That is a deliberate lever for you as a learner: when you write a practice binary, compile it both ways and compare. The difference between the two decompilations teaches you more about optimisation than any article.",
        },
        {
          type: 'quiz',
          id: 'm2-quiz-lossy',
          question: 'Why is a decompiler unable to give you back the original source exactly?',
          options: [
            {
              text: 'The information was discarded during compilation',
              correct: true,
              explanation: "Names, comments and structure are not needed to execute, so they never reach the file.",
            },
            {
              text: 'Decompilers are deliberately limited by licensing',
              correct: false,
              explanation: "No licence restricts this; the missing data simply is not present in the binary.",
            },
            {
              text: 'The machine code is encrypted by the linker',
              correct: false,
              explanation: "Linking does not encrypt anything; ordinary executables are plainly readable.",
            },
            {
              text: 'Source is recoverable only from a debug build',
              correct: false,
              explanation: "Debug info helps a great deal, but even then it is not the original text.",
            },
          ],
        },
      ],
    },
    {
      id: 'what-survives',
      title: 'What Survives',
      blocks: [
        {
          type: 'prose',
          text: "Plenty does survive, and knowing the list tells you where to look first on any unfamiliar file.",
        },
        {
          type: 'list',
          items: [
            '**String literals** — kept verbatim, because the program prints them. Your first and cheapest lead.',
            '**Imports** — the external functions it calls are named, because the loader must resolve them.',
            '**Section layout** — code, data and read-only data stay separated and labelled.',
            '**Constants** — keys, magic numbers and table data are all still there.',
            '**Structure of control flow** — restructured, but the branches and loops are recoverable.',
            '**Symbols** — function and variable names, *if* the binary was not stripped.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Always run strings first',
          text: "It costs one second and it regularly ends the task outright. A licence message, a URL, a file path from the build machine, an error string unique enough to search for — any of these can point straight at the function you care about. When it finds nothing useful, that is information too: the program is either tiny, packed, or hiding its text on purpose.",
        },
        {
          type: 'heading',
          text: 'Stripping',
        },
        {
          type: 'prose',
          text: "A **stripped** binary has had its symbol table removed. The code is identical and it runs the same; you simply lose the names. Instead of `validate_licence` you get `sub_401560`. Stripping is routine for release builds, so expect it — and note the asymmetry it creates: strings usually survive stripping, because they are data the program still needs, while names do not, because nothing at runtime reads them.",
        },
        {
          type: 'heading',
          text: 'Two formats, one idea',
        },
        {
          type: 'prose',
          text: "Windows uses **PE**, Linux uses **ELF**, and both solve the same problem: tell the loader where the code is, what it needs, and where to start. You can identify either from its first bytes. A PE file begins with the two ASCII characters `MZ`, and the real header sits at a file offset stored at `0x3C`, where the four bytes `PE\\0\\0` appear. An ELF file begins with the four bytes `0x7F 'E' 'L' 'F'`.",
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Why PE starts with MZ',
          text: "Those two bytes are the initials of Mark Zbikowski, who designed the MS-DOS executable format. Every modern Windows binary still opens with a small MS-DOS program — the stub that prints \"This program cannot be run in DOS mode\" — purely for backwards compatibility, with the offset at `0x3C` pointing past it to the header that actually matters.",
        },
        {
          type: 'quiz',
          id: 'm2-quiz-strip',
          question: 'A stripped release binary still shows readable text in `strings`. Why?',
          options: [
            {
              text: 'The running code still reads that text',
              correct: true,
              explanation: "Literals are data the code reads at runtime, so removing them would break behaviour.",
            },
            {
              text: 'Stripping only removes text above a set length',
              correct: false,
              explanation: "Stripping targets the symbol table; string length has nothing to do with it.",
            },
            {
              text: 'The build forgot to pass the stripping flag',
              correct: false,
              explanation: "Even a correctly stripped binary keeps its literals — they are not symbols.",
            },
            {
              text: 'Antivirus software restores the removed text',
              correct: false,
              explanation: "Scanners read files; they do not write content back into them.",
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
          text: "Two labs built from **one** source file — the same C program compiled for Windows and for Linux. Download both and see how much of what you learn on one transfers to the other.",
        },
        {
          type: 'quiz-set',
          id: 'm2-set-pipeline',
          title: 'Pipeline check',
          questions: [
            {
              type: 'quiz',
              id: 'm2-set-q-macro',
              question: 'After compilation, what has happened to a C macro?',
              options: [
                {
                  text: 'It was replaced by its expansion entirely',
                  correct: true,
                  explanation: "The preprocessor substitutes text before the compiler ever sees the name.",
                },
                {
                  text: 'It survives as a symbol in the symbol table',
                  correct: false,
                  explanation: "Macros are not symbols; they are gone before symbols are generated.",
                },
                {
                  text: 'It becomes a callable function in the binary',
                  correct: false,
                  explanation: "No call is emitted — the text is substituted directly at each use site.",
                },
                {
                  text: 'It is stored in a table for the loader to use',
                  correct: false,
                  explanation: "The loader has no concept of macros; they never reach the file.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm2-set-q-pe',
              question: 'Which pair of facts identifies a Windows PE file?',
              options: [
                {
                  text: '`MZ` first, and `PE\\0\\0` at the offset from `0x3C`',
                  correct: true,
                  explanation: "The DOS stub starts with MZ; 0x3C holds the offset to the real PE header.",
                },
                {
                  text: '`PE\\0\\0` first, and `MZ` at the offset from `0x3C`',
                  correct: false,
                  explanation: "Reversed — the file opens with the DOS stub, not with the PE signature.",
                },
                {
                  text: '`0x7F ELF` first, and a section table at `0x3C`',
                  correct: false,
                  explanation: "That magic identifies ELF, which is the Linux format, not PE.",
                },
                {
                  text: '`MZ` first, and a fixed header sitting at `0x80`',
                  correct: false,
                  explanation: "The header offset is read from 0x3C; it is not a fixed constant.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm2-set-q-opt',
              question: 'A function you wrote does not appear in the decompiler. Likeliest reason?',
              options: [
                {
                  text: 'The optimiser inlined it into every caller',
                  correct: true,
                  explanation: "Inlining copies the body into callers, leaving no separate function to find.",
                },
                {
                  text: 'The linker moved it into a separate data file',
                  correct: false,
                  explanation: "Linking gathers code into the executable; it does not export it elsewhere.",
                },
                {
                  text: 'Stripping deleted the code along with its name',
                  correct: false,
                  explanation: "Stripping removes symbol names only — the instructions stay put.",
                },
                {
                  text: 'The decompiler hides functions under a byte size',
                  correct: false,
                  explanation: "There is no such size threshold in how a decompiler presents code.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm2-set-q-first',
              question: 'You are handed an unfamiliar executable. What do you run first?',
              options: [
                {
                  text: '`strings`, because it costs a second',
                  correct: true,
                  explanation: "Cheapest possible test, and it frequently answers the question by itself.",
                },
                {
                  text: 'A full decompilation of every function',
                  correct: false,
                  explanation: "The most expensive option, chosen before knowing whether it is needed.",
                },
                {
                  text: 'A debugger, stepping from the entry point',
                  correct: false,
                  explanation: "Single-stepping from the start burns time before you know what to watch.",
                },
                {
                  text: 'A packer detector, then nothing else',
                  correct: false,
                  explanation: "Useful, but it answers only one narrow question about the file.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm2-set-q-survive',
              question: 'Which of these does NOT survive into a stripped release build?',
              options: [
                {
                  text: 'The names you gave your own functions',
                  correct: true,
                  explanation: "Those live in the symbol table, which is exactly what stripping removes.",
                },
                {
                  text: 'The names of library functions it imports',
                  correct: false,
                  explanation: "Imports must stay named so the loader can resolve them at startup.",
                },
                {
                  text: 'The literal text the program prints out',
                  correct: false,
                  explanation: "Literals are data the running code reads, so they remain in the file.",
                },
                {
                  text: 'The constant values used in comparisons',
                  correct: false,
                  explanation: "Constants are part of the instructions or data and cannot be removed.",
                },
              ],
            },
          ],
        },
        {
          type: 'lab',
          id: 'm2-lab-pe',
          title: 'First look: a Windows binary',
          brief:
            "`firstlook.exe` is a small Windows console program that checks a passphrase. Nothing here is hidden — the point is to get comfortable pulling facts out of a real compiled file and to confirm each one two different ways.",
          format: 'PE',
          tools: ['strings', 'a terminal', '7-Zip'],
          download: { file: 'm02-pe-firstlook.zip', password: 'reverse' },
          questions: [
            {
              id: 'pass',
              prompt: 'Which passphrase does the program accept?',
              accept: ['sandstone'],
              normalize: 'text',
              hint: 'Run `strings firstlook.exe` and read the list. It is one ordinary English word.',
              explanation:
                "It sat in plain text because the compiler keeps string literals verbatim. You can confirm it by running the program with the word as its argument.",
            },
            {
              id: 'exit',
              prompt: 'What exit code does it return when the passphrase is WRONG?',
              accept: ['2'],
              normalize: 'number',
              hint: 'Run it with a wrong word, then print the exit code — `echo $?` in bash, `echo %ERRORLEVEL%` in cmd.',
              explanation:
                "A wrong passphrase returns 2, a correct one returns 0, and calling it with no argument at all returns 1. Distinct exit codes for distinct outcomes are a common convention, and they give you a signal to watch that does not depend on reading any output.",
            },
            {
              id: 'magic',
              prompt: 'Which two ASCII characters does the file begin with?',
              accept: ['MZ'],
              normalize: 'text',
              hint: 'Look at the first two bytes with a hex viewer, or recall what every Windows executable opens with.',
              explanation:
                "`MZ` marks the MS-DOS stub that every PE file still carries. The header that actually matters lives at the offset stored at `0x3C`.",
            },
          ],
          walkthrough:
            "1. Unzip with the password shown above.\n\n2. strings firstlook.exe\n   Among the output: the banner, \"usage: %s <passphrase>\", \"access granted\",\n   \"access denied\", and the word sandstone.\n\n3. Confirm it rather than trusting it:\n   ./firstlook.exe sandstone   -> access granted\n   ./firstlook.exe wrong       -> access denied\n\n4. Exit codes (bash):\n   ./firstlook.exe sandstone; echo $?   -> 0\n   ./firstlook.exe wrong;     echo $?   -> 2\n   ./firstlook.exe;           echo $?   -> 1\n\n5. First bytes:\n   od -An -c -N2 firstlook.exe          -> M Z\n\nThe habit worth taking from this: strings gave a candidate, running the program\nturned the candidate into a fact. Never stop at the candidate.",
        },
        {
          type: 'lab',
          id: 'm2-lab-elf',
          title: 'The same program, built for Linux',
          brief:
            "`firstlook` is the **same source file** compiled for Linux instead of Windows. Compare it against the PE lab: what carried over, and what changed? You do not need Linux to answer these — the questions are about the file, not about running it.",
          format: 'ELF',
          tools: ['strings', 'a hex viewer', '7-Zip'],
          download: { file: 'm02-elf-firstlook.zip', password: 'reverse' },
          questions: [
            {
              id: 'magic',
              prompt: 'What are the first four bytes of the file, in hex?',
              accept: ['7f454c46'],
              normalize: 'hex',
              hint: 'Dump them with `od -An -tx1 -N4 firstlook`. Three of the four are printable ASCII.',
              explanation:
                "`0x7F` followed by `E`, `L`, `F` — the ELF identification bytes the specification calls EI_MAG0 through EI_MAG3. Spotting this in the first four bytes is how you recognise a Linux binary instantly.",
            },
            {
              id: 'pass',
              prompt: 'Which passphrase does this build accept?',
              accept: ['sandstone'],
              normalize: 'text',
              hint: 'Run `strings` on it exactly as you did for the Windows build.',
              explanation:
                "The same word, because it is the same source. String literals are source-level data, so they are unaffected by which platform you target — while the file format around them changed completely.",
            },
          ],
          walkthrough:
            "1. od -An -tx1 -N4 firstlook\n   -> 7f 45 4c 46\n   That is 0x7F 'E' 'L' 'F', the ELF magic from the System V gABI.\n\n2. strings firstlook | grep -i sand\n   -> sandstone\n\n3. Compare the two labs:\n   - Same passphrase, same messages: source-level data is portable.\n   - Different magic bytes, different size, different imports: everything\n     the operating system cares about is not.\n\nThis is the single most useful idea in the module. Your analysis skills are\nmostly transferable between platforms; the container around the code is the\npart you have to learn separately, and that is Module 7.",
        },
        {
          type: 'exercise',
          id: 'm2-lab-ex1',
          title: 'Predict, then check',
          task: "Before running anything: write down which of these you expect to be IDENTICAL between the two lab binaries and which you expect to DIFFER — file size, the passphrase, the first four bytes, the printed messages, the imported functions. Then check each one and mark where you were wrong.",
          hint: 'Ask of each item: is this something the source decided, or something the target platform decided?',
          answer:
            "Identical: the passphrase, the printed messages — both are source-level data.\nDifferent: file size, the first four bytes (MZ vs 7f 45 4c 46), the imported\nfunctions (the Windows build pulls in the C runtime via the PE import table;\nthe Linux build resolves against libc).\n\nThe rule: anything the source decided carries over, anything the platform\ndecided does not.",
          explanation: "Being wrong here is the useful outcome — a wrong prediction that you check is how the platform/source boundary actually gets learned. Most people correctly guess the strings match and are surprised by how differently the two files are structured around identical behaviour.",
        },
      ],
    },
  ],
};
