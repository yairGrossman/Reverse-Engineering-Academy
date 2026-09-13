/**
 * SOURCES (verified while writing this module):
 *
 * FETCHED — Intel SDM, the actual volumes, not the landing page:
 * - Vol. 1, Basic Architecture, Order Number 253665-092US, June 2026
 *   (https://cdrdv2.intel.com/v1/dl/getContent/671436, listed on
 *   https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html):
 *     * Sec. 3.4.1.1 "In 64-bit mode, there are 16 general purpose registers and
 *       the default operand size is 32 bits. ... If a 64-bit operand size is
 *       specified: RAX, RBX, RCX, RDX, RDI, RSI, RBP, RSP, R8-R15 are available."
 *     * Table 3-2 "Addressable General Purpose Registers" — byte/word/dword/qword
 *       names, and the REX-prefix forms DIL, SIL, BPL, SPL, R8B-R15B.
 *     * Sec. 3.4.3.1 "Status Flags": CF bit 0, PF bit 2, AF bit 4, ZF bit 6,
 *       SF bit 7, OF bit 11.
 *     * Appendix B, Table B-1 "EFLAGS Condition Codes": E/Z tests ZF = 1;
 *       NE/NZ tests ZF = 0; B/C/NAE tests CF = 1; AE/NB/NC tests CF = 0;
 *       BE/NA tests (CF OR ZF) = 1; A/NBE tests (CF OR ZF) = 0; S tests SF = 1;
 *       L/NGE tests (SF XOR OF) = 1; GE/NL tests (SF XOR OF) = 0;
 *       LE/NG tests ((SF XOR OF) OR ZF) = 1; G/NLE tests ((SF XOR OF) OR ZF) = 0.
 * - Vol. 2A, Instruction Set Reference A-L, Order Number 253666-092US, June 2026
 *   (https://cdrdv2.intel.com/v1/dl/getContent/671199):
 *     * CMP, p. 3-161: "The comparison is performed by subtracting the second
 *       operand from the first operand and then setting the status flags in the
 *       same manner as the SUB instruction." Operation: temp := SRC1 -
 *       SignExtend(SRC2);
 *     * Jcc, p. 3-502: the terms less and greater "are used for comparisons of
 *       signed integers" and above and below "are used for unsigned integers".
 *       Also: JA and JNBE "are alternate mnemonics for the opcode 77H."
 *
 * FETCHED — the two calling conventions, each from its own document:
 * - System V AMD64 psABI, document source x86-64-ABI/low-level-sys-info.tex in
 *   https://gitlab.com/x86-psABIs/x86-64-ABI (master, last commit 2025-03-12):
 *   INTEGER arguments use "the next available register of the sequence RDI, RSI,
 *   RDX, RCX, r8 and r9"; SSE arguments take xmm0 to xmm7; the "Register Usage"
 *   figure gives RAX as 1st return register, RDX as 2nd, and marks RBX, RSP,
 *   RBP, r12-r15 as callee-saved; "The 128-byte area beyond the location pointed
 *   to by RSP ... is known as the red zone"; memory arguments are pushed
 *   right-to-left; al carries the number of vector registers for varargs calls.
 * - Microsoft x64 calling convention,
 *   https://learn.microsoft.com/en-us/cpp/build/x64-calling-convention
 *   (msvc-170, page updated 2026-05-21): "Integer arguments are passed in
 *   registers RCX, RDX, R8, and R9. Floating point arguments are passed in
 *   XMM0L, XMM1L, XMM2L, and XMM3L."; RAX returns scalars that fit in 64 bits,
 *   XMM0 returns floats and vectors; volatile = RAX, RCX, RDX, R8, R9, R10, R11,
 *   XMM0-XMM5; nonvolatile = RBX, RBP, RDI, RSI, RSP, R12-R15, XMM6-XMM15;
 *   "The caller must always allocate sufficient space to store four register
 *   parameters, even if the callee doesn't take that many parameters."
 *
 * MEASURED on the course build machine (nothing below is recalled):
 * - Both lab artifacts are built by labs/build.mjs from ONE source file,
 *   labs/src/m04-elf-keygate/keygate.c: the ELF with `zig cc -target
 *   x86_64-linux-gnu`, the PE with mingw gcc 15.2.0, both at -O1.
 * - ELF, `objdump -d --no-show-raw-insn keygate`:
 *     <transform>  push %rbp / mov %rsp,%rbp / lea (%rdi,%rdi,2),%rax /
 *                  lea 0x2a(,%rax,2),%rax / xor $0x5f,%rax / pop %rbp / ret
 *     <main>       cmp $0x2,%edi / jne ... / mov 0x8(%rsi),%rdi / xor %esi,%esi /
 *                  mov $0xa,%edx / call strtol@plt / mov %rax,%rdi /
 *                  call transform / xor %ebx,%ebx / cmp $0x1337,%rax /
 *                  setne %bl / lea -0x1135(%rip),%rax / lea -0x1134(%rip),%rdi /
 *                  cmove %rax,%rdi / add %ebx,%ebx / call puts@plt /
 *                  mov %ebx,%eax
 * - PE, same command on keygate.exe:
 *     <transform>  lea (%rcx,%rcx,2),%eax / lea (%rdx,%rax,2),%eax /
 *                  xor $0x5f,%eax / ret
 *     <main>       push %rbx / sub $0x20,%rsp / mov %ecx,%ebx /
 *                  mov %rdx,0x38(%rsp) / cmp $0x2,%ebx / je ... /
 *                  mov 0x8(%rax),%rcx / mov $0xa,%r8d / mov $0x0,%edx /
 *                  call strtol / mov %eax,%ecx / mov $0x2a,%edx /
 *                  call transform / cmp $0x1337,%eax / je ...
 * - Running the PE artifact on this machine: `keygate.exe 821` prints "correct"
 *   and exits 0; `keygate.exe 820` and `keygate.exe 100` print "wrong" and exit
 *   2; `keygate.exe` with no argument prints "usage: keygate <number>", exit 1.
 * - `strings keygate` shows only "correct", "wrong" and
 *   "usage: keygate <number>". The accepted number is in neither file.
 * - Syntax flavours, same instructions, same binary:
 *     objdump -d          ->  lea (%rdi,%rdi,2),%rax    mov %rsp,%rbp
 *     objdump -M intel -d ->  lea rax,[rdi+rdi*2]       mov rbp,rsp
 */
