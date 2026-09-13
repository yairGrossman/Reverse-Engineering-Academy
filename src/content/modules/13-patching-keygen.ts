/**
 * SOURCES (verified while writing this module):
 *
 * TOOL — Frida, installed here via `pip install frida-tools`; `frida --version`
 * reports 17.18.0. Note the Frida 17 module API: `Process.getModuleByName(name)`
 * returns a module whose `.base` is used for offsets; the older
 * `Module.getBaseAddress` raises "TypeError: not a function" (measured). The
 * course uses Frida only to observe and modify its OWN lab binary.
 *
 * MEASURED on the course build machine. Two labs from one algorithm:
 * serial(name) = ((sum of name bytes) * 1337 + 7) mod 100000.
 * - m13-pe-crackme/crackme.exe (mingw gcc 15.2.0, -O1). Keygen values computed
 *   independently and confirmed by running it:
 *     "ada"      -> 93085   -> `crackme.exe ada 93085`      prints "registered", exit 0
 *     "Reverser" -> 31109
 *     "alice"    -> 81877
 *   A wrong serial prints "not registered", exit 2; no args prints usage, exit 1.
 * - `objdump -d crackme.exe`: serial_for sums the name bytes then
 *   `imul $0x539,%edx,%edx` (0x539 = 1337) and `add $0x7,%edx`, matching the
 *   algorithm. main compares with `cmp %eax,%esi` then `je 140001504` — the je is
 *   a short jump, opcode 0x74, at file offset 0xAEF.
 * - PATCH, measured end to end: changing that 0x74 (je) to 0xEB (jmp short) makes
 *   the branch unconditional, so the patched binary prints "registered" for ANY
 *   serial — `crackme-patched.exe anyone 00000` -> "registered", exit 0 — while
 *   the original prints "not registered" for the same input.
 * - FRIDA, measured: hooking serial_for at module base + 0x1450 with
 *   Interceptor.attach and logging retval on onLeave printed
 *   "[frida] serial_for returned 93085" for `crackme.exe ada 00000`, matching the
 *   keygen — instrumentation reading the expected serial without patching.
 * - m13-net-crackme/crackme.dll (.NET 10.0.401): same algorithm.
 *   `dotnet crackme.dll ada 93085` -> "registered", exit 0; wrong -> "not
 *   registered", exit 2. ilspycmd recovered SerialFor exactly:
 *     "return (num * 1337 + 7) % 100000;"
 *   so the same keygen serial (93085 for "ada") works on both labs.
 */
import type { Module } from '../../types/content';

