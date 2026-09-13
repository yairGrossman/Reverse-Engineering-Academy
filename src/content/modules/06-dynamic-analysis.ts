/**
 * SOURCES (verified while writing this module):
 *
 * FETCHED — GNU GDB manual (sourceware.org/gdb/current/onlinedocs/gdb.html):
 * - Registers.html: "You can refer to machine register contents, in
 *   expressions, as variables with names starting with '$'." `info registers`
 *   prints "all registers except floating-point and vector registers (in the
 *   selected stack frame)"; `info all-registers` includes them. "The register
 *   names $pc and $sp are used for the program counter register and the stack
 *   pointer. $fp is used for a register that contains a pointer to the current
 *   stack frame."
 * - Memory.html: the examine command is "x/nfu addr"; "The repeat count is a
 *   decimal integer; the default is 1. It specifies how much memory (counting by
 *   units u) to display." Formats are those of `print` ('x','d','u','o','t','a',
 *   'c','f','s') plus 'i' for machine instructions and 'm' for memory tags; unit
 *   sizes are b (byte), h (halfword), w (word), g (giant word). For 's' "the
 *   unit size defaults to 'b', unless it is explicitly given".
 *
 * FETCHED — x64dbg documentation (help.x64dbg.com/en/latest):
 * - commands/index.html lists the command categories: General Purpose, Debug
 *   Control, Breakpoint Control, Conditional Breakpoint Control, Tracing, Thread
 *   Control, Memory Operations, Operating System Control, Watch Control,
 *   Variables, Searching, User Database, Analysis, Types, Plugins, Script
 *   Commands, GUI, Miscellaneous.
 * - commands/breakpoint-control: SetBPX (aliases bp, bpx), DeleteBPX (bpc, bc),
 *   SetHardwareBreakpoint (bph, bphws), SetMemoryBPX (membp, bpm),
 *   SetMemoryRangeBPX (bpmrange), LibrarianSetBreakpoint (bpdll), bplist.
 * - commands/debug-control: run/go/r/g, StepInto/sti, StepOver/step/sto/st,
 *   StepOut/rtr, pause, StopDebug/stop/dbgstop.
 * - No claim about the x64dbg GUI layout is made in this module beyond what
 *   those pages support; the introduction page fetched returned only a table of
 *   contents, so nothing about versions or platforms is asserted from it.
 *
 * MEASURED on the course build machine, GNU gdb (GDB) 16.3, on the lab artifact
 * built by labs/build.mjs from labs/src/m06-pe-unlock/unlock.c (mingw gcc
 * 15.2.0, -O1 -g, not stripped):
 * - Behaviour: `unlock.exe 24633F10` prints "unlocked", exit 0. `unlock.exe
 *   24633f10` (lowercase) prints "locked", exit 2 — strcmp is case-sensitive.
 *   `unlock.exe wrongkey` prints "locked", exit 2. No argument prints
 *   "usage: unlock <key>", exit 1. `strings unlock.exe` does not contain the key.
 * - gdb --batch -ex "disassemble mix":
 *     mov    $0x1388,%edx
 *     mov    $0x12345678,%eax
 *     imul   $0x41c64e6d,%eax,%eax
 *     add    $0x3039,%eax
 *     sub    $0x1,%edx
 *     jne    0x140001460 <mix+16>
 *     ret
 * - gdb --batch -ex "break mix" -ex "run AAAAAAAA" -ex finish
 *     "Breakpoint 1 at 0x140001450: file .\unlock.c, line 23."
 *     "Thread 1 hit Breakpoint 1, mix () at .\unlock.c:23"
 *     "Value returned is $1 = 610483984"
 *     rax            0x24633f10          610483984
 * - gdb --batch -ex "break sprintf" -ex "run AAAAAAAA":
 *     "Breakpoint 1 at 0x140002640: file
 *      D:/W/B/src/mingw-w64/mingw-w64-crt/stdio/ucrt_sprintf.c, line 12."
 *     rcx 0x5ffe60, rdx 0x7ff6b1664014, r8 0x24633f10
 *     x/s $rdx  ->  0x7ff6b1664014: "%08X"
 *     then finish, x/s $rsp+0x20  ->  0x5ffe60: "24633F10"
 * - Breaking on the address printed by a static disassembler FAILED, which is
 *   quoted in the lesson verbatim:
 *     (gdb) break *0x1400014c0
 *     "Warning:\nCannot insert breakpoint 1.\nCannot access memory at address
 *      0x1400014c0"
 *   The same session showed the module loaded elsewhere: main's frame reported
 *   0x00007ff6b16614a9, so the runtime base was not the 0x140000000 in the file.
 * - Independently computed, not recalled: 5000 rounds of
 *   x = x * 1103515245 + 12345 starting at 0x12345678 gives 0x24633F10, and
 *   1103515245 = 0x41C64E6D, 12345 = 0x3039, matching the disassembly above.
 */
