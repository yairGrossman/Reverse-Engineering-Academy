/**
 * SOURCES (verified while writing this module):
 *
 * No new external specifications — module 14 reuses the sources cited across
 * modules 1–13. Everything below is MEASURED on the course build machine.
 *
 * Two capstone artifacts from ONE source file, labs/src/m14-pe-capstone/
 * capstone.c: the PE with mingw gcc 15.2.0 (-O1, stripped), the ELF with
 * `zig cc -target x86_64-linux-gnu` (-O1). Three stages in one binary:
 *   1. anti-debug guard (IsDebuggerPresent on Windows; a no-op stub on ELF),
 *   2. a stage passphrase XOR-encoded (^0x3C) in read-only data, decoded at
 *      runtime and required as argv[1],
 *   3. a numeric gate: argv[2] must equal (sum of passphrase bytes) * 31 + 0x2A.
 *
 * - PE behaviour: `capstone.exe genesis 23292` -> "FLAG{capstone_cleared}",
 *   exit 0; `genesis 0` -> "stage 2 failed", exit 4; `wrong 23292` -> "stage 1
 *   failed", exit 2; no args -> usage, exit 1. Under a debugger the guard prints
 *   "nice try", exit 3.
 * - The stage passphrase is "genesis". Its bytes sum to 750, so the gate value is
 *   750 * 31 + 42 = 23292 (0x5AFC). Verified by running the binary.
 * - PE `file` reports "stripped to external PDB"; `objdump -p` shows
 *   IsDebuggerPresent imported from KERNEL32; `objdump -d` shows
 *   `xor $0x3c,%eax` (the stage-1 decode) and `imul $0x1f,%ebx,%ebx` (0x1F = 31,
 *   the gate multiplier). The encoded passphrase table
 *   {0x5B,0x59,0x52,0x59,0x4F,0x55,0x4F} sits at file offset 0x2069; each byte
 *   XORed with 0x3C spells "genesis".
 *
 * MEASURED COMPILER DIFFERENCE (the teaching point of the two builds):
 * - `strings capstone.exe` (PE) does NOT contain "genesis" — mingw kept the
 *   runtime decode loop, so the passphrase exists only while running.
 * - `strings capstone` (ELF) DOES contain "genesis" — zig at -O1 constant-folded
 *   the constant XOR of a const array into a literal, embedding the plaintext.
 *   Same source, opposite outcome; the flag string itself is a plain literal in
 *   both. So the PE is the real challenge and the ELF shows why optimisation and
 *   toolchain choice change what a binary gives away.
 */
import type { Module } from '../../types/content';