export const patchingModule: Module = {
  id: 'patching-keygen',
  number: 13,
  title: 'Patching, Keygenning and Instrumentation',
  tagline: 'Three ways to beat a check: change the lock, forge the key, or rewrite the rules while the program runs.',
  part: 4,
  lessons: [
    {
      id: 'patch-vs-keygen',
      title: 'Patch versus Keygen',
      blocks: [
        {
          type: 'callout',
          variant: 'warning',
          title: 'On your own binaries',
          text: "Patching and keygenning commercial software to bypass its licensing is the copyright violation module 1 described. Everything here is done on crackmes this course ships — binaries built to be broken. The skills are the same ones used to analyse malware and audit your own products; the target is what makes it legitimate.",
        },
        {
          type: 'prose',
          text: "A licence check compares something you supply against something the program expects. There are two fundamentally different ways to beat it, and choosing between them is the first decision of this module.",
        },
        {
          type: 'table',
          headers: ['', 'Patch', 'Keygen'],
          rows: [
            ['What you change', 'The program', 'Nothing — you generate a valid key'],
            ['What you need to understand', 'Where the decision is made', 'How the key is derived'],
            ['Result', 'A modified binary that accepts anything', 'The real key, on an untouched binary'],
            ['Survives an update?', 'No — the patch is undone', 'Often yes — a valid key stays valid'],
            ['Defeated by signing?', 'Yes — editing breaks the signature', 'No — the file is unchanged'],
          ],
        },
        {
          type: 'prose',
          text: "The lab's crackme derives the serial from the name: `serial(name) = (sum of the name's bytes * 1337 + 7) mod 100000`. Because that is invertible-per-name — you can compute it forwards for any name — it supports both attacks, and comparing them on one binary is the point.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'The check decides which attack is even possible',
          text: "This serial is computed, so a keygen exists. If instead the program compared against a value fetched from a server, or a hash with no feasible preimage, there would be no key to generate and patching would be the only route. Read the check first; it tells you whether a keygen is on the table at all.",
        },
        {
          type: 'quiz',
          id: 'm13-quiz-choice',
          question: 'A licence key is derived from the user’s name by a formula in the binary. Which attacks are possible?',
          options: [
            {
              text: 'Both a keygen and a patch',
              correct: true,
              explanation: "A derivable key means you can generate it, and the branch that checks it can also be patched.",
            },
            {
              text: 'A patch but not a keygen',
              correct: false,
              explanation: "A formula in the binary can be replicated, so a keygen is available in addition to patching.",
            },
            {
              text: 'A keygen but not a patch',
              correct: false,
              explanation: "The comparison is still a branch in the code, so patching remains possible too.",
            },
            {
              text: 'Neither, because it is derived',
              correct: false,
              explanation: "Derivation makes the key recoverable rather than unbreakable; both attacks apply.",
            },
          ],
        },
      ],
    },
    {
      id: 'the-keygen',
      title: 'Writing the Keygen',
      blocks: [
        {
          type: 'prose',
          text: "A keygen is the stronger demonstration: it proves you understood the algorithm well enough to run it forwards. Start by finding the derivation. In the PE crackme, `objdump -d` shows `serial_for` summing the name's bytes, then:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'serial_for, the arithmetic that matters',
          code: `imul   $0x539,%edx,%edx    ; sum * 0x539   (0x539 = 1337)
add    $0x7,%edx           ; + 7
...                        ; mod 100000, printed as %05u`,
        },
        {
          type: 'prose',
          text: "That is the whole formula: `(sum * 1337 + 7) mod 100000`. The `0x539` is the tell — an unusual multiplier you can read straight off the disassembly. Replicating it is a few lines in any language:",
        },
        {
          type: 'code',
          language: 'python',
          title: 'The keygen',
          code: `def serial_for(name):
    s = sum(name.encode())
    return f"{(s * 1337 + 7) % 100000:05d}"

print(serial_for("ada"))       # 93085`,
        },
        {
          type: 'prose',
          text: "Running the crackme with that output confirms it: `crackme.exe ada 93085` prints `registered`. And because the .NET crackme uses the same algorithm — ILSpy decompiles `SerialFor` to `return (num * 1337 + 7) % 100000;` — the very same serial works there too. One keygen, both binaries.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Why the managed lab makes the keygen easier, not different',
          text: "In the native binary you read the multiplier out of `imul $0x539`; in the .NET one ILSpy hands you `* 1337` in decimal. The recovery is easier because the metadata survived, but it is the same act — read the derivation, replicate it. The skill transfers exactly, which is the theme Part 3 established.",
        },
        {
          type: 'quiz',
          id: 'm13-quiz-keygen',
          question: 'What does writing a working keygen prove that a patch does not?',
          options: [
            {
              text: 'You understood the derivation itself',
              correct: true,
              explanation: "A keygen replicates the algorithm forwards, which requires understanding it, not just locating a branch.",
            },
            {
              text: 'The binary has no anti-debug check',
              correct: false,
              explanation: "Keygenning is unrelated to anti-debugging; a keygen can be written for a debugger-checking binary too.",
            },
            {
              text: 'The comparison uses a stored constant',
              correct: false,
              explanation: "A keygen applies precisely when the value is computed, not stored; the derivation is what you replicate.",
            },
            {
              text: 'The program was packed by UPX',
              correct: false,
              explanation: "Packing is a separate concern from how the key is derived; a keygen speaks to the algorithm only.",
            },
          ],
        },
      ],
    },
    {
      id: 'the-patch',
      title: 'Writing the Patch',
      blocks: [
        {
          type: 'prose',
          text: "A patch changes the program instead of supplying a key. It is the right choice when the check cannot be inverted — but here you can do it too, and doing both on one binary shows the contrast. The target is the comparison in `main`:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'The decision in main',
          code: `cmp    %eax,%esi              ; given vs expected
je     140001504 <main+0x67>  ; equal -> "registered"`,
        },
        {
          type: 'prose',
          text: "The `je` takes the success path only when the serials match. Change it to an **unconditional** jump and every serial succeeds. `je` short is opcode `0x74`; `jmp` short is `0xEB` — a one-byte change, at file offset `0xAEF` in this binary.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'Measured: one byte, and the lock is open',
          code: `file offset 0xAEF:  0x74 (je short)  ->  0xEB (jmp short)

original:  crackme.exe anyone 00000  ->  not registered  (exit 2)
patched:   crackme.exe anyone 00000  ->  registered      (exit 0)
patched:   crackme.exe whoever 12345 ->  registered      (exit 0)`,
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Two ways to neutralise a branch',
          text: "You can force the jump always taken (`je` to `jmp`, as here) or never taken (`je` to two `nop`s), depending on which path is the one you want. Reading which side of the branch prints success tells you which edit to make — get it backwards and you lock everyone out instead of letting everyone in.",
        },
        {
          type: 'prose',
          text: "The .NET crackme is patched the same way in spirit — flip the branch after the comparison, exactly as module 8 did — but remember module 8's two cautions: the runtime loads assemblies by name, and a strong-named assembly rejects edits. On the unsigned lab it just works; on signed software the patch is only half the job.",
        },
        {
          type: 'quiz',
          id: 'm13-quiz-patch',
          question: 'To make a check accept everything, you change `je` (0x74) to `jmp` (0xEB). What did that do?',
          options: [
            {
              text: 'Made the success jump unconditional',
              correct: true,
              explanation: "An unconditional jump always lands on the success path, regardless of how the comparison came out.",
            },
            {
              text: 'Skipped the comparison entirely',
              correct: false,
              explanation: "The `cmp` still runs; only the branch that reads its result was changed to ignore it.",
            },
            {
              text: 'Inverted the comparison operands',
              correct: false,
              explanation: "Operands are untouched; the edit is to the branch, not to what is being compared.",
            },
            {
              text: 'Disabled the licence check function',
              correct: false,
              explanation: "The check function still executes; the decision that used its result was forced one way.",
            },
          ],
        },
      ],
    },
    {
      id: 'instrumentation',
      title: 'Instrumentation with Frida',
      blocks: [
        {
          type: 'callout',
          variant: 'info',
          title: 'Setup for this lesson',
          text: "**Frida** installs with `pip install frida-tools`; this lesson measured its output from Frida 17.18.0. It injects a JavaScript engine into a running process so you can hook functions, read and change their arguments and return values, and log what happens — all without editing the file on disk.",
        },
        {
          type: 'prose',
          text: "Patching edits the file; instrumentation changes behaviour **at runtime**, leaving the file untouched. That makes it ideal for the case a static patch struggles with — a value computed at runtime, a check buried in a library, a decision you want to watch before you change it.",
        },
        {
          type: 'heading',
          text: 'Hooking to read a value',
        },
        {
          type: 'prose',
          text: "The simplest use is observation: hook the function that computes the serial and log what it returns. This recovers the expected serial for any name without reading a line of the algorithm — a third route to the same value the keygen computes.",
        },
        {
          type: 'code',
          language: 'javascript',
          title: 'hook.js — log serial_for’s return value',
          code: `const m = Process.getModuleByName('crackme.exe');
const serialFor = m.base.add(0x1450);   // serial_for RVA from objdump
Interceptor.attach(serialFor, {
  onLeave(retval) {
    console.log('[frida] serial_for returned ' + retval.toInt32());
  }
});`,
        },
        {
          type: 'code',
          language: 'text',
          title: 'Measured run',
          code: `$ frida -f crackme.exe -l hook.js -q -- ada 00000
Spawned crackme.exe. Resuming main thread!
[frida] serial_for returned 93085
not registered`,
        },
        {
          type: 'prose',
          text: "It printed `93085` — the expected serial for `ada` — even though the run used the wrong serial `00000` and ended up unregistered. The hook read the value on its way out of the function. Change `onLeave` to `retval.replace(...)` and you would be modifying the decision instead of watching it.",
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'A real version gotcha, measured',
          text: "Frida's API changes between major versions. On 17.x, `Process.getModuleByName(name).base` is how you get a module's base; the older `Module.getBaseAddress(name)` throws `TypeError: not a function`. A hook script copied from an old tutorial fails for exactly this reason — read the version you have, as with every tool in this course.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'When each of the three fits',
          text: "**Keygen** when the key is derivable and you want the binary untouched. **Patch** when the check cannot be inverted and you can accept modifying the file. **Instrumentation** when you need to observe or change behaviour at runtime — values that only exist while running, or a decision you want to study before committing to a patch. Most real work uses them together.",
        },
        {
          type: 'quiz',
          id: 'm13-quiz-frida',
          question: 'Frida logged the expected serial even though the run failed to register. How?',
          options: [
            {
              text: 'It read the return value live',
              correct: true,
              explanation: "The hook fired as the function returned, capturing the computed serial regardless of the run's outcome.",
            },
            {
              text: 'It patched the binary before running',
              correct: false,
              explanation: "Instrumentation leaves the file untouched; it injects into the live process instead of editing disk.",
            },
            {
              text: 'It decompiled the serial function',
              correct: false,
              explanation: "Decompilation is static; Frida observed the actual value the running function produced.",
            },
            {
              text: 'It brute-forced the serial space',
              correct: false,
              explanation: "No search happened; the hook simply read the one value the function computed for that name.",
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
          text: "Two crackmes, one algorithm — a native PE and a .NET assembly. Recover the serial for a given name (keygen), then defeat the check a second way (patch or Frida). Doing the same job three ways on the same logic is the whole point.",
        },
        {
          type: 'quiz-set',
          id: 'm13-set-patching',
          title: 'Patch, keygen, instrument check',
          questions: [
            {
              type: 'quiz',
              id: 'm13-set-q-patchkeygen',
              question: 'What is the core difference between a patch and a keygen?',
              options: [
                {
                  text: 'A patch edits code, a keygen makes keys',
                  correct: true,
                  explanation: "Patching modifies the binary to accept anything; a keygen leaves it untouched and produces a valid key.",
                },
                {
                  text: 'A patch is legal; a keygen is not',
                  correct: false,
                  explanation: "Legality depends on the target and permission, not on which technique you use.",
                },
                {
                  text: 'A keygen needs a debugger, a patch does not',
                  correct: false,
                  explanation: "Neither requires a debugger; both can be done from static analysis of the check.",
                },
                {
                  text: 'A patch works only on managed code',
                  correct: false,
                  explanation: "Patching applies to native and managed binaries alike, as both labs here show.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm13-set-q-multiplier',
              question: 'In the disassembly you see `imul $0x539`. Why does that stand out?',
              options: [
                {
                  text: 'It is the key derivation multiplier',
                  correct: true,
                  explanation: "0x539 is 1337, the unusual constant the serial formula multiplies by — a direct read for the keygen.",
                },
                {
                  text: 'It marks the start of the main function',
                  correct: false,
                  explanation: "Function starts are found by symbol or call target, not by an arithmetic constant.",
                },
                {
                  text: 'It is the compared serial value',
                  correct: false,
                  explanation: "The compared value is computed from it; the multiplier is part of the derivation, not the result.",
                },
                {
                  text: 'It is a standard library call number',
                  correct: false,
                  explanation: "`imul` is arithmetic on registers, not a call; the constant is an operand in the formula.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm13-set-q-branch',
              question: 'Changing `je` to `jmp` at the check does what?',
              options: [
                {
                  text: 'Takes the success path every time',
                  correct: true,
                  explanation: "An unconditional jump ignores the comparison and always lands on the registered branch.",
                },
                {
                  text: 'Removes the comparison instruction',
                  correct: false,
                  explanation: "The `cmp` remains; only the conditional branch after it becomes unconditional.",
                },
                {
                  text: 'Makes the program reject every key',
                  correct: false,
                  explanation: "That would be the opposite edit — neutralising the jump toward success, not forcing it.",
                },
                {
                  text: 'Crashes the program on a bad key',
                  correct: false,
                  explanation: "Both opcodes are valid one-byte branches; execution continues normally either way.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm13-set-q-frida',
              question: 'What does Frida let you do that patching the file does not?',
              options: [
                {
                  text: 'Change behaviour while it runs',
                  correct: true,
                  explanation: "It injects into the live process, so you can read or alter values at runtime without editing disk.",
                },
                {
                  text: 'Decompile the binary to source',
                  correct: false,
                  explanation: "That is a decompiler's job; Frida operates on a running process, not on producing source.",
                },
                {
                  text: 'Remove a strong-name signature',
                  correct: false,
                  explanation: "Frida does not re-sign anything; it hooks a process that is already running.",
                },
                {
                  text: 'Unpack a packed executable on disk',
                  correct: false,
                  explanation: "Unpacking dumps memory to a new file; Frida hooks behaviour rather than producing an unpacked binary.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm13-set-q-signed',
              question: 'Why might a keygen succeed where a patch fails on real software?',
              options: [
                {
                  text: 'A keygen leaves the file intact',
                  correct: true,
                  explanation: "Editing a signed binary breaks its signature; a keygen changes nothing, so signing does not block it.",
                },
                {
                  text: 'A keygen runs with higher privilege',
                  correct: false,
                  explanation: "Privilege is irrelevant; the advantage is that the file is never modified.",
                },
                {
                  text: 'A patch works on 32-bit code only',
                  correct: false,
                  explanation: "Patching works on 64-bit code too; the obstacle on signed software is the signature, not the bitness.",
                },
                {
                  text: 'A keygen bypasses the comparison',
                  correct: false,
                  explanation: "It satisfies the comparison honestly with a valid key rather than bypassing it.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm13-set-q-toolmatch',
              question: 'A licence value is computed at runtime from data you do not have in advance. Best first tool?',
              options: [
                {
                  text: 'Instrumentation to read it live',
                  correct: true,
                  explanation: "A runtime-only value is exactly what a hook captures, without needing to reproduce the derivation offline.",
                },
                {
                  text: 'A keygen written fully offline',
                  correct: false,
                  explanation: "You cannot replicate a computation whose inputs you do not have until run time.",
                },
                {
                  text: 'A static patch applied to the file',
                  correct: false,
                  explanation: "Patching may still help, but it does not reveal the runtime value you were asked to obtain.",
                },
                {
                  text: 'Unpacking it with `upx -d`',
                  correct: false,
                  explanation: "Unpacking addresses packing, which is a different problem from a runtime-computed value.",
                },
              ],
            },
          ],
        },
        {
          type: 'lab',
          id: 'm13-lab-pe-crackme',
          title: 'Native crackme: keygen it, then patch it',
          brief:
            "`crackme.exe` accepts a name and a serial, where the serial is derived from the name. Read the derivation and write a keygen, then defeat the check a second way by patching the branch. The same serial will work on the .NET crackme in the next lab.",
          format: 'PE',
          tools: ['objdump', 'Ghidra', 'a hex editor', 'Frida (optional)', '7-Zip'],
          download: { file: 'm13-pe-crackme.zip', password: 'reverse' },
          questions: [
            {
              id: 'multiplier',
              prompt: 'Which constant does serial_for multiply the name-byte sum by?',
              accept: ['1337', '0x539'],
              normalize: 'number',
              hint: 'Disassemble with `objdump -d crackme.exe` and find the `imul` in serial_for.',
              explanation:
                "1337 (0x539). The full formula is (sum of name bytes * 1337 + 7) mod 100000, read straight off the disassembly.",
            },
            {
              id: 'addend',
              prompt: 'Which constant is added after the multiply?',
              accept: ['7'],
              normalize: 'number',
              hint: 'The `add` immediately after the `imul`.',
              explanation:
                "7. It shifts every serial by a constant; forgetting it makes a keygen that is always off by seven.",
            },
            {
              id: 'serial',
              prompt: 'What serial registers the name `ada`? (five digits)',
              accept: ['93085'],
              normalize: 'number',
              hint: "sum of bytes of 'ada' is 97+100+97 = 294; then (294 * 1337 + 7) mod 100000.",
              explanation:
                "93085. `crackme.exe ada 93085` prints `registered`. That is the keygen output for that name.",
            },
            {
              id: 'jebyte',
              prompt: 'The success branch is a short `je`. What opcode byte would make it an unconditional `jmp`?',
              accept: ['0xeb', 'eb'],
              normalize: 'hex',
              hint: 'Short `je` is 0x74. Look up the opcode for a short unconditional jump.',
              explanation:
                "0xEB. Changing the 0x74 at file offset 0xAEF to 0xEB makes any serial register — the one-byte patch.",
            },
            {
              id: 'wrongexit',
              prompt: 'What exit code does the unpatched binary return for a wrong serial?',
              accept: ['2'],
              normalize: 'number',
              hint: 'Run `crackme.exe ada 00000; echo $?`.',
              explanation:
                "2, against 0 for a correct serial and 1 for the wrong number of arguments.",
            },
          ],
          walkthrough:
            "1. Unzip, then read the derivation:\n     objdump -d crackme.exe\n   In serial_for: sum the name bytes, then\n     imul $0x539,%edx,%edx   (1337)\n     add  $0x7,%edx          (+7)\n   and a mod 100000 printed as five digits.\n\n2. Keygen it:\n     def serial_for(name):\n         s = sum(name.encode())\n         return f\"{(s*1337+7) % 100000:05d}\"\n     serial_for('ada')  ->  93085\n   Confirm:\n     crackme.exe ada 93085   ->  registered   (exit 0)\n\n3. Patch it instead. Find the branch in main:\n     cmp %eax,%esi ; je 140001504\n   The je is a short jump, opcode 0x74, at file offset 0xAEF. Change it to 0xEB\n   (jmp short) in a hex editor:\n     crackme-patched.exe anyone 00000   ->  registered   (exit 0)\n\n4. (Optional) Watch it with Frida instead of touching the file:\n     const m = Process.getModuleByName('crackme.exe');\n     Interceptor.attach(m.base.add(0x1450), {\n       onLeave(r) { console.log('serial_for ->', r.toInt32()); }\n     });\n     frida -f crackme.exe -l hook.js -q -- ada 00000\n     ->  serial_for -> 93085\n\nKeygen, patch, hook: three routes, one check. Keep the keygen's output - you will\nreuse it on the .NET crackme.",
        },
        {
          type: 'lab',
          id: 'm13-lab-net-crackme',
          title: 'Managed crackme: same algorithm, easier read',
          brief:
            "`crackme.dll` is the .NET version of the same crackme. Decompile it with ILSpy, confirm the algorithm matches, and check that your keygen serial from the previous lab still works. Run it with `dotnet crackme.dll <name> <serial>`.",
          format: 'NET',
          tools: ['ILSpy or ilspycmd', '7-Zip'],
          download: { file: 'm13-net-crackme.zip', password: 'reverse' },
          questions: [
            {
              id: 'formula',
              prompt: 'What does SerialFor return, as the decompiled expression? (give the multiplier and addend as numbers, e.g. 1337 and 7)',
              accept: ['1337 7', '1337, 7', '1337 and 7'],
              normalize: 'text',
              hint: 'ilspycmd crackme.dll, read SerialFor. It is `(num * A + B) % 100000`.',
              explanation:
                "num * 1337 + 7, then mod 100000 — identical to the native crackme, which is why the same serial works on both.",
            },
            {
              id: 'serial',
              prompt: 'Which serial registers the name `ada` here?',
              accept: ['93085'],
              normalize: 'number',
              hint: 'The algorithm is the same as the PE lab, so the serial is the same.',
              explanation:
                "93085 — the same value, because the algorithm is identical. `dotnet crackme.dll ada 93085` prints `registered`.",
            },
            {
              id: 'exit',
              prompt: 'What exit code does a wrong serial return?',
              accept: ['2'],
              normalize: 'number',
              hint: 'Run `dotnet crackme.dll ada 00000; echo $?`.',
              explanation:
                "2, matching the native crackme. One algorithm, two runtimes, the same observable behaviour.",
            },
          ],
          walkthrough:
            "1. Unzip, then decompile:\n     ilspycmd crackme.dll\n   SerialFor reads:\n     int num = 0;\n     foreach (char c in name) num += (byte)c;\n     return (num * 1337 + 7) % 100000;\n   Identical to the native crackme.\n\n2. Reuse the keygen serial from the PE lab:\n     dotnet crackme.dll ada 93085   ->  registered   (exit 0)\n     dotnet crackme.dll ada 00000   ->  not registered (exit 2)\n\n3. To patch this one, flip the branch after the comparison in IL, exactly as\n   module 8 did - and remember module 8's cautions: run the patched copy in its\n   own directory (assemblies load by name), and a strong-named assembly would\n   reject the edit. The lab dll is unsigned, so the patch just works.\n\nThe pair proves the module's thesis: the derivation is the same idea in x86 and\nin IL. Recovering it was easier here only because the metadata survived.",
        },
        {
          type: 'exercise',
          id: 'm13-ex-general-keygen',
          title: 'Make the keygen work for any name',
          task: "Extend the keygen so it takes any name on the command line and prints its serial. Test it against the crackme with three different names, and note what happens for a name containing a non-ASCII character. Explain that last result in terms of what serial_for actually sums.",
          hint: 'serial_for sums the raw bytes of the name. How your language encodes a non-ASCII character decides how many bytes, and which, get summed.',
          answer:
            "    import sys\n    def serial_for(name):\n        s = sum(name.encode())          # raw bytes\n        return f\"{(s*1337+7) % 100000:05d}\"\n    print(serial_for(sys.argv[1]))\n\nTested: ada->93085, Reverser->31109, alice->81877, each accepted by the crackme.\n\nNon-ASCII: a character like 'e-acute' encodes to two bytes in UTF-8, so the sum\nincludes both, and the serial differs from what a single-byte encoding would\ngive. The crackme sums the bytes it actually receives on the command line, so\nthe keygen must encode the name the same way the program reads it - otherwise the\nsums, and the serials, disagree.",
          explanation: "The non-ASCII case is the subtle part and worth meeting once: a keygen must model not just the arithmetic but the exact bytes the target consumes. `serial_for` sums bytes, not characters, so encoding is part of the algorithm. This is a recurring trap - a keygen that is 'correct' on the maths but wrong on the byte representation fails on precisely the inputs that exercise the difference.",
        },
        {
          type: 'exercise',
          id: 'm13-ex-choose',
          title: 'Choose the tool for four scenarios',
          task: "For each of these, say whether you would reach for a keygen, a patch, or instrumentation, and why: (a) the serial is derived from the name by a formula; (b) the program checks the serial against a value downloaded from a server; (c) the serial is checked inside a strong-named .NET assembly you may modify; (d) you need the exact value a runtime-only computation produces, to reuse elsewhere.",
          hint: 'Match each to the property that decides it: derivable, non-invertible, signed, runtime-only.',
          answer:
            "(a) Keygen - the formula is in the binary, so replicate it and leave the file\n    untouched.\n(b) Patch (or instrumentation) - the expected value comes from a server, so\n    there is nothing to derive; change the branch, or hook the comparison.\n(c) Keygen if the serial is derivable, because editing a strong-named assembly\n    breaks its signature; a patch would additionally require re-signing.\n(d) Instrumentation - a runtime-only value is exactly what a hook reads, and you\n    capture it directly rather than reconstructing it.",
          explanation: "The decision is driven by a property of the check, not by preference: derivable favours a keygen, non-invertible forces a patch or a hook, signing penalises patching, and runtime-only values call for instrumentation. Reading the check well enough to classify it is what lets you pick the cheapest working attack instead of grinding on the wrong one.",
        },
      ],
    },
  ],
};