import type { Module } from '../../types/content';

export const dynamicAnalysisModule: Module = {
  id: 'dynamic-analysis',
  number: 6,
  title: 'Dynamic Analysis — x64dbg and gdb',
  tagline: 'Stop reading what the code would do and watch what it does: breakpoints, registers, memory, and the values that only exist at runtime.',
  part: 2,
  lessons: [
    {
      id: 'why-run-it',
      title: 'Why Run It At All',
      blocks: [
        {
          type: 'callout',
          variant: 'warning',
          title: 'Setup, and the rule that comes first',
          text: "Install **x64dbg** if you are on Windows, and use the **gdb** you already have from your compiler toolchain. Then re-read module 1's isolation rule: dynamic analysis means executing the target. The labs in this course are binaries you built from source you can read, but the habit belongs here — unknown binaries get run in a virtual machine with no network, or not at all.",
        },
        {
          type: 'prose',
          text: "Static analysis answers what the code *can* do. A debugger answers what it *did*, with actual values, on this input, on this machine. Neither replaces the other: static reading tells you where to put a breakpoint, and the breakpoint tells you what the maths worked out to.",
        },
        {
          type: 'heading',
          text: 'Four things only running shows you',
        },
        {
          type: 'table',
          headers: ['Question', 'Why static analysis struggles'],
          rows: [
            ['What value did this computation produce?', 'You can simulate it by hand, but a long loop costs real effort'],
            ['What is in this buffer after decryption?', 'The plaintext exists only in memory, never in the file'],
            ['Which branch actually ran?', 'Both branches are in the file; only one executes on your input'],
            ['Where is the code in memory?', 'Addresses in the file are not the addresses at runtime'],
          ],
        },
        {
          type: 'prose',
          text: "That last row catches everyone once. A static disassembler shows this module's lab at image base `0x140000000`, so `mix` looks like it lives at `0x140001450`. Setting a breakpoint on that raw address inside a live process failed — here is gdb's actual complaint:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'What happens when you trust a file address in a running process',
          code: `(gdb) break *0x1400014c0
Warning:
Cannot insert breakpoint 1.
Cannot access memory at address 0x1400014c0`,
        },
        {
          type: 'prose',
          text: "The same session reported `main` executing at `0x00007ff6b16614a9`. The loader placed the image somewhere else entirely, which is address space layout randomisation doing its job. The fix is not to fight it: break on a **symbol** or on an address computed from the module's runtime base, and let the debugger do the arithmetic.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'File offset, virtual address, runtime address',
          text: "Three different numbers for the same byte. The file offset is where it sits in the file on disk; the virtual address is where the header claims it will be loaded; the runtime address is where it actually ended up this run. Module 7 does the arithmetic between the first two — a debugger hands you the third.",
        },
        {
          type: 'quiz',
          id: 'm6-quiz-aslr',
          question: 'Your disassembler shows a function at `0x140001450`, but gdb refuses to set a breakpoint there. Why?',
          options: [
            {
              text: 'The image was loaded at a different base',
              correct: true,
              explanation: "Address space layout randomisation relocates the module, so the file's virtual address is not the runtime address.",
            },
            {
              text: 'The function is stripped of its debug data',
              correct: false,
              explanation: "Symbols affect breaking by name; the failure here is that the numeric address is not mapped in the process.",
            },
            {
              text: 'A hardware breakpoint would be needed there',
              correct: false,
              explanation: "Breakpoint type is irrelevant when the address itself is not part of the running process's memory map.",
            },
            {
              text: 'The target is actively resisting the debugger',
              correct: false,
              explanation: "Anti-debug tricks exist and module 12 covers them, but they produce different symptoms than an unmapped address.",
            },
          ],
        },
      ],
    },
    {
      id: 'gdb-working-set',
      title: 'A Debugger in Nine Commands',
      blocks: [
        {
          type: 'prose',
          text: "gdb has hundreds of commands. Nine carry almost every session. Everything below is real output from this module's lab, captured on the machine that builds the course.",
        },
        {
          type: 'table',
          headers: ['Command', 'What it does'],
          rows: [
            ['`break <symbol>`', 'Stop when execution reaches that function'],
            ['`run <args>`', 'Start the program with arguments'],
            ['`continue`', 'Carry on to the next breakpoint'],
            ['`finish`', 'Run to the end of the current function and print its return value'],
            ['`stepi` / `nexti`', 'One instruction forward, into or over a call'],
            ['`info registers`', 'All registers except floating-point and vector ones'],
            ['`x/nfu <addr>`', 'Examine memory: count, format, unit size'],
            ['`disassemble <symbol>`', 'Disassembly of one function'],
            ['`print $rax`', 'Evaluate an expression; register names start with `$`'],
          ],
        },
        {
          type: 'heading',
          text: 'Read the loop statically first',
        },
        {
          type: 'prose',
          text: "The lab computes its key with a loop. `disassemble` gives you the whole thing, and every constant you need is right there:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'gdb -ex "disassemble mix"',
          code: `Dump of assembler code for function mix:
   0x0000000140001450 <+0>:  mov    $0x1388,%edx
   0x0000000140001455 <+5>:  mov    $0x12345678,%eax
   0x000000014000145a <+10>: nopw   0x0(%rax,%rax,1)
   0x0000000140001460 <+16>: imul   $0x41c64e6d,%eax,%eax
   0x0000000140001466 <+22>: add    $0x3039,%eax
   0x000000014000146b <+27>: sub    $0x1,%edx
   0x000000014000146e <+30>: jne    0x140001460 <mix+16>
   0x0000000140001470 <+32>: ret
End of assembler dump.`,
        },
        {
          type: 'prose',
          text: "Read it with module 4's eyes: `edx` is a countdown initialised to `0x1388`, which is 5000. Each pass multiplies `eax` by `0x41C64E6D` and adds `0x3039`, starting from `0x12345678`. So you could compute the answer yourself — and it is worth doing once, to see what the debugger saves you.",
        },
        {
          type: 'heading',
          text: 'Or let the program do it and read the result',
        },
        {
          type: 'code',
          language: 'text',
          title: 'break, run, finish — the shortest path to a computed value',
          code: `$ gdb --batch -ex "break mix" -ex "run AAAAAAAA" -ex finish -ex "info registers rax" ./unlock.exe

Breakpoint 1 at 0x140001450: file .\\unlock.c, line 23.
Thread 1 hit Breakpoint 1, mix () at .\\unlock.c:23
0x00007ff6b16614a9 in main (argc=2, argv=0x7c76d0) at .\\unlock.c:36
Value returned is $1 = 610483984
rax            0x24633f10          610483984`,
        },
        {
          type: 'callout',
          variant: 'tip',
          title: '`finish` is the most underused command in gdb',
          text: "It runs the current function to completion and prints the return value. When you only care what a function computed — not how — `break` plus `finish` answers the question in two commands. Note it printed both forms: `0x24633f10` and 610483984.",
        },
        {
          type: 'heading',
          text: 'Catching a value on its way through a library call',
        },
        {
          type: 'prose',
          text: "Breakpoints do not have to be in the program's own code. Breaking on a library function lets you read its arguments — and by module 4's rules you know exactly which registers to look in. On Windows, `rcx` is the first argument, `rdx` the second, `r8` the third:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'break sprintf, then read the argument registers',
          code: `Thread 1 hit Breakpoint 1.1, sprintf (
    _Dest=0x5ffe60 " \\236\\360\\340\\373\\177",
    _Format=0x7ff6b1664014 "%08X")
  at D:/W/B/src/mingw-w64/mingw-w64-crt/stdio/ucrt_sprintf.c:12

(gdb) info registers rcx rdx r8
rcx            0x5ffe60            6291040
rdx            0x7ff6b1664014      140697514950676
r8             0x24633f10          610483984

(gdb) x/s $rdx
0x7ff6b1664014: "%08X"

(gdb) finish
(gdb) x/s $rsp+0x20
0x5ffe60:       "24633F10"`,
        },
        {
          type: 'prose',
          text: "Three facts fell out of that. `r8` held the number the program had just computed. `rdx` pointed at the format string, so this call formats one value as eight hex digits. And after the call, the destination buffer contains `24633F10` — the string the program is about to compare your input against.",
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Why the breakpoint landed in a file path you have never seen',
          text: "gdb reported `D:/W/B/src/mingw-w64/...ucrt_sprintf.c`. That is where the C runtime was built on someone else's machine, recorded in its debug information. You do not have that file, so gdb shows a warning and no source — completely normal, and a small reminder that debug info is full of the build environment.",
        },
        {
          type: 'heading',
          text: 'The x command, precisely',
        },
        {
          type: 'prose',
          text: "`x/nfu addr` takes a repeat count, a format letter and a unit size. The manual's own list: formats `x d u o t a c f s`, plus `i` for instructions; units `b` byte, `h` halfword, `w` word, `g` giant word. For strings the unit defaults to bytes.",
        },
        {
          type: 'table',
          headers: ['Example', 'Reads'],
          rows: [
            ['`x/s $rcx`', 'A null-terminated string at the address in `rcx`'],
            ['`x/16xb $rsp`', 'Sixteen bytes of stack, in hex'],
            ['`x/4xg $rsp`', 'Four 8-byte values — the shape of a stack frame'],
            ['`x/8i $pc`', 'The next eight instructions'],
            ['`x/1dw $rax`', 'One 4-byte value as a signed decimal'],
          ],
        },
        {
          type: 'quiz',
          id: 'm6-quiz-finish',
          question: 'A function runs a long loop and returns a number you need. Fastest way to get it in gdb?',
          options: [
            {
              text: '`break` on it, then `finish`',
              correct: true,
              explanation: "`finish` runs to the end of the frame and prints the return value, so you never read a single instruction.",
            },
            {
              text: '`stepi` until the loop exits',
              correct: false,
              explanation: "Correct but painful: five thousand iterations means five thousand steps unless you script it.",
            },
            {
              text: '`x/16xb` on the loop counter',
              correct: false,
              explanation: "Examining memory shows storage, and this loop keeps its accumulator in a register the whole time.",
            },
            {
              text: '`disassemble` and simulate it by hand',
              correct: false,
              explanation: "That is the static route and it does work — it is simply more effort than letting the program run.",
            },
          ],
        },
      ],
    },
    {
      id: 'x64dbg-equivalents',
      title: 'The Same Ideas in x64dbg',
      blocks: [
        {
          type: 'prose',
          text: "On Windows the usual choice is **x64dbg**, a graphical debugger with a command box. The concepts are the ones you just used; only the names change. Its documentation organises commands into categories — Debug Control, Breakpoint Control, Conditional Breakpoint Control, Tracing, Memory Operations, Watch Control and others — and the table below maps the ones you need onto the gdb commands above.",
        },
        {
          type: 'table',
          headers: ['Task', 'gdb', 'x64dbg (documented aliases)'],
          rows: [
            ['Software breakpoint', '`break <symbol>`', '`SetBPX` — `bp`, `bpx`'],
            ['Remove one', '`delete`', '`DeleteBPX` — `bpc`, `bc`'],
            ['List them', '`info breakpoints`', '`bplist`'],
            ['Hardware breakpoint', '`hbreak`', '`SetHardwareBreakpoint` — `bph`, `bphws`'],
            ['Break on memory access', '`watch`', '`SetMemoryBPX` — `membp`, `bpm`'],
            ['Break when a DLL loads', '—', '`LibrarianSetBreakpoint` — `bpdll`'],
            ['Run / continue', '`run`, `continue`', '`run` — `go`, `r`, `g`'],
            ['Step into', '`stepi`', '`StepInto` — `sti`'],
            ['Step over', '`nexti`', '`StepOver` — `step`, `sto`, `st`'],
            ['Run until return', '`finish`', '`StepOut` — `rtr`'],
            ['Pause a running target', 'Ctrl-C', '`pause`'],
            ['Detach and stop', '`kill`', '`StopDebug` — `stop`, `dbgstop`'],
          ],
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Three breakpoint kinds, and when each is the right one',
          text: "A **software** breakpoint patches the instruction, so it is unlimited in number but visible to code that checksums itself. A **hardware** breakpoint uses processor registers, so it changes no bytes but only a handful exist. A **memory** breakpoint fires on access to a region, which is how you catch the moment a buffer is filled rather than guessing which instruction fills it.",
        },
        {
          type: 'prose',
          text: "That last one is the sharpest tool for the lab in this module. Rather than working out which call writes the expected key, set a memory breakpoint on the buffer and let the program tell you. In gdb the equivalent is `watch`, and both answer the same question: *who touched this?*",
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'What this course does not claim about x64dbg',
          text: "Everything above comes from x64dbg's own command documentation. This module deliberately does not describe its window layout or menus, and ships no screenshots: interface details go stale faster than a course can be revised, and a wrong click path is worse than none. Open the Log and the Command box, and use the commands in the table.",
        },
        {
          type: 'quiz',
          id: 'm6-quiz-bptype',
          question: 'You want to know which instruction writes a decrypted string into a buffer. Which breakpoint?',
          options: [
            {
              text: 'A memory breakpoint on the buffer',
              correct: true,
              explanation: "It fires on access to the region, so the debugger identifies the writer without you guessing first.",
            },
            {
              text: 'A software breakpoint on every call',
              correct: false,
              explanation: "Workable but slow, and it assumes the write happens inside a call you already identified.",
            },
            {
              text: 'A hardware breakpoint on the entry point',
              correct: false,
              explanation: "That stops at the start of the program, which tells you nothing about a later write.",
            },
            {
              text: 'A conditional breakpoint on the compare',
              correct: false,
              explanation: "By then the write has happened; you would see the result without learning who produced it.",
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
          text: "This binary keeps its symbols, so breaking by name works. The key it accepts is not stored anywhere — it is computed. Solve it twice if you have the patience: once by reading the loop and simulating it, once by letting the program compute it while you watch. The second way takes about twenty seconds, and knowing that is the point.",
        },
        {
          type: 'quiz-set',
          id: 'm6-set-dynamic',
          title: 'Dynamic analysis check',
          questions: [
            {
              type: 'quiz',
              id: 'm6-set-q-static-dynamic',
              question: 'What does a debugger give you that a decompiler cannot?',
              options: [
                {
                  text: 'The values this run actually produced',
                  correct: true,
                  explanation: "Concrete state — register contents, buffer contents, which branch was taken — exists only while the program runs.",
                },
                {
                  text: 'A complete list of the code paths',
                  correct: false,
                  explanation: "That is static analysis territory; a run shows you one path through the program, not all of them.",
                },
                {
                  text: 'The names the programmer gave things',
                  correct: false,
                  explanation: "Names come from symbols or debug info, and either both tools see them or neither does.",
                },
                {
                  text: 'A guarantee that the analysis is correct',
                  correct: false,
                  explanation: "An observation is evidence about one input, which is weaker than a proof about every input.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm6-set-q-finish',
              question: 'What does `finish` do in gdb?',
              options: [
                {
                  text: 'Finishes the current stack frame',
                  correct: true,
                  explanation: "It completes the current function, returns to the caller, and prints the value that was returned.",
                },
                {
                  text: 'Runs the program until it exits',
                  correct: false,
                  explanation: "That is `continue` with no breakpoints left, and it discards the state you wanted to inspect.",
                },
                {
                  text: 'Ends the whole debugging session',
                  correct: false,
                  explanation: "Ending the session is `quit`, or `kill` for the process; `finish` is about one stack frame.",
                },
                {
                  text: 'Steps forward exactly one instruction',
                  correct: false,
                  explanation: "Single-stepping is `stepi` or `nexti`; `finish` covers however many instructions the frame needs.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm6-set-q-xcmd',
              question: 'Which gdb command prints a null-terminated string at the address in `rcx`?',
              options: [
                {
                  text: '`x/s $rcx` to read the string',
                  correct: true,
                  explanation: "Format `s` reads a string, and register names are written with a `$` inside expressions.",
                },
                {
                  text: '`print rcx` to print the pointer',
                  correct: false,
                  explanation: "Without the `$` gdb looks for a program symbol called rcx, which does not exist.",
                },
                {
                  text: '`x/16i $rcx` to show instructions',
                  correct: false,
                  explanation: "Format `i` disassembles that address as instructions, which is a different question entirely.",
                },
                {
                  text: '`info registers rcx` for the value',
                  correct: false,
                  explanation: "That prints the pointer value itself, not the bytes it points at, which is the usual first mistake.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm6-set-q-bpsoft',
              question: 'Why can a program notice a software breakpoint but not a hardware one?',
              options: [
                {
                  text: 'Software breakpoints modify the code bytes',
                  correct: true,
                  explanation: "The instruction is patched, so code that checksums itself sees a byte it did not expect.",
                },
                {
                  text: 'Hardware breakpoints run in kernel mode',
                  correct: false,
                  explanation: "Privilege is not the distinction; the difference is whether the target's own bytes change.",
                },
                {
                  text: 'Software breakpoints are slower to trigger',
                  correct: false,
                  explanation: "Speed is not the tell. A self-check compares bytes against a known value and sees the patch.",
                },
                {
                  text: 'Hardware breakpoints are limited in number',
                  correct: false,
                  explanation: "True and worth knowing, but scarcity is a constraint on you rather than something the target detects.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm6-set-q-aslr2',
              question: 'How should you break on a function whose runtime address you do not know?',
              options: [
                {
                  text: 'Break on the symbol and let gdb resolve it',
                  correct: true,
                  explanation: "The debugger applies the load base for you, which is why symbol breakpoints survive relocation.",
                },
                {
                  text: 'Disable relocation in the target binary',
                  correct: false,
                  explanation: "Editing the target to make analysis easier changes the thing you are analysing — a last resort.",
                },
                {
                  text: 'Use the file address and retry until it works',
                  correct: false,
                  explanation: "The file address is not mapped, so retrying reproduces the same failure every time.",
                },
                {
                  text: 'Search memory for the function bytes first',
                  correct: false,
                  explanation: "A real technique when symbols are gone, but needless work when the debugger can resolve a name.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm6-set-q-libbp',
              question: 'Why break on a C library function like `sprintf` rather than on your target code?',
              options: [
                {
                  text: 'Its arguments reveal values as they pass through',
                  correct: true,
                  explanation: "A library call is a chokepoint with a documented signature, so the argument registers name themselves.",
                },
                {
                  text: 'Library code is easier to disassemble cleanly',
                  correct: false,
                  explanation: "Readability is not the motive; the motive is that everything flowing through it must pass in known registers.",
                },
                {
                  text: 'The target code cannot be broken on at all',
                  correct: false,
                  explanation: "It can, and you will. Library breakpoints are an additional foothold rather than a replacement one.",
                },
                {
                  text: 'It avoids modifying any bytes in the target process',
                  correct: false,
                  explanation: "A software breakpoint patches bytes wherever it is set, including inside library code.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm6-set-q-isolate',
              question: 'You are given an unknown Windows binary to analyse dynamically. First move?',
              options: [
                {
                  text: 'Run it in an offline virtual machine',
                  correct: true,
                  explanation: "Executing unknown code is the risky step, so contain it before you learn anything from it.",
                },
                {
                  text: 'Attach a debugger on your working machine',
                  correct: false,
                  explanation: "A debugger observes; it does not contain. Anything the program does still happens to your host.",
                },
                {
                  text: 'Submit the file to an online scanning service',
                  correct: false,
                  explanation: "Sometimes appropriate, but uploading someone's binary can disclose it — module 1 covers that boundary.",
                },
                {
                  text: 'Rename the file so it cannot run by accident',
                  correct: false,
                  explanation: "An extension is not a safety control on Windows, and it protects nothing once you deliberately run it.",
                },
              ],
            },
          ],
        },
        {
          type: 'lab',
          id: 'm6-lab-unlock',
          title: 'Watch it compute its own key',
          brief:
            "`unlock.exe` accepts exactly one key and stores it nowhere — it derives it at startup from five thousand rounds of arithmetic. The binary keeps its symbols, so `break mix` works. Answer the first three questions from the disassembly, then use a breakpoint to get the key without doing the arithmetic yourself.",
          format: 'PE',
          tools: ['gdb', 'x64dbg (optional)', '7-Zip'],
          download: { file: 'm06-pe-unlock.zip', password: 'reverse' },
          questions: [
            {
              id: 'rounds',
              prompt: 'How many times does the mixing loop run?',
              accept: ['5000', '0x1388'],
              normalize: 'number',
              hint: 'Run `gdb -batch -ex "disassemble mix" ./unlock.exe`. One register is loaded with a count and decremented each pass.',
              explanation:
                "5000, loaded as `mov $0x1388,%edx` and counted down with `sub $0x1,%edx` until `jne` stops looping. Reading a loop bound out of its counter is a routine move.",
            },
            {
              id: 'multiplier',
              prompt: 'Which constant does the loop multiply by each round?',
              accept: ['0x41c64e6d', '41c64e6d', '1103515245'],
              normalize: 'hex',
              hint: 'Look for `imul` with an immediate inside the loop body.',
              explanation:
                "0x41C64E6D, which is 1103515245 — one half of a classic linear congruential generator, the other half being the `add $0x3039` that follows it.",
            },
            {
              id: 'seed',
              prompt: 'Which value does the accumulator start from?',
              accept: ['0x12345678', '12345678'],
              normalize: 'hex',
              hint: 'It is moved into the accumulator register before the loop begins.',
              explanation:
                "0x12345678. Seed, multiplier, increment and iteration count are the whole specification of the computation — which is why the static route really is possible here.",
            },
            {
              id: 'key',
              prompt: 'Which key does the program accept?',
              accept: ['0x24633f10', '24633f10'],
              normalize: 'hex',
              hint: 'Fastest route: `gdb -batch -ex "break mix" -ex "run AAAAAAAA" -ex finish ./unlock.exe` and read the returned value.',
              explanation:
                "0x24633F10. gdb prints it as `Value returned is $1 = 610483984` with `rax = 0x24633f10`. Pass it as the text `24633F10` — and in **uppercase**, because the program compares strings and `24633f10` is rejected.",
            },
            {
              id: 'argreg',
              prompt: 'At the `sprintf` call, which register carries the computed number?',
              accept: ['r8', 'r8d'],
              normalize: 'text',
              hint: 'This is a Windows binary, so use the Microsoft x64 argument order from module 4. The call is `sprintf(buffer, "%08X", value)`.',
              explanation:
                "`r8`, the third argument under Microsoft x64 — measured as `r8 0x24633f10` at the breakpoint, with `rcx` holding the destination buffer and `rdx` pointing at `\"%08X\"`.",
            },
            {
              id: 'wrongexit',
              prompt: 'What exit code does a wrong key produce?',
              accept: ['2'],
              normalize: 'number',
              hint: 'Run it with anything and check: `./unlock.exe wrongkey; echo $?`.',
              explanation:
                "2, against 0 for the right key and 1 for no argument at all. Distinct exit codes make a good signal when you are automating attempts.",
            },
          ],
          walkthrough:
            "1. Unzip, then read the computation statically:\n     gdb -batch -ex \"disassemble mix\" ./unlock.exe\n\n   The loop is seven instructions:\n     mov    $0x1388,%edx            ; 5000 iterations\n     mov    $0x12345678,%eax        ; seed\n     imul   $0x41c64e6d,%eax,%eax   ; multiply\n     add    $0x3039,%eax            ; add 12345\n     sub    $0x1,%edx\n     jne    <mix+16>\n     ret\n\n2. Static route — simulate it. In python:\n     >>> x = 0x12345678\n     >>> for _ in range(5000): x = (x * 0x41C64E6D + 0x3039) & 0xFFFFFFFF\n     >>> f\"{x:08X}\"\n     '24633F10'\n\n3. Dynamic route — let the program do the work:\n     gdb -batch -ex \"break mix\" -ex \"run AAAAAAAA\" -ex finish \\\n         -ex \"info registers rax\" ./unlock.exe\n\n     Thread 1 hit Breakpoint 1, mix () at .\\unlock.c:23\n     Value returned is $1 = 610483984\n     rax            0x24633f10          610483984\n\n4. Or catch the formatted string instead of the number. Break on the library\n   call that builds it, read the argument registers, then look at the buffer:\n     (gdb) break sprintf\n     (gdb) run AAAAAAAA\n     (gdb) info registers rcx rdx r8\n     rcx  0x5ffe60      <- destination buffer\n     rdx  0x7ff...014   <- \"%08X\"\n     r8   0x24633f10    <- the value\n     (gdb) finish\n     (gdb) x/s $rsp+0x20\n     0x5ffe60:  \"24633F10\"\n\n5. Confirm:\n     ./unlock.exe 24633F10   -> unlocked   (exit 0)\n     ./unlock.exe 24633f10   -> locked     (exit 2, strcmp is case-sensitive)\n     ./unlock.exe wrongkey   -> locked     (exit 2)\n\nThe honest summary: both routes worked, and the static one was not hard. What\nthe debugger bought you was certainty and about two minutes. On a loop with ten\nthousand rounds of something you cannot reimplement in four lines, that gap\nbecomes the difference between solving it and not.",
        },
        {
          type: 'exercise',
          id: 'm6-ex-watchpoint',
          title: 'Find the writer, not the write',
          task: "Without reading `main` first, use a watchpoint to discover which call fills the buffer that holds the expected key. Set a breakpoint in `main`, find the buffer's address, `watch` it, and continue. Write down the sequence of commands you used and what stopped first.",
          hint: 'A watchpoint needs an address, so you need one breakpoint before it to find the buffer. `info frame` and `x/16xb $rsp` help you locate a stack buffer.',
          answer:
            "One workable sequence:\n  break main\n  run AAAAAAAA\n  next            (a few times, until past the argument-count check)\n  x/16xb $rsp+0x20     -> the buffer, currently uninitialised\n  watch *(char*)($rsp+0x20)\n  continue        -> stops inside the formatting call that writes the first byte\n\nWhat stops first is the C library's formatting routine, not any code in the\nprogram itself — which is the useful discovery: the program does not build the\nstring by hand at all, it delegates to sprintf.",
          explanation: "Watchpoints invert the usual question. Instead of guessing which instruction touches a value and breaking there, you name the value and let the processor find the instruction. That is the only practical approach once a buffer is filled by code you have not read yet, and it is why the memory breakpoint is the most valuable of the three kinds.",
        },
        {
          type: 'exercise',
          id: 'm6-ex-cost',
          title: 'Price the two routes honestly',
          task: "You solved this lab statically and dynamically. Write a short note comparing them: how long each took, what could have gone wrong with each, and what property of a target would make you reach for the debugger first rather than second.",
          hint: 'Think about what you had to trust in each route, and what you would have had to reimplement.',
          answer:
            "Static: read seven instructions, reimplement four lines of arithmetic, get 24633F10.\nRisks: misreading an operand order, forgetting the 32-bit truncation, mistaking a\nsigned value for unsigned. Every one of those produces a confident wrong answer.\n\nDynamic: two commands, read the value. Risks: the value depends on this run's\ninput or environment, so a value observed once may not hold generally.\n\nReach for the debugger first when the computation is something you cannot cheaply\nreimplement: a long loop over external data, anything calling into the operating\nsystem, encryption with keys assembled at runtime, or code whose control flow\ndepends on values you do not have yet.",
          explanation: "Both routes are legitimate and both have failure modes, which is exactly why experienced analysts use them together: the debugger produces a value fast, and the static reading explains why that value is the value — and whether it will be the same tomorrow.",
        },
      ],
    },
  ],
};
