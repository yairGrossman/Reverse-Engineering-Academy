/**
 * SOURCES (fetched while writing this module):
 * - Ghidra: https://github.com/NationalSecurityAgency/ghidra
 *   NSA Research Directorate; Apache-2.0; disassembly, assembly, decompilation,
 *   graphing, scripting. JDK requirement CORRECTED while writing module 5: the
 *   shipped release 12.1.3 states "Java 21 64-bit Runtime and Development Kit
 *   (JDK)" in its own docs/GettingStarted.md line 54, read from the extracted
 *   ghidra_12.1.3_PUBLIC tree on this machine (application.build.date=
 *   2026-Aug-17). The master README on GitHub asks for JDK 25, but that tracks
 *   building from source rather than the release a learner downloads — a
 *   version/variant mismatch, so the release doc is the one cited.
 * - x64dbg: https://x64dbg.com/ — "An open-source x64/x32 debugger for windows",
 *   GPLv3, downloads at https://snapshots.x64dbg.com
 * - jadx: https://github.com/skylot/jadx — Dex to Java decompiler; accepts
 *   .apk .dex .jar .class .smali .zip .aar .arsc .aab; decodes
 *   AndroidManifest.xml and resources.arsc; Apache 2.0; jadx-gui included.
 * - ILSpy: https://github.com/icsharpcode/ILSpy — open-source, cross-platform
 *   .NET assembly browser and decompiler; MIT; Windows/Linux/macOS.
 * - CFR: https://github.com/leibnitz27/cfr — Java decompiler for class and jar,
 *   MIT, run as `java org.benf.cfr.reader.Main <path>`.
 * - ZipCrypto vs AES behaviour: measured on the build machine — an AES zip is
 *   rejected by Info-ZIP unzip ("need PK compat. v5.1") and by Python zipfile,
 *   while ZipCrypto opens in 7-Zip, unzip and zipfile alike.
 */
import type { Module } from '../../types/content';