import type { Module } from '../../types/content';

export const x86AssemblyModule: Module = {
  id: 'x86-64-assembly',
  number: 4,
  title: 'x86-64 Assembly You Actually Need',
  tagline: 'The handful of instructions, sixteen registers and six flags that carry almost all compiled logic.',
  part: 2,
  lessons: [
    {
      id: 'registers-and-flags',
      title: 'Registers and Flags',
      blocks: [
        {
          type: 'prose',
          text: "x86-64 has over a thousand instructions. Compiled C uses a small fraction of them, over and over, and that fraction is learnable in an afternoon. This module teaches the working set: where values live, how a comparison is remembered, and how a decision gets made.",
        },
        {
          type: 'heading',
          text: 'Sixteen registers',
        },
        {
          type: 'prose',
          text: "The Intel manual states it plainly: in 64-bit mode there are **16 general purpose registers** and the default operand size is 32 bits. The 64-bit names are `RAX`, `RBX`, `RCX`, `RDX`, `RDI`, `RSI`, `RBP`, `RSP`, and `R8` through `R15`. The first eight carry names inherited from the 1980s; the last eight are simply numbered.",
        },
        {
          type: 'prose',
          text: "Each register can be used at four widths, and real disassembly mixes them freely. `RAX` is all 64 bits, `EAX` the low 32, `AX` the low 16, `AL` the low 8. When one line says `eax` and the next says `rax`, that is one register used two ways — not two registers.",
        },
        {
          type: 'table',
          headers: ['Width', 'Examples', 'Name in Table 3-2'],
          rows: [
            ['64-bit', '`RAX`, `RDI`, `R8`', 'Quadword register'],
            ['32-bit', '`EAX`, `EDI`, `R8D`', 'Doubleword register'],
            ['16-bit', '`AX`, `DI`, `R8W`', 'Word register'],
            ['8-bit', '`AL`, `DIL`, `R8B`', 'Byte register'],
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Two registers that are not general purpose in practice',
          text: "`RSP` always points at the top of the stack, and `RBP` usually points at the base of the current frame. The processor does not force `RBP` into that role, but compilers use it that way often enough that a function opening with `push %rbp` then `mov %rsp,%rbp` is announcing it set up a frame.",
        },
        {
          type: 'heading',
          text: 'Six flags carry every decision',
        },
        {
          type: 'prose',
          text: "Arithmetic leaves a record of its result in the flags register. Section 3.4.3.1 of the manual lists six status flags with their bit positions; four of them matter constantly when reading compiled code.",
        },
        {
          type: 'table',
          headers: ['Flag', 'Bit', 'Set when', 'Why it matters'],
          rows: [
            ['`ZF`', '6', 'The result is zero', 'Every equality test lands here'],
            ['`SF`', '7', 'Top bit of the result is 1', 'Sign of a signed result'],
            ['`CF`', '0', 'Carry or borrow out of the top bit', 'Unsigned overflow and unsigned compares'],
            ['`OF`', '11', 'Signed result does not fit', 'Signed overflow'],
            ['`PF`', '2', 'Low byte has an even number of 1 bits', 'Rare in compiler output'],
            ['`AF`', '4', 'Carry out of bit 3', 'Binary-coded decimal only'],
          ],
        },
        {
          type: 'heading',
          text: 'Compare, then jump',
        },
        {
          type: 'prose',
          text: "`CMP` is the workhorse, and the manual defines it exactly: the comparison is performed by **subtracting the second operand from the first**, setting the flags the same way `SUB` would — and then discarding the result. Nothing is stored. Only the flags change, and the next instruction reads them.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'The pattern behind almost every if statement',
          code: `cmp    $0x1337,%rax     ; subtract 0x1337 from rax, keep only the flags
je     target           ; jump if ZF = 1, meaning the subtraction gave zero`,
        },
        {
          type: 'prose',
          text: "Which flag a conditional jump reads is fixed by the architecture; Appendix B of the manual is the table worth knowing. A handful covers most code: `je` and `jz` test `ZF = 1`, `jne` and `jnz` test `ZF = 0`, `jb` tests `CF = 1`, `jae` tests `CF = 0`, and the signed pair `jl` and `jge` test `SF` against `OF`.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'The jump name leaks the C type',
          text: "The Jcc page says it outright: less and greater are the vocabulary for **signed** integers, above and below for **unsigned** ones. So `jg` here means the source compared signed values, and `ja` in the same place means it compared unsigned ones. You have just recovered a piece of the type system the compiler supposedly discarded.",
        },
        {
          type: 'quiz',
          id: 'm4-quiz-signedness',
          question: 'A comparison is followed by `ja`. What does that tell you about the two values?',
          options: [
            {
              text: 'They were treated as unsigned integers',
              correct: true,
              explanation: "Above and below are the unsigned vocabulary; `ja` tests CF together with ZF, which is an unsigned test.",
            },
            {
              text: 'They were treated as signed integers instead',
              correct: false,
              explanation: "Signed comparisons compile to the less and greater family — `jl`, `jle`, `jg`, `jge` — which test SF against OF.",
            },
            {
              text: 'They were floating-point values in xmm registers',
              correct: false,
              explanation: "Floating-point comparisons go through SSE instructions and a different flag path, not `cmp` followed by `ja`.",
            },
            {
              text: 'They were compared as raw sequences of bytes',
              correct: false,
              explanation: "Comparing byte sequences is a loop or a library call; one `cmp` compares two numbers in registers or memory.",
            },
          ],
        },
      ],
    },
    {
      id: 'instructions-that-matter',
      title: 'The Instructions That Carry Meaning',
      blocks: [
        {
          type: 'prose',
          text: "Here is a whole function out of this module's lab, disassembled with `objdump`. Three instructions do the work. Read them once now, then again after the explanation — the second read is the skill this module is for.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'objdump -d --no-show-raw-insn keygate',
          code: `0000000001001560 <transform>:
 1001560:  push   %rbp
 1001561:  mov    %rsp,%rbp
 1001564:  lea    (%rdi,%rdi,2),%rax
 1001568:  lea    0x2a(,%rax,2),%rax
 1001570:  xor    $0x5f,%rax
 1001574:  pop    %rbp
 1001575:  ret`,
        },
        {
          type: 'heading',
          text: 'Two syntaxes for the same bytes',
        },
        {
          type: 'prose',
          text: "Before reading further: that listing is in **AT&T syntax**, where the destination comes last. Ghidra, x64dbg and most Windows tooling show **Intel syntax**, where the destination comes first. Same bytes, same binary, opposite operand order — measured here on the lab file:",
        },
        {
          type: 'comparison',
          title: 'One instruction, two renderings',
          bad: {
            content: 'mov    %rsp,%rbp\nlea    (%rdi,%rdi,2),%rax',
            note: "AT&T, from `objdump -d`. Registers carry a `%`, immediates carry a `$`, and the destination is on the right.",
          },
          good: {
            content: 'mov    rbp,rsp\nlea    rax,[rdi+rdi*2]',
            note: "Intel, from `objdump -M intel -d`. No sigils, memory in brackets, destination on the left. Neither is more correct — know which one you are reading.",
          },
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The mistake this causes',
          text: "Reading `mov %rsp,%rbp` as if it were Intel syntax gives you the assignment backwards, and every conclusion built on it is wrong. When you open an unfamiliar tool, disassemble one `mov` involving `rsp` and check which side it lands on.",
        },
        {
          type: 'heading',
          text: 'lea is arithmetic, not addressing',
        },
        {
          type: 'prose',
          text: "`lea` computes an address expression but stores the **number** instead of loading from it. Compilers use it as a free multiply-and-add. `lea (%rdi,%rdi,2),%rax` means `rax = rdi + rdi*2`, which is `rdi * 3`. The next line, `lea 0x2a(,%rax,2),%rax`, means `rax = rax*2 + 0x2a`. Together they compute `rdi * 6 + 42` without a single `imul`.",
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Multiplication hides in plain sight',
          text: "Small constant multiplications rarely appear as `imul`. They appear as `lea` with a scale of 2, 4 or 8, as `shl` (a shift left by n multiplies by 2 to the n), or as a short chain of both. If you are hunting for a times-six, look for a times-three followed by a doubling.",
        },
        {
          type: 'heading',
          text: 'The working set',
        },
        {
          type: 'table',
          headers: ['Instruction', 'What it does', 'Seen in the lab as'],
          rows: [
            ['`mov`', 'Copy a value; never changes flags', '`mov %rax,%rdi`'],
            ['`lea`', 'Compute an address expression as a number', '`lea (%rdi,%rdi,2),%rax`'],
            ['`add` / `sub`', 'Arithmetic, and both set flags', '`add %ebx,%ebx`'],
            ['`xor`', 'Bitwise XOR; `xor %eax,%eax` is the idiom for zero', '`xor $0x5f,%rax`'],
            ['`cmp` / `test`', 'Set flags only — `cmp` subtracts, `test` ANDs', '`cmp $0x1337,%rax`'],
            ['`jcc`', 'Jump if the flags match the condition', '`jne 1001544`'],
            ['`setcc`', 'Write 1 or 0 into a byte register', '`setne %bl`'],
            ['`cmovcc`', 'Copy only if the condition holds', '`cmove %rax,%rdi`'],
            ['`call` / `ret`', 'Push the return address and jump, then return', '`call transform`'],
          ],
        },
        {
          type: 'heading',
          text: 'An if statement with no branch in it',
        },
        {
          type: 'prose',
          text: "The lab's `main` decides between two messages and two exit codes. At `-O1` the compiler emitted no branch at all for that decision — this is the real output, and it is worth working through line by line:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'The gate in main, AT&T syntax',
          code: `ubuntu:  xor    %ebx,%ebx                ; ebx = 0
         cmp    $0x1337,%rax             ; flags from rax - 0x1337
         setne  %bl                      ; bl = 1 if not equal, else 0
         lea    -0x1135(%rip),%rax       ; address of one string
         lea    -0x1134(%rip),%rdi       ; address of the other string
         cmove  %rax,%rdi                ; if equal, use the first instead
         add    %ebx,%ebx                ; ebx = 2 when wrong, 0 when right
         call   puts@plt
         mov    %ebx,%eax                ; return value`,
        },
        {
          type: 'prose',
          text: "`setne` turns the comparison into a 0 or a 1, `cmove` picks the message pointer, and `add %ebx,%ebx` doubles the flag into the exit code. Nothing jumps. If you go looking only for `jcc` to find decisions, you will walk straight past this — and past the exit codes it computes, which are `0` on success and `2` on failure.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Why compilers do this',
          text: "A mispredicted branch costs far more than an extra instruction, so optimisers replace short conditionals with `setcc` and `cmovcc`. For a reverse engineer the consequence is practical: a decision is anywhere the flags are consumed, not only where control flow splits.",
        },
        {
          type: 'quiz',
          id: 'm4-quiz-lea',
          question: 'What does `lea (%rdi,%rdi,2),%rax` leave in `rax`?',
          options: [
            {
              text: 'Three times the value in `rdi`',
              correct: true,
              explanation: "The expression is rdi + rdi*2. `lea` keeps the computed number rather than loading from that address.",
            },
            {
              text: 'The value stored two past `rdi`',
              correct: false,
              explanation: "That would be a `mov` from memory. `lea` computes the address expression and never dereferences it.",
            },
            {
              text: 'Twice the value held in `rdi`',
              correct: false,
              explanation: "The scale factor is 2, but the base register is added as well, so the result is three times rdi, not twice.",
            },
            {
              text: 'The address of the third array element',
              correct: false,
              explanation: "It can be used that way, but nothing here fixes an element size, so read it as arithmetic on a number.",
            },
          ],
        },
      ],
    },
    {
      id: 'calling-conventions',
      title: 'Two Calling Conventions',
      blocks: [
        {
          type: 'prose',
          text: "Nothing in the processor says which register holds a function's first argument. That is a convention, written down per platform, and the two that matter disagree. This is why the same C function looks different on Linux and on Windows — and why knowing both saves you from reading an argument out of the wrong register.",
        },
        {
          type: 'table',
          headers: ['', 'System V (Linux, macOS)', 'Microsoft x64 (Windows)'],
          rows: [
            ['Integer arguments, in order', '`RDI`, `RSI`, `RDX`, `RCX`, `R8`, `R9`', '`RCX`, `RDX`, `R8`, `R9`'],
            ['Floating-point arguments', '`xmm0` to `xmm7`', '`XMM0` to `XMM3`'],
            ['Integer return value', '`RAX`, then `RDX` for a second', '`RAX`'],
            ['Callee-saved', '`RBX`, `RBP`, `RSP`, `R12`-`R15`', '`RBX`, `RBP`, `RDI`, `RSI`, `RSP`, `R12`-`R15`'],
            ['Space the caller must reserve', 'none required', '32 bytes of shadow store, always'],
            ['Area usable below the stack pointer', '128-byte red zone', 'not defined by the document'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'RDI and RSI change sides',
          text: "Under System V, `RDI` and `RSI` carry the first two arguments. Under Microsoft x64 they are **callee-saved** — a function that uses them must restore them. The same two registers are scratch argument slots on one platform and protected state on the other.",
        },
        {
          type: 'heading',
          text: 'The same source, compiled twice',
        },
        {
          type: 'prose',
          text: "Both lab binaries come from one C file. The disassembly below is real output from this course's build machine, and the difference is entirely convention:",
        },
        {
          type: 'comparison',
          title: 'How main receives argc and argv',
          bad: {
            content: 'ELF, System V:\n  cmp    $0x2,%edi\n  mov    0x8(%rsi),%rdi',
            note: "`argc` arrives in `EDI` (first argument), `argv` in `RSI` (second), so `0x8(%rsi)` is `argv[1]`. No stack space is reserved for arguments.",
          },
          good: {
            content: 'PE, Microsoft x64:\n  sub    $0x20,%rsp\n  mov    %ecx,%ebx\n  mov    %rdx,0x38(%rsp)',
            note: "`argc` arrives in `ECX`, `argv` in `RDX`, and the first instruction reserves the mandatory 32 bytes (`0x20`) of shadow store. Same program, different register map.",
          },
        },
        {
          type: 'prose',
          text: "The call into the C library shows it again. `strtol(nptr, endptr, base)` takes three arguments, and each build loads them into its own platform's registers:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'strtol, called from each build',
          code: `System V (ELF)            Microsoft x64 (PE)
  mov  0x8(%rsi),%rdi       mov  0x8(%rax),%rcx     ; nptr
  xor  %esi,%esi            mov  $0x0,%edx          ; endptr = NULL
  mov  $0xa,%edx            mov  $0xa,%r8d          ; base = 10
  call strtol@plt           call strtol`,
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Reading arguments without guessing',
          text: "Identify the platform from the file format first — `MZ` means Microsoft x64, `0x7F ELF` means System V — then read the argument registers for that convention. Getting this backwards is one of the most common early mistakes, and it produces confident, wrong answers about what a function was called with.",
        },
        {
          type: 'heading',
          text: 'Shadow store and red zone',
        },
        {
          type: 'prose',
          text: "These two are easy to confuse and they are opposites. The Microsoft document requires the **caller** to allocate space for four register parameters before every call, even when the callee takes fewer — that is the `sub $0x20,%rsp` above. The System V document instead reserves **128 bytes beyond** the stack pointer, the red zone, which a leaf function may use as its whole frame without moving `RSP` at all.",
        },
        {
          type: 'prose',
          text: "Both facts pay off immediately when reading a prologue. A Windows function that subtracts `0x20` and nothing else has no locals; it reserved that space purely because the convention demands it. A Linux leaf function that touches `-8(%rsp)` without ever subtracting from `RSP` is using the red zone, not corrupting the stack.",
        },
        {
          type: 'quiz',
          id: 'm4-quiz-abi',
          question: 'One C function, compiled twice: its first argument arrives in `rdi` on Linux and in `rcx` on Windows. Why?',
          options: [
            {
              text: 'Each platform fixes its own calling convention',
              correct: true,
              explanation: "The hardware is identical; the register map is a documented per-platform agreement, System V on one side and Microsoft x64 on the other.",
            },
            {
              text: 'The Windows compiler optimised the call',
              correct: false,
              explanation: "No optimisation level changes it. Both compilers follow their platform's convention, because other code has to interoperate.",
            },
            {
              text: 'Windows runs 64-bit code in a compatibility mode',
              correct: false,
              explanation: "Both binaries are plain 64-bit code using the same 16 registers; only the assignment of arguments to registers differs.",
            },
            {
              text: 'The ELF format cannot encode `rcx` operands',
              correct: false,
              explanation: "A file format describes layout, not instructions. Either format can hold any instruction the processor executes.",
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
          text: "Two downloads, one C source file. The accepted number is stored nowhere in either binary — `strings` finds only three messages, and there is no encoded blob to brute-force. The only way in is to read the arithmetic and run it backwards.",
        },
        {
          type: 'quiz-set',
          id: 'm4-set-asm',
          title: 'Assembly literacy check',
          questions: [
            {
              type: 'quiz',
              id: 'm4-set-q-args',
              question: 'Under System V, which registers carry the first four integer arguments, in order?',
              options: [
                {
                  text: '`rdi`, `rsi`, `rdx`, `rcx`',
                  correct: true,
                  explanation: "The psABI names the sequence rdi, rsi, rdx, rcx, r8, r9 for the INTEGER class.",
                },
                {
                  text: '`rcx`, `rdx`, `r8`, `r9`',
                  correct: false,
                  explanation: "That is the Microsoft x64 order. Applying it to an ELF binary reads every argument out of the wrong register.",
                },
                {
                  text: '`rax`, `rbx`, `rcx`, `rdx`',
                  correct: false,
                  explanation: "Alphabetical order is not an ABI. `rax` carries the return value and `rbx` is callee-saved in both conventions.",
                },
                {
                  text: '`rbp`, `rsp`, `rsi`, `rdi`',
                  correct: false,
                  explanation: "`rbp` and `rsp` manage the stack frame; neither convention passes arguments in them.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm4-set-q-shadow',
              question: 'A Windows function begins `sub $0x20,%rsp` and never touches that space. What is it for?',
              options: [
                {
                  text: 'Shadow store the convention requires here',
                  correct: true,
                  explanation: "The Microsoft document requires the caller to reserve room for four register parameters, used or not.",
                },
                {
                  text: 'Local variables the optimiser left behind',
                  correct: false,
                  explanation: "Unused locals are removed, not reserved. The size being exactly 0x20 for four slots is the giveaway.",
                },
                {
                  text: 'The 128-byte red zone this platform uses',
                  correct: false,
                  explanation: "The red zone is a System V feature, it sits below the stack pointer, and 0x20 is 32 bytes rather than 128.",
                },
                {
                  text: 'Alignment padding required before any `call`',
                  correct: false,
                  explanation: "Alignment matters, but it would not fix the size at 32 bytes independently of the frame contents.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm4-set-q-cmp',
              question: 'What does `cmp` actually store?',
              options: [
                {
                  text: 'Nothing — it only updates the flags',
                  correct: true,
                  explanation: "It subtracts, sets flags the way SUB would, and discards the difference. That is why the next instruction must read the flags.",
                },
                {
                  text: 'The difference, placed in the first operand',
                  correct: false,
                  explanation: "That is `sub`. Mistaking `cmp` for `sub` invents a register write the code never made.",
                },
                {
                  text: 'A 1 or a 0, depending on the result',
                  correct: false,
                  explanation: "That is `setcc`, which reads flags a comparison already set and writes a byte.",
                },
                {
                  text: 'The difference, stored into the flags register',
                  correct: false,
                  explanation: "The flags hold six one-bit facts about the result, not the result itself.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm4-set-q-branchless',
              question: 'You find `setne` and `cmove` but no conditional jump. What happened?',
              options: [
                {
                  text: 'The decision was compiled without a branch',
                  correct: true,
                  explanation: "Short conditionals often become setcc plus cmovcc, which avoids a branch the processor might mispredict.",
                },
                {
                  text: 'The binary was deliberately obfuscated',
                  correct: false,
                  explanation: "This is ordinary optimiser output at -O1, and the lab binary has no obfuscation applied to it.",
                },
                {
                  text: 'The comparison result went unused here',
                  correct: false,
                  explanation: "It was used — `setne` consumes the flags, and `cmove` consumes the comparison a second time.",
                },
                {
                  text: 'The jump sits in a different function entirely',
                  correct: false,
                  explanation: "Control flow does not leave the function here; the whole decision is those two instructions.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm4-set-q-return',
              question: 'Which register holds a small integer return value under both conventions?',
              options: [
                {
                  text: '`rax`',
                  correct: true,
                  explanation: "Both documents name RAX for scalar returns, so a value in rax right after a `call` is the result.",
                },
                {
                  text: '`rdi`',
                  correct: false,
                  explanation: "`rdi` carries the first argument under System V and is callee-saved under Microsoft x64.",
                },
                {
                  text: '`rbx`',
                  correct: false,
                  explanation: "`rbx` is callee-saved in both conventions, which makes it useful for values kept across a call.",
                },
                {
                  text: '`rsp`',
                  correct: false,
                  explanation: "`rsp` is the stack pointer; overwriting it with a return value would destroy the frame.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm4-set-q-syntax',
              question: 'Your tool prints `mov rbp,rsp` and a colleague quotes `mov %rsp,%rbp`. Which is right?',
              options: [
                {
                  text: 'Both: Intel and AT&T syntax, one instruction',
                  correct: true,
                  explanation: "Same bytes rendered two ways: Intel puts the destination first, AT&T puts it last and adds sigils.",
                },
                {
                  text: 'Yours, because `rbp` must come first',
                  correct: false,
                  explanation: "Operand order is a property of the assembly notation, not of the instruction encoding.",
                },
                {
                  text: 'Theirs, because registers require a `%`',
                  correct: false,
                  explanation: "The `%` is AT&T notation. Intel syntax writes bare register names and is just as valid.",
                },
                {
                  text: 'Neither, since `rsp` cannot be copied directly',
                  correct: false,
                  explanation: "Copying `rsp` into `rbp` is the standard frame-pointer setup at the top of a function.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm4-set-q-flag',
              question: 'Which flag does `je` test?',
              options: [
                {
                  text: '`ZF`, the zero flag',
                  correct: true,
                  explanation: "Table B-1 gives E/Z as ZF = 1, so `je` fires when the subtraction produced zero — the operands were equal.",
                },
                {
                  text: '`CF`, the carry flag',
                  correct: false,
                  explanation: "`CF` drives the unsigned comparisons, `jb` and `jae`, not the equality test.",
                },
                {
                  text: '`SF`, the sign flag',
                  correct: false,
                  explanation: "`SF` carries the sign of the result and feeds the signed comparisons together with `OF`.",
                },
                {
                  text: '`OF`, the overflow flag',
                  correct: false,
                  explanation: "`OF` reports signed overflow; on its own it says nothing about whether two values matched.",
                },
              ],
            },
          ],
        },
        {
          type: 'lab',
          id: 'm4-lab-elf',
          title: 'Read the gate, invert the arithmetic',
          brief:
            "`keygate` is a Linux x86-64 binary that accepts exactly one number and prints `correct` for precisely one value. Nothing is hidden and nothing is encrypted — the accepted number simply never exists in the file. It is implied by three instructions inside `transform`, and your job is to run them backwards. You do not need Linux: every answer comes out of `objdump`.",
          format: 'ELF',
          tools: ['objdump', 'a calculator or python', '7-Zip'],
          download: { file: 'm04-elf-keygate.zip', password: 'reverse' },
          questions: [
            {
              id: 'xorimm',
              prompt: 'Which immediate value does `transform` XOR into the result?',
              accept: ['0x5f', '5f'],
              normalize: 'hex',
              hint: 'Run `objdump -d --no-show-raw-insn keygate` and read the three instructions between the prologue and `ret`.',
              explanation:
                "`xor $0x5f,%rax` is the last step of the transform, so inverting it is the first step of your solution — XOR is its own inverse.",
            },
            {
              id: 'target',
              prompt: 'Which constant is the return value of `transform` compared against?',
              accept: ['0x1337', '1337'],
              normalize: 'hex',
              hint: 'Look in `main`, just after the `call` to `transform`. One `cmp` with an immediate.',
              explanation:
                "`cmp $0x1337,%rax` is the gate. Everything you need is now on the table: the target value and the transform that has to produce it.",
            },
            {
              id: 'key',
              prompt: 'Which number, passed as the argument, makes the program print `correct`?',
              accept: ['821'],
              normalize: 'number',
              hint: 'Work backwards: undo the XOR with 0x5f, subtract the 0x2a that the second `lea` adds, then divide by six. The two `lea` instructions multiply by three and then by two.',
              explanation:
                "0x1337 XOR 0x5f is 0x1368, which is 4968. Subtracting 42 leaves 4926, and 4926 divided by 6 is 821. Confirmed by running the Windows twin in the next lab: `keygate.exe 821` prints `correct` and exits 0.",
            },
            {
              id: 'argv',
              prompt: 'Which register holds `argv` when `main` starts, in this binary?',
              accept: ['rsi'],
              normalize: 'text',
              hint: 'The instruction that fetches `argv[1]` is `mov 0x8(%rsi),%rdi`. Which convention does an ELF file follow?',
              explanation:
                "System V passes the second argument in `RSI`, so `argv` is there and `0x8(%rsi)` is `argv[1]`. In the Windows build of the same source it arrives in `RDX` instead.",
            },
            {
              id: 'wrongexit',
              prompt: 'Which exit code does the program return for a number that is not accepted?',
              accept: ['2'],
              normalize: 'number',
              hint: 'There is no `jcc` on that path. Follow `ebx`: it is zeroed, then `setne %bl` writes 1, then `add %ebx,%ebx` doubles it, and `mov %ebx,%eax` returns it.',
              explanation:
                "Wrong input gives `bl = 1`, doubled to 2, returned in `eax` — so the exit code is 2. A correct answer leaves 0 all the way through. Reading an exit code straight out of branchless arithmetic is exactly the literacy this module is for.",
            },
          ],
          walkthrough:
            "1. Unzip with the password above, then disassemble:\n     objdump -d --no-show-raw-insn keygate\n\n2. Find <transform>. The body is three instructions:\n     lea    (%rdi,%rdi,2),%rax     ; rax = rdi * 3\n     lea    0x2a(,%rax,2),%rax     ; rax = rax * 2 + 0x2a\n     xor    $0x5f,%rax             ; rax = rax XOR 0x5f\n   So transform(n) = ((n * 3) * 2 + 42) XOR 0x5f = (n * 6 + 42) XOR 0x5f.\n\n3. Find the gate in <main>:\n     cmp    $0x1337,%rax\n   The transform must produce 0x1337, which is 4919.\n\n4. Invert, one step at a time:\n     0x1337 XOR 0x5f = 0x1368 = 4968\n     4968 - 42        = 4926\n     4926 / 6         = 821\n\n   In python, if you prefer not to do it by hand:\n     >>> ((0x1337 ^ 0x5f) - 0x2a) // 6\n     821\n\n5. Confirm it on the Windows twin (the other lab, same source):\n     keygate.exe 821   -> correct   (exit 0)\n     keygate.exe 820   -> wrong     (exit 2)\n\nWhat to take from this: `strings` gave nothing, because the number was never\ndata. It existed only as the operands of three instructions. Any check built\nout of arithmetic rather than comparison against a stored value has to be read,\nnot searched for — and reading it is now something you can do.",
        },
        {
          type: 'lab',
          id: 'm4-lab-pe',
          title: 'The same gate under the other convention',
          brief:
            "`keygate.exe` is the **same C source** compiled for Windows. The logic is identical, so the accepted number has not changed — what changed is which registers carry what. This lab is about reading that difference off the file, and it is one you can actually run.",
          format: 'PE',
          tools: ['objdump', 'a terminal', '7-Zip'],
          download: { file: 'm04-pe-keygate.zip', password: 'reverse' },
          questions: [
            {
              id: 'argcreg',
              prompt: 'Which register does `main` read `argc` out of here?',
              accept: ['ecx', 'rcx'],
              normalize: 'text',
              hint: 'The third instruction of `main` copies it somewhere safe: `mov %ecx,%ebx`, and the later `cmp $0x2,%ebx` is the argument-count check.',
              explanation:
                "Microsoft x64 passes the first argument in `RCX`, and `argc` is an `int`, so it arrives in the low half, `ECX`. The ELF build of the same source used `EDI`.",
            },
            {
              id: 'shadow',
              prompt: 'How many bytes does `main` subtract from `rsp` on entry?',
              accept: ['32', '0x20'],
              normalize: 'number',
              hint: 'Second instruction of the function. Compare it against what the Microsoft convention says a caller must always reserve.',
              explanation:
                "`sub $0x20,%rsp` reserves 32 bytes: the shadow store for four register parameters, which the convention requires whether or not the callee needs it. The System V build reserves nothing equivalent.",
            },
            {
              id: 'saltreg',
              prompt: 'Which register carries the second argument into `transform` in this build?',
              accept: ['edx', 'rdx'],
              normalize: 'text',
              hint: 'Look immediately before `call transform`: `mov $0x2a,%edx`. In the ELF build the optimiser folded that same constant into an instruction operand instead.',
              explanation:
                "Microsoft x64 passes the second argument in `RDX`, here as `EDX` because the value is small. Comparing the two builds side by side is the cheapest way to fix both register maps in memory.",
            },
            {
              id: 'runexit',
              prompt: 'Run it with a number that is not accepted. What exit code do you get?',
              accept: ['2'],
              normalize: 'number',
              hint: 'In bash: `./keygate.exe 100; echo $?`. In cmd: `keygate.exe 100` then `echo %ERRORLEVEL%`.',
              explanation:
                "2, matching what the branchless arithmetic in the ELF lab predicted. Predicting a runtime value statically and then confirming it by running the program is the loop this course keeps returning to.",
            },
          ],
          walkthrough:
            "1. Unzip, then disassemble the two functions that matter:\n     objdump -d --no-show-raw-insn keygate.exe\n\n2. <main> opens with:\n     push   %rbx\n     sub    $0x20,%rsp        ; 32 bytes of mandatory shadow store\n     mov    %ecx,%ebx         ; argc, first argument, in ECX\n     mov    %rdx,0x38(%rsp)   ; argv, second argument, in RDX\n\n3. The call into transform:\n     mov    %eax,%ecx         ; first argument  -> ECX\n     mov    $0x2a,%edx        ; second argument -> EDX\n     call   transform\n\n4. <transform> itself, four instructions:\n     lea    (%rcx,%rcx,2),%eax\n     lea    (%rdx,%rax,2),%eax\n     xor    $0x5f,%eax\n     ret\n   Same arithmetic as the ELF build, different registers — and here the salt\n   really does arrive in a register rather than being folded into an operand.\n\n5. Run it:\n     ./keygate.exe 821; echo $?    -> correct, 0\n     ./keygate.exe 100; echo $?    -> wrong, 2\n     ./keygate.exe;     echo $?    -> usage: keygate <number>, 1\n\nThe pair is the lesson: one source file, one algorithm, two register maps. When\nyou open an unknown binary, the file format tells you which map to read it with\nbefore you interpret a single argument.",
        },
        {
          type: 'exercise',
          id: 'm4-ex-retarget',
          title: 'Change the target, find the new key',
          task: "Suppose the gate compared against `0x2000` instead of `0x1337`, with the same `transform`. Work out whether an accepted number still exists, and if so what it is. Show your steps, and say what it would mean for the program if no whole number satisfied it.",
          hint: 'Run the same inversion: XOR with 0x5f, subtract 0x2a, divide by 6 — and check whether that last division comes out exact.',
          answer:
            "0x2000 XOR 0x5f = 0x205f = 8287\n8287 - 42 = 8245\n8245 / 6 = 1374.166..., not a whole number\n\nSo no integer input can pass that gate. The program would compile and run\nperfectly, print `wrong` for every input, and look exactly like a working\nlicence check.",
          explanation: "This is worth doing once because it teaches what a gate really is: not a stored secret, but a constraint. Constraints can be unsatisfiable, and a binary cannot tell you that it is — only the arithmetic can. When you invert a check and the numbers refuse to come out, the next question is whether you misread an instruction or whether the check is genuinely dead.",
        },
        {
          type: 'exercise',
          id: 'm4-ex-prototype',
          title: 'Recover a prototype from a call site',
          task: "You are reading an ELF binary and you find a call site that sets `rdi`, `rsi` and `edx` before `call`, then compares `eax` against zero afterwards. Write down the most plausible C prototype for the callee, and list what you cannot know from this evidence alone.",
          hint: 'Count the argument registers used, note the width of each, and remember which register carries the return value.',
          answer:
            "Plausible prototype:\n    int f(void *a, void *b, int c);\n\nWhat the evidence gives:\n  - three arguments, because rdi, rsi and rdx were set (System V order)\n  - the third is 32 bits wide, because only edx was written\n  - a return value that fits in eax, tested against zero, so probably int\n\nWhat it does not give:\n  - whether the first two are pointers, longs, or anything else 64 bits wide\n  - whether the int return is a count, a boolean, or an error code\n  - the real parameter names, or any type names\n  - whether a fourth parameter exists that this caller left at a default",
          explanation: "Recovering a prototype is the most common small act of reverse engineering, and it is always partly inference. State what the evidence supports and what it does not; a note that says \"three arguments, third is 32-bit, returns int tested against zero\" is worth more later than a confident guess at names and types that turns out to be wrong.",
        },
      ],
    },
  ],
};