export const capstoneModule: Module = {
  id: 'methodology-capstone',
  number: 14,
  title: 'Methodology and Capstone',
  tagline: 'A repeatable process for an unknown binary — and one last file that needs all of it.',
  part: 5,
  lessons: [
    {
      id: 'a-repeatable-process',
      title: 'A Repeatable Process',
      blocks: [
        {
          type: 'prose',
          text: "Thirteen modules gave you tools. This one gives you an order to use them in, so that facing an unfamiliar binary is a process rather than a panic. The process is the same whatever the format, because every module proved the same thing: the analytic move does not change, only the instruction set does.",
        },
        {
          type: 'heading',
          text: 'Triage before depth',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Identify the format.** First bytes and headers: `MZ`+`PE\\0\\0` native or `BSJB` managed (module 8), `0x7F ELF` (module 2), `CAFEBABE` class (module 9), `dex\\n` (module 10), `PK` for a JAR/APK/ZIP, a `.pyc` magic (module 11). The format decides every tool that follows.',
            '**Read the outside.** `strings` (and `strings -e l` for .NET), imports, sections, and the manifest for an APK. Cheap facts that shape everything: an imported `IsDebuggerPresent` warns of a check, `UPX0`/`UPX1` sections mean packing, few imports plus high entropy mean the same.',
            '**Form a question.** Decide what you actually need — a key, a branch, a value, a behaviour — before you open a decompiler. Module 1 made this a habit for a reason: it stops you reading everything.',
          ],
        },
        {
          type: 'heading',
          text: 'Then the right depth',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Static first.** A decompiler (module 5, 8, 9) or disassembler answers most questions without running anything, and running an unknown binary is the risky step.',
            '**Dynamic when static stalls.** A value computed at runtime, a buffer filled in memory, a branch you cannot resolve on paper — that is when you reach for a debugger (module 6) or instrumentation (module 13).',
            '**Defeat defences as you meet them.** Unpack (module 12) before you expect to read code; recognise anti-debug and route around it; decode obfuscated strings by finding the decoder.',
            '**Recover or change.** Keygen an invertible check, patch a non-invertible one, hook a runtime-only value (module 13). The check decides which.',
          ],
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'The single idea under all of it',
          text: "Everything the program needs to run is inside the file or arrives while it runs, so everything is recoverable — a value you can compute, you can recover; a value it computes, you can observe. Obfuscation, packing and anti-debugging raise the cost; they never change that fact. Hold onto it when a binary looks hopeless.",
        },
        {
          type: 'quiz',
          id: 'm14-quiz-order',
          question: 'You are handed an unknown executable. What is the right first step?',
          options: [
            {
              text: 'Identify the format from its bytes',
              correct: true,
              explanation: "The format decides every tool that follows, so triage begins by reading the magic and headers.",
            },
            {
              text: 'Run it and watch what it does',
              correct: false,
              explanation: "Running unknown code is the risky step; static triage comes first, and in isolation if you must run it.",
            },
            {
              text: 'Open it in a decompiler immediately',
              correct: false,
              explanation: "A decompiler needs to know the format, and cheap triage first tells you where to look.",
            },
            {
              text: 'Search the whole file for strings',
              correct: false,
              explanation: "`strings` is part of triage, but identifying the format frames what the strings even mean.",
            },
          ],
        },
      ],
    },
    {
      id: 'notes-and-reporting',
      title: 'Notes and Reporting',
      blocks: [
        {
          type: 'prose',
          text: "Analysis you cannot reproduce or explain is an anecdote. The difference between a hobbyist result and professional work is that the latter is written down as you go — which tool, which version, which address, which measured value — so that someone else, or you in six weeks, can follow it.",
        },
        {
          type: 'heading',
          text: 'What to record',
        },
        {
          type: 'table',
          headers: ['Record', 'Because'],
          rows: [
            ['Tool and version', 'Results differ between versions — module 5 corrected a JDK claim over exactly this'],
            ['Addresses, three kinds', 'File offset, virtual, runtime are different numbers (modules 6, 7)'],
            ['Every measured value', 'A quoted `objdump` line beats a remembered one, always'],
            ['What you have NOT confirmed', 'An honest gap is worth more than a confident guess'],
          ],
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'This course was built on this rule',
          text: "Every module opened with a `SOURCES` block listing what was fetched or measured, and every lab answer was read off a tool rather than recalled. That is not house style for its own sake — it is the same discipline a real report needs, applied to teaching. When a source did not cover a case, the lesson said so instead of guessing; your reports should do the same.",
        },
        {
          type: 'heading',
          text: 'The shape of a finding',
        },
        {
          type: 'prose',
          text: "A useful finding states what you claim, how you know, and how sure you are. \"The serial is derived as `(sum * 1337 + 7) mod 100000`, read from `imul $0x539` in `serial_for` at `0x1450` and confirmed by a keygen that the binary accepted\" is a finding. \"It uses some maths on the name\" is not.",
        },
        {
          type: 'quiz',
          id: 'm14-quiz-notes',
          question: 'Why record the exact version of every tool you use?',
          options: [
            {
              text: 'Results can differ between versions',
              correct: true,
              explanation: "Output and behaviour change across releases, so a result is only reproducible against a named version.",
            },
            {
              text: 'Older tools tend to be less accurate',
              correct: false,
              explanation: "Newer is not automatically better; the point is reproducibility, not a ranking of versions.",
            },
            {
              text: 'Reports must list installed software',
              correct: false,
              explanation: "It is not a bureaucratic checklist; the version matters because it changes what you observed.",
            },
            {
              text: 'Tools expire and stop working',
              correct: false,
              explanation: "Tools do not expire; the reason is that their output can differ from one version to the next.",
            },
          ],
        },
      ],
    },
    {
      id: 'capstone',
      title: 'The Capstone',
      blocks: [
        {
          type: 'prose',
          text: "One binary, three stages, each a technique you have already met. Nothing here is new — the challenge is assembling the whole process against a single stripped file. There are two downloads, the same program built two ways, and comparing them is part of the lesson.",
        },
        {
          type: 'heading',
          text: 'What the file is made of',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**An anti-debug guard.** The PE imports `IsDebuggerPresent`; under a debugger it prints `nice try` and exits. Static analysis never trips it (module 12).',
            '**A hidden passphrase.** A byte table in read-only data is XOR-encoded with `0x3C` and decoded at startup, required as the first argument (modules 3, 12).',
            '**A numeric gate.** The second argument must equal `(sum of the passphrase bytes) * 31 + 0x2A`, read by finding `imul $0x1f` and inverting the arithmetic (module 4).',
          ],
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'The two builds disagree — and that is the lesson',
          text: "`strings capstone.exe` (the PE) does **not** contain the passphrase, because mingw kept the runtime decode loop. `strings capstone` (the ELF) **does** contain `genesis`, because zig at `-O1` folded the constant XOR of a constant array into a plain literal. Same source, opposite outcome. Optimisation level and toolchain change what a binary gives away — so the PE is the real puzzle and the ELF is a free hint if you check it first.",
        },
        {
          type: 'quiz-set',
          id: 'm14-set-capstone',
          title: 'Methodology check',
          questions: [
            {
              type: 'quiz',
              id: 'm14-set-q-triage',
              question: 'What is the purpose of the triage step before deep analysis?',
              options: [
                {
                  text: 'Cheap facts that decide where to look',
                  correct: true,
                  explanation: "Format, strings, imports and sections are quick to read and shape every later choice.",
                },
                {
                  text: 'To fully understand the program early',
                  correct: false,
                  explanation: "Understanding is the goal of deep analysis; triage only points you at the right part of it.",
                },
                {
                  text: 'To run the binary as soon as possible',
                  correct: false,
                  explanation: "Triage is static and cautious; running comes later, in isolation if the binary is unknown.",
                },
                {
                  text: 'To produce the final written report',
                  correct: false,
                  explanation: "Reporting is continuous and comes at the end; triage is the opening survey.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm14-set-q-samesource',
              question: 'One build hides a passphrase and the other leaks it in strings. Why, from the same source?',
              options: [
                {
                  text: 'Compilers optimised the decode apart',
                  correct: true,
                  explanation: "One kept the runtime decode; the other constant-folded it into a literal, exposing the plaintext.",
                },
                {
                  text: 'One binary was deliberately obfuscated',
                  correct: false,
                  explanation: "Neither was; the difference is ordinary optimisation, not an added obfuscation pass.",
                },
                {
                  text: 'The ELF format cannot hide any strings',
                  correct: false,
                  explanation: "ELF hides data as well as PE; the cause is the compiler's folding, not the format.",
                },
                {
                  text: 'The passphrase differs between builds',
                  correct: false,
                  explanation: "Same source, same passphrase; only whether it appears as a literal differs.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm14-set-q-static',
              question: 'Why can you clear the anti-debug stage without defeating it?',
              options: [
                {
                  text: 'Static analysis runs no debugger',
                  correct: true,
                  explanation: "The guard only fires at runtime under a debugger; reading the file statically never triggers it.",
                },
                {
                  text: 'The guard is disabled in the PE build',
                  correct: false,
                  explanation: "It is present and imported; you avoid it by not running under a debugger, not because it is off.",
                },
                {
                  text: 'IsDebuggerPresent is not a real check',
                  correct: false,
                  explanation: "It is a genuine check; static reading simply involves no debugger for it to detect.",
                },
                {
                  text: 'The flag is printed before the guard',
                  correct: false,
                  explanation: "The guard runs first; the flag prints only after all stages pass.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm14-set-q-gate',
              question: 'The gate needs `(sum * 31 + 0x2A)`. Where does the 31 show up in the disassembly?',
              options: [
                {
                  text: 'As `imul $0x1f`',
                  correct: true,
                  explanation: "0x1F is 31; the multiply by the constant is how the gate's arithmetic appears in the code.",
                },
                {
                  text: 'As `add $0x1f`',
                  correct: false,
                  explanation: "The 31 is a multiplier, so it appears in an `imul`, not an `add`; 0x2A is the addend.",
                },
                {
                  text: 'As a `cmp $0x1f`',
                  correct: false,
                  explanation: "The comparison is against the full expected value, not against the multiplier alone.",
                },
                {
                  text: 'As `shl $0x1f`',
                  correct: false,
                  explanation: "31 is not a power of two, so it is a multiply, not a shift.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm14-set-q-recover',
              question: 'The whole course reduces to one idea about recoverability. Which?',
              options: [
                {
                  text: 'Everything used is present or computed',
                  correct: true,
                  explanation: "Everything needed to run is in the file or arrives at runtime, so everything is recoverable in principle.",
                },
                {
                  text: 'Enough obfuscation makes the code unreadable',
                  correct: false,
                  explanation: "Obfuscation raises cost but cannot remove what the program needs to run; it stays recoverable.",
                },
                {
                  text: 'Compiled code is beyond understanding',
                  correct: false,
                  explanation: "The whole course is a demonstration that it is not; the tools recover its meaning.",
                },
                {
                  text: 'Dynamic analysis beats static work',
                  correct: false,
                  explanation: "Neither dominates; they answer different questions and are used together.",
                },
              ],
            },
          ],
        },
        {
          type: 'lab',
          id: 'm14-lab-capstone',
          title: 'Clear all three stages',
          brief:
            "`capstone.exe` is a stripped PE with an anti-debug guard, a passphrase hidden by XOR encoding, and a numeric gate. Recover the passphrase and the code, and it prints the flag. The ELF download is the same program built with a different compiler — comparing the two is fair game, and instructive.",
          format: 'PE',
          tools: ['Ghidra', 'objdump', 'strings', '7-Zip'],
          download: { file: 'm14-pe-capstone.zip', password: 'reverse' },
          questions: [
            {
              id: 'guardapi',
              prompt: 'Which imported function is the anti-debug guard?',
              accept: ['IsDebuggerPresent'],
              normalize: 'text',
              hint: '`objdump -p capstone.exe` and look at the KERNEL32 imports.',
              explanation:
                "IsDebuggerPresent. It gates the whole program, but static analysis never runs a debugger, so it does not stop you reading the file.",
            },
            {
              id: 'xorkey',
              prompt: 'Which byte decodes the hidden passphrase?',
              accept: ['0x3c', '3c'],
              normalize: 'hex',
              hint: 'Find the decode loop (look for an `xor` with a constant), or the encoded table in .data.',
              explanation:
                "0x3C. The passphrase table in read-only data is XORed with 0x3C at startup; XOR is its own inverse.",
            },
            {
              id: 'passphrase',
              prompt: 'What is the passphrase (the first argument)?',
              accept: ['genesis'],
              normalize: 'text',
              hint: 'XOR the encoded table at file offset 0x2069 with 0x3C. It is one lowercase English word. `strings` on the PE will NOT show it — try the ELF build if you want a hint.',
              explanation:
                "genesis. It is not in the PE's strings because mingw kept the runtime decode; the ELF build leaks it because its compiler folded the decode into a literal.",
            },
            {
              id: 'code',
              prompt: 'What numeric code (the second argument) clears the gate?',
              accept: ['23292'],
              normalize: 'number',
              hint: "The gate needs (sum of the passphrase's bytes) * 31 + 0x2A. Sum the bytes of 'genesis', then apply it.",
              explanation:
                "23292. The bytes of 'genesis' sum to 750, and 750 * 31 + 42 = 23292. `capstone.exe genesis 23292` prints the flag.",
            },
            {
              id: 'flag',
              prompt: 'What flag does the program print when both stages pass?',
              accept: ['FLAG{capstone_cleared}'],
              normalize: 'text',
              hint: 'Run it with the passphrase and code you recovered, or read the string it prints on success.',
              explanation:
                "FLAG{capstone_cleared}. The flag string is a plain literal — but reaching the code path that prints it required clearing both real stages.",
            },
          ],
          walkthrough:
            "1. Unzip. Triage the PE:\n     file capstone.exe        -> PE32+, stripped\n     objdump -p capstone.exe  -> imports IsDebuggerPresent (anti-debug guard)\n     strings capstone.exe     -> FLAG{capstone_cleared} is there, but no passphrase\n\n2. The guard never fires under static analysis, so ignore it and read the code.\n   In Ghidra (or objdump) find the decode loop:\n     xor $0x3c,%eax          the stage-1 passphrase is XOR 0x3C\n   The encoded table sits in .data at file offset 0x2069:\n     5B 59 52 59 4F 55 4F\n   XOR each with 0x3C:\n     >>> bytes(b ^ 0x3C for b in [0x5B,0x59,0x52,0x59,0x4F,0x55,0x4F]).decode()\n     'genesis'\n   (Shortcut: strings on the ELF build prints 'genesis' directly, because its\n    compiler folded the decode into a literal - a fair hint, and a lesson.)\n\n3. The numeric gate. Find imul $0x1f (31) and the +0x2A:\n     code = (sum of passphrase bytes) * 31 + 0x2A\n     sum('genesis') = 750\n     750 * 31 + 42 = 23292\n\n4. Clear it:\n     capstone.exe genesis 23292   -> FLAG{capstone_cleared}   (exit 0)\n     capstone.exe genesis 0       -> stage 2 failed           (exit 4)\n     capstone.exe wrong 23292     -> stage 1 failed           (exit 2)\n\nThat is the whole course in one file: triage the format and imports, route around\nthe anti-debug guard statically, decode an obfuscated string, and invert an\narithmetic gate. Every step was a module; putting them in order is the skill.",
        },
        {
          type: 'lab',
          id: 'm14-lab-capstone-elf',
          title: 'The same source, and why the ELF gives more away',
          brief:
            "`capstone` is the Linux build of the exact same source as the PE capstone. One difference matters for analysis: run `strings` on it and compare against the PE. The passphrase and code are the same, because the algorithm is the same — this lab is about noticing what the compiler changed.",
          format: 'ELF',
          tools: ['strings', 'objdump', '7-Zip'],
          download: { file: 'm14-elf-capstone.zip', password: 'reverse' },
          questions: [
            {
              id: 'strings-pass',
              prompt: 'Run `strings` on the ELF. Which passphrase appears in plaintext?',
              accept: ['genesis'],
              normalize: 'text',
              hint: '`strings capstone | grep -i genesis`. The same command on the PE build finds nothing.',
              explanation:
                "genesis. zig at -O1 constant-folded the XOR of a constant array into a literal, embedding the plaintext — where the PE build kept the runtime decode and hid it.",
            },
            {
              id: 'same-code',
              prompt: 'What numeric code clears the gate on this build?',
              accept: ['23292'],
              normalize: 'number',
              hint: 'The algorithm is identical to the PE, so the code is the same.',
              explanation:
                "23292 — identical to the PE, because it is the same source: (sum of 'genesis' bytes) * 31 + 0x2A = 750 * 31 + 42.",
            },
            {
              id: 'why-differ',
              prompt: 'Both builds come from one source, yet only the PE hides the passphrase. What caused the difference?',
              accept: ['compiler optimization', 'compiler optimisation', 'optimization', 'optimisation', 'constant folding'],
              normalize: 'text',
              hint: 'Think about what an optimiser can do with a constant XOR applied to a constant array.',
              explanation:
                "Compiler optimisation — specifically constant folding. The decode had constant inputs, so one compiler computed it at build time and stored the result, while the other left the loop to run.",
            },
          ],
          walkthrough:
            "1. Unzip and run the one command that matters:\n     strings capstone | grep -i genesis\n     -> genesis\n   The same command on capstone.exe (the PE) found nothing.\n\n2. Confirm it is the same program:\n     ./capstone genesis 23292   -> FLAG{capstone_cleared}\n   Same passphrase, same code, same flag - it is one source file.\n\n3. Why they differ: the passphrase is a constant array XORed with a constant\n   (0x3C). An optimiser is free to compute that at build time. zig did, folding\n   the result into a literal that strings then finds; mingw kept the loop, so the\n   PE only ever holds the plaintext at runtime.\n\nThe lesson to end on: two honest compilers, one source, and one hands you the\nsecret while the other makes you work for it. Always check what your specific\nbuild actually contains - never assume the source and the binary hide the same\nthings.",
        },
        {
          type: 'exercise',
          id: 'm14-ex-report',
          title: 'Write the capstone report',
          task: "Write a short analysis report for capstone.exe as if handing it to a colleague. Include: the format and how you identified it, the three stages and how each works, the recovered passphrase and code with how you got them, the measured commands you relied on, and one thing you did not fully verify. Keep it to what you can support.",
          hint: 'Use the shape from the notes lesson: what you claim, how you know, how sure you are. Quote real commands and addresses.',
          answer:
            "Sample report:\n\n  Target: capstone.exe. Format: PE32+ (MZ / PE\\0\\0), stripped, confirmed with\n  `file` and `objdump -f`.\n\n  Defences and stages:\n   1. Anti-debug: imports IsDebuggerPresent (objdump -p). Bypassed by analysing\n      statically - no debugger runs, so the guard never fires.\n   2. Hidden passphrase: a 7-byte table in .data at file offset 0x2069, XORed\n      with 0x3C at runtime (xor $0x3c in the decode loop). Decoded to 'genesis'.\n   3. Numeric gate: second arg must equal sum(passphrase bytes)*31 + 0x2A, read\n      from imul $0x1f and the +0x2A. sum('genesis')=750, so code = 23292.\n\n  Result: `capstone.exe genesis 23292` prints FLAG{capstone_cleared}, exit 0;\n  wrong inputs give distinct exit codes 2 and 4.\n\n  Not fully verified: the anti-debug behaviour under an actual debugger was not\n  exercised here; it is inferred from the import and the code path.\n\n  Tools: mingw objdump 2.45.1, Ghidra 12.1.3, GNU strings.",
          explanation: "The report is the deliverable that separates analysis from a lucky guess. Notice what the model answer does: every claim is tied to a command and an address, the recovered values are shown with their derivation, and the one unverified item is stated rather than hidden. That last habit - naming what you did not confirm - is the mark of trustworthy work, and it is the note this whole course has tried to end on.",
        },
        {
          type: 'exercise',
          id: 'm14-ex-next',
          title: 'Design your own next challenge',
          task: "You have finished the course. Sketch a binary you would build to test yourself further: what check it would use, which single defence you would add, and which of the three attacks (keygen, patch, instrumentation) you intend it to require. Explain why your design forces that attack and not the easier ones.",
          hint: 'Recall the rule that the check decides the attack: invertible favours keygen, non-invertible forces patch or hook, runtime-only favours instrumentation.',
          answer:
            "One design: a program that fetches a challenge value over a function you stub\nout, then checks the serial against a hash of (challenge + name) that has no\nfeasible preimage.\n\n  - Defence added: the check is non-invertible (a one-way hash), so there is no\n    formula to run forwards.\n  - Attack it forces: patch or instrumentation, not a keygen. Because the\n    expected value depends on a runtime challenge and a one-way hash, you cannot\n    compute a serial offline - so you either patch the comparison branch, or hook\n    the function at runtime to read or replace the expected value.\n  - Why not the easier attack: a keygen needs an invertible derivation; a hash\n    with no preimage removes exactly that, closing off the offline route.",
          explanation: "Designing a challenge is the inverse skill of solving one, and it proves you have internalised the course's central classification: the shape of the check dictates the attack. If you can deliberately build a binary that a keygen cannot touch, you understand why some real checks fall to a keygen and others do not - which is exactly the judgement that makes the difference between grinding and knowing where to push.",
        },
      ],
    },
  ],
};