export const whatIsReModule: Module = {
  id: 'what-is-re',
  number: 1,
  title: 'What Reverse Engineering Is',
  tagline: 'The loop, the law, and the tools you will use for the rest of the course.',
  part: 1,
  lessons: [
    {
      id: 'the-discipline',
      title: 'The Discipline',
      blocks: [
        {
          type: 'prose',
          text: "Reverse engineering is working out how something behaves from the artifact you have, rather than the source code you do not. A compiler threw away names, comments and structure on the way to machine code. Your job is to rebuild enough of that understanding to answer a specific question — and **only** enough. Total comprehension is rarely the goal.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'The loop',
          text: "Every session is the same cycle: **observe** something concrete (a string, a call, a crash), **form a hypothesis** about what it means, **test** the hypothesis cheaply, then **refine**. Beginners try to read a binary top to bottom. Professionals aim a question at it and follow evidence until the question is answered.",
        },
        {
          type: 'prose',
          text: "That word *cheaply* is doing real work. Running the program once with a changed input is often worth an hour of reading disassembly. Choosing the cheapest test that can disprove your current guess is the core skill this course trains.",
        },
        {
          type: 'heading',
          text: 'Two ways to look',
        },
        {
          type: 'table',
          headers: ['', 'Static analysis', 'Dynamic analysis'],
          rows: [
            ['What it is', 'Reading the file without running it', 'Watching the program while it runs'],
            ['Sees', 'All code paths, including unreached ones', 'Only what actually executed'],
            ['Typical tools', 'Ghidra, ILSpy, jadx, `strings`', 'x64dbg, gdb, your IDE debugger'],
            ['Strong at', 'Structure, constants, finding the interesting function', 'Real values, decrypted data, what a packer unpacked'],
            ['Weak at', 'Anything computed at runtime', 'Paths your input never triggered'],
            ['Risk', 'Safe — nothing executes', 'You are running untrusted code'],
          ],
        },
        {
          type: 'prose',
          text: "Neither is superior. Static analysis tells you a function decrypts something; dynamic analysis tells you what it decrypted. Almost every real task alternates between them, and knowing which one answers the question in front of you is what makes the work fast.",
        },
        {
          type: 'heading',
          text: 'Why engineers do this',
        },
        {
          type: 'list',
          items: [
            '**Interoperability** — talking to a file format or protocol nobody documented.',
            '**Security work** — finding a bug class in a binary you cannot get source for.',
            '**Malware analysis** — establishing what a sample does before it does it.',
            '**Debugging without symbols** — a crash inside a third-party library in production.',
            '**Preservation** — keeping software alive after its vendor is gone.',
            '**Verification** — checking that a shipped binary matches what was promised.',
          ],
        },
        {
          type: 'quiz',
          id: 'm1-quiz-loop',
          question: 'You need to know what value a program writes into its config file at startup. Which move is cheapest first?',
          options: [
            {
              text: 'Run it once and read the config file',
              correct: true,
              explanation: "Dynamic, and the answer is the artifact itself. One run beats reading the write path by hand.",
            },
            {
              text: 'Decompile every function that mentions config',
              correct: false,
              explanation: "Reading all the write paths is far more work than observing the one that ran.",
            },
            {
              text: 'Read the whole binary from top to bottom',
              correct: false,
              explanation: "Total comprehension is not the goal; the question is narrow, so the method should be too.",
            },
            {
              text: 'Rewrite the program and compare behaviour',
              correct: false,
              explanation: "Reimplementation is an outcome of understanding, not a way to acquire it.",
            },
          ],
        },
        {
          type: 'quiz',
          id: 'm1-quiz-staticdyn',
          question: 'A program decrypts a string at runtime. Static analysis alone struggles here because:',
          options: [
            {
              text: 'The plaintext does not exist until execution',
              correct: true,
              explanation: "Right — the file holds ciphertext and a routine, not the result. Running it produces the value.",
            },
            {
              text: 'Disassemblers cannot read encrypted sections',
              correct: false,
              explanation: "A disassembler reads the bytes fine; the issue is the value is computed, not stored.",
            },
            {
              text: 'Static tools skip functions above a size limit',
              correct: false,
              explanation: "No such limit exists; this is not how a decompiler decides what to show you.",
            },
            {
              text: 'Encryption strips the routine from the file',
              correct: false,
              explanation: "The decryption routine is very much present — that is what you would read statically.",
            },
          ],
        },
      ],
    },
    {
      id: 'legal-and-safe',
      title: 'Legal Ground & Safe Practice',
      blocks: [
        {
          type: 'callout',
          variant: 'warning',
          title: 'Not legal advice',
          text: "The rules differ by country, by contract, and by what you do with the result. This lesson orients you; it does not replace a lawyer for a specific situation. If a project has real stakes, ask someone qualified in your jurisdiction.",
        },
        {
          type: 'prose',
          text: "Two things are worth separating. **Analysing** software you possess is treated very differently from **distributing** what you make from it. Most people who get into trouble do so at the second step — publishing a patched binary, shipping a key generator, redistributing someone else's code — not at the first.",
        },
        {
          type: 'heading',
          text: 'Solid ground',
        },
        {
          type: 'list',
          items: [
            'Binaries you wrote, or that were written for you to practise on — like every lab in this course.',
            'Deliberate practice targets: crackmes, CTF challenges and wargames published for the purpose.',
            'Software you are authorised to test, in writing, within the agreed scope.',
            'Your own crash dumps, and your own dependencies when chasing a real failure.',
          ],
        },
        {
          type: 'heading',
          text: 'Where people get hurt',
        },
        {
          type: 'list',
          items: [
            'Defeating licensing on commercial software, and especially sharing the result.',
            'Testing something you do not own and have no written permission to test.',
            'Ignoring an agreement you accepted that restricts analysis.',
            'Running unknown samples on the machine that holds your real life.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Isolate before you run',
          text: "Dynamic analysis means executing code you do not trust. Do it in a virtual machine with a snapshot you can roll back to, and with networking off unless the task needs it. Every lab in this course is a binary we wrote and is safe — build the habit now, on safe files, so it is automatic when a file is not.",
        },
        {
          type: 'quiz',
          id: 'm1-quiz-legal',
          question: 'Which of these four carries the most legal risk?',
          options: [
            {
              text: 'Publishing a patch that unlocks paid features',
              correct: true,
              explanation: "Distribution turns private analysis into a public act, and it targets licensing directly.",
            },
            {
              text: 'Debugging a crash in a library your app ships',
              correct: false,
              explanation: "Diagnosing a failure in your own product is ordinary engineering work.",
            },
            {
              text: 'Solving a crackme published for practice',
              correct: false,
              explanation: "It was written and released precisely so that people would take it apart.",
            },
            {
              text: 'Disassembling a binary you compiled yourself',
              correct: false,
              explanation: "Your own artifact on your own machine — there is no other party involved.",
            },
          ],
        },
      ],
    },
    {
      id: 'your-toolbox',
      title: 'Your Toolbox',
      blocks: [
        {
          type: 'prose',
          text: "Install these once, now, and the rest of the course never stops to set up. Everything here is free, and every entry is a tool the later modules actually drive. Paid tools exist — IDA Pro and Binary Ninja are the names you will hear — and nothing in this course requires them.",
        },
        {
          type: 'table',
          headers: ['Tool', 'What it does', 'Licence', 'First needed'],
          rows: [
            ['[Ghidra](https://github.com/NationalSecurityAgency/ghidra)', 'Disassembler and decompiler for native code, from the NSA Research Directorate', 'Apache-2.0', 'Module 5'],
            ['[x64dbg](https://x64dbg.com/)', 'Open-source x64/x32 debugger for Windows', 'GPLv3', 'Module 6'],
            ['[ILSpy](https://github.com/icsharpcode/ILSpy)', 'Cross-platform .NET assembly browser and decompiler', 'MIT', 'Module 8'],
            ['[CFR](https://github.com/leibnitz27/cfr)', 'Java decompiler for `.class` and `.jar` files', 'MIT', 'Module 9'],
            ['[jadx](https://github.com/skylot/jadx)', 'Dex to Java decompiler with a GUI; also decodes `AndroidManifest.xml`', 'Apache 2.0', 'Module 10'],
            ['[7-Zip](https://www.7-zip.org/)', 'Opens the password-protected lab archives', 'LGPL', 'Module 2'],
            ['[Python](https://www.python.org/)', 'Scripting, and the `.pyc` labs', 'PSF', 'Module 11'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Ghidra needs its own JDK',
          text: "The release you download states its requirement in its own `docs/GettingStarted.md`: **Java 21, 64-bit, the JDK and not just a runtime**. Install it before Ghidra. Two traps: the project's README on GitHub asks for a newer JDK because that one is about building Ghidra from source, and an unsuitable JDK already on your PATH makes Ghidra refuse to start with an error that never quite says \"wrong Java\". Check `GettingStarted.md` inside the version you actually unpacked.",
        },
        {
          type: 'heading',
          text: 'About the lab downloads',
        },
        {
          type: 'prose',
          text: "Every lab arrives as a password-protected zip, and the password is printed next to the download button. It is not there to keep you out. These are unsigned executables that behave like licence checks, so antivirus quarantines them and browsers block them; a password stops a scanner reading inside the archive. Use 7-Zip, WinRAR, or any command-line `unzip` — the archives use the classic ZipCrypto method on purpose, so even Python's built-in `zipfile` can open them.",
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Two commands you will use constantly',
          text: "`strings <file>` lists the readable text inside a binary, and it is the first thing to run on anything. `file <file>` names the format. Neither needs installing on Linux or macOS; on Windows both ship with Git Bash, which you likely already have.",
        },
        {
          type: 'exercise',
          id: 'm1-ex-setup',
          title: 'Set up, then prove it works',
          task: "Install 7-Zip and the JDK your Ghidra release asks for, then Ghidra. Launch Ghidra once and let it finish creating a new project — do not analyse anything yet. Write down the version of each tool and where it lives on disk. Then answer: why bother writing that down?",
          hint: 'Think about what happens in six weeks when a lab behaves differently from the lesson text.',
          answer:
            "7-Zip 26.x — C:\\Program Files\\7-Zip\\7z.exe\nJDK — version read from docs/GettingStarted.md in the release, confirmed with: java -version\nGhidra 12.1.3 — unpacked to a path containing no spaces\n\nWritten down because: when a tool later disagrees with the lesson, the first question is always \"same version?\" and the second is \"which binary am I actually running?\". Having the answer to hand turns a confusing hour into a one-minute check.",
          explanation: "The real lesson is a habit, not a list. Reverse engineering is full of results that depend on exact versions — a decompiler renders a function differently between releases, a compiler emits different code at a different optimisation level. Recording your environment makes your results reproducible, which is the difference between a finding and an anecdote.",
        },
      ],
    },
    {
      id: 'practice-lab',
      title: 'Practice Lab',
      blocks: [
        {
          type: 'prose',
          text: "Questions first, then two written exercises. The set is reshuffled by code and the options carry no shape tells — if you have not read the lesson, guessing will not rescue you.",
        },
        {
          type: 'quiz-set',
          id: 'm1-set-foundations',
          title: 'Foundations check',
          questions: [
            {
              type: 'quiz',
              id: 'm1-set-q-goal',
              question: 'What is the goal of a reverse engineering session?',
              options: [
                {
                  text: 'To answer one specific question about it',
                  correct: true,
                  explanation: "Scope is the whole discipline. A narrow question is what makes the work finishable.",
                },
                {
                  text: 'To recover the original source code exactly',
                  correct: false,
                  explanation: "Compilation discards names and structure, so exact recovery is not on the table.",
                },
                {
                  text: 'To understand every function in the binary',
                  correct: false,
                  explanation: "Total comprehension costs enormously and is almost never what a task needs.",
                },
                {
                  text: 'To rewrite the program in a safer language',
                  correct: false,
                  explanation: "That may follow from understanding, but it is not what the analysis is for.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm1-set-q-static',
              question: 'Which finding is static analysis better suited to producing?',
              options: [
                {
                  text: 'Code paths that no run has reached yet',
                  correct: true,
                  explanation: "Reading the file shows paths whether or not any particular run reached them.",
                },
                {
                  text: 'The plaintext that a routine decrypted at runtime',
                  correct: false,
                  explanation: "That value exists only once the code runs, which is dynamic territory.",
                },
                {
                  text: 'The real contents of memory after unpacking',
                  correct: false,
                  explanation: "Unpacked memory is produced by execution, so a debugger sees it first.",
                },
                {
                  text: 'Which branch a given input actually took',
                  correct: false,
                  explanation: "Observing a specific run is exactly what dynamic analysis is for.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm1-set-q-vm',
              question: 'Why run dynamic analysis inside a snapshotted virtual machine?',
              options: [
                {
                  text: 'Because execution is what can harm the host',
                  correct: true,
                  explanation: "Running untrusted code is the risky act; a snapshot makes the damage reversible.",
                },
                {
                  text: 'Because debuggers refuse to attach on a host OS',
                  correct: false,
                  explanation: "Debuggers attach perfectly well outside a VM; isolation is the point, not capability.",
                },
                {
                  text: 'Because disassembly runs much faster inside a VM',
                  correct: false,
                  explanation: "A VM is generally slower; speed is not why anyone does this.",
                },
                {
                  text: 'Because packers cannot unpack themselves in a VM',
                  correct: false,
                  explanation: "They unpack fine — some even detect VMs, which is a later module's problem.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm1-set-q-jadx',
              question: 'Which tool would you reach for to read an Android app?',
              options: [
                {
                  text: 'jadx, which decompiles dex back to Java',
                  correct: true,
                  explanation: "It takes .apk and .dex directly and also decodes the manifest and resources.",
                },
                {
                  text: 'ILSpy, which browses and decompiles .NET code',
                  correct: false,
                  explanation: "ILSpy targets .NET assemblies — a different bytecode and metadata format.",
                },
                {
                  text: 'x64dbg, which debugs running Windows code',
                  correct: false,
                  explanation: "It is a Windows x86/x64 debugger, not an Android or bytecode tool.",
                },
                {
                  text: 'CFR, which decompiles class files and jars',
                  correct: false,
                  explanation: "CFR reads JVM class files; Android ships dex, so jadx is the fit.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm1-set-q-jdk',
              question: 'Ghidra will not launch after a clean install. Most likely cause?',
              options: [
                {
                  text: 'Your installed JDK is older than required',
                  correct: true,
                  explanation: "Each release names its required JDK in its own GettingStarted.md, and the failure rarely names Java clearly.",
                },
                {
                  text: 'Your Ghidra project folder has not been made',
                  correct: false,
                  explanation: "Ghidra offers to create a project after it starts; it is not a launch requirement.",
                },
                {
                  text: 'The binary you want to load is still packed',
                  correct: false,
                  explanation: "Nothing about a target file affects whether the tool itself starts.",
                },
                {
                  text: 'Antivirus has quarantined your lab archive',
                  correct: false,
                  explanation: "That would block a lab download, not Ghidra's own startup.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm1-set-q-zip',
              question: 'Why do the course labs ship inside password-protected archives?',
              options: [
                {
                  text: 'So scanners cannot read what is inside',
                  correct: true,
                  explanation: "The binaries look like licence checks, so AV removes them. A password blocks scanning.",
                },
                {
                  text: 'So that only paying learners can open them',
                  correct: false,
                  explanation: "The password is printed beside the download button; it gates nobody.",
                },
                {
                  text: 'So the archive compresses to a smaller size',
                  correct: false,
                  explanation: "Encryption does not improve compression; if anything it prevents it.",
                },
                {
                  text: 'So the files work on older Windows builds',
                  correct: false,
                  explanation: "Compatibility is unrelated to whether an archive carries a password.",
                },
              ],
            },
          ],
        },
        {
          type: 'exercise',
          id: 'm1-lab-ex1',
          title: 'Write the question before you open the file',
          task: "You are handed a 4 MB Windows program and told: 'it phones home somewhere, find out where'. Before opening any tool, write the sequence of cheap tests you would run, in order, and say what each one rules in or out.",
          hint: 'Order them by cost. What costs seconds? What costs an afternoon?',
          answer:
            "1. strings on the binary — a hostname or URL is often sitting in plain text. Rules in: a literal endpoint. Cost: seconds.\n2. Look at the imports — WinHTTP, WinINet, raw sockets? Tells me which API to breakpoint later. Cost: a minute.\n3. Run it in a VM with network logging and capture the connection. Rules in: the real endpoint, including one built at runtime. Cost: minutes.\n4. Only if the address is constructed: breakpoint the connect call and read the argument. Cost: an hour.\n5. Only if that is obfuscated too: static analysis of the routine that builds it. Cost: an afternoon.",
          explanation: "The ordering is the answer. Each step costs more than the one before, and each can end the task outright. Most people jump straight to step 5 because it feels like 'real' reverse engineering — and spend a day recovering something `strings` would have printed in a second. Escalate only when the cheap test fails.",
        },
        {
          type: 'exercise',
          id: 'm1-lab-ex2',
          title: 'Draw your own boundary',
          task: "In your own words, write the rule you will apply before analysing any binary that is not yours. Two or three sentences. Then name one situation where you would stop and ask someone before going further.",
          answer:
            "Rule: I analyse binaries I wrote, binaries published for practice, and binaries I have written permission to test — and I keep results private unless I am certain distribution is permitted. Execution always happens in a snapshotted VM.\n\nStop and ask: when a finding in someone else's product looks like a security flaw. Proving it further, or publishing it, has consequences beyond my machine, so that is a conversation before it is an action.",
          explanation: "Two ideas matter here. First, the split between analysing and distributing — that is where the real legal exposure lives. Second, recognising the moment a technical decision has become a decision about other people. Writing your boundary down now means you are not inventing it under pressure later.",
        },
      ],
    },
  ],
};
