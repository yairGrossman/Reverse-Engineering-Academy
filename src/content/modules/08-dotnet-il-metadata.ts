/**
 * SOURCES (verified while writing this module):
 *
 * FETCHED — ECMA-335, 6th edition, June 2012 (the standard), downloaded and read
 * as ecma335.pdf via pdftotext; discharges recorded failure 4 by pairing it with
 * the augments document below:
 * - Partition II §24.2.1, metadata root: "Offset 0, Size 4, Signature — Magic
 *   signature for physical metadata : 0x424A5342." (0x424A5342 is the ASCII
 *   "BSJB".) The root "starts with a magic signature, several bytes of version
 *   and other miscellaneous information, followed by a count and an array of
 *   stream headers".
 * - Partition II §25.3.3, CLI header: "Offset 0 Cb — Size of the header in bytes;
 *   Offset 8 MetaData — RVA and size of the physical metadata (§II.24)." Found
 *   "using CLI Header directory entry in the PE header".
 * - Partition I §12.3.2.1, the evaluation stack: "The evaluation stack is made up
 *   of slots that can hold any data type ... The type state of the stack (the
 *   stack depth and types of each element on the stack) at any given point in a
 *   program shall be identical for all possible control flow paths."
 *
 * FETCHED — dotnet/runtime ECMA-335 augments, because the standard is from 2012
 * and the SDK is .NET 10 (failure 4):
 * - https://github.com/dotnet/runtime/blob/main/docs/design/specs/Ecma-335-Augments.md
 *   "This is a list of additions and edits to be made in ECMA-335 specifications.
 *   It includes both documentation of new runtime features and issues encountered
 *   during development." It lists feature areas absent from the 2012 text —
 *   Module Initializer, Default Interface Methods, Static Interface Methods,
 *   Covariant Return Types, Ref fields, ByRefLike types in generics — so any
 *   claim about those must cite the augments, not the base standard. This module
 *   sticks to the stable core (metadata root, CLI header, the stack model), which
 *   both documents agree on.
 *
 * MEASURED on the course build machine, .NET SDK 10.0.401 and ilspycmd 11.0.0.9375
 * (ICSharpCode.Decompiler 11.0.0.9375):
 * - Two labs. m08-net-keycheck (already in the repo) stores its key as a const;
 *   m08-net-licence (added for this module) stores only a table and a transform.
 *   Both build with `dotnet build -c Release` via labs/build.mjs.
 * - keycheck.dll behaviour: `dotnet keycheck.dll RA-2F81-KOBOLD` -> "valid",
 *   exit 0; a wrong key -> "invalid", exit 2; no argument -> "usage: keycheck
 *   <key>", exit 1.
 * - Plain ASCII `strings keycheck.dll` does NOT contain the key; `strings -e l`
 *   (UTF-16LE) prints "RA-2F81-KOBOLD", "usage: keycheck <key>", "valid",
 *   "invalid". .NET user strings live in the #US heap as UTF-16.
 * - Metadata root, read directly: "BSJB" (0x42 0x53 0x4A 0x42) at file offset
 *   0x2E8 in licence.dll, version string "v4.0.30319" — matching ECMA-335's
 *   0x424A5342 signature.
 * - ilspycmd licence.dll recovered near-source C#, including
 *   `private static readonly byte[] Expected = new byte[10] { 127, 111, 101, 102,
 *   98, 86, 112, 75, 99, 94 };` and the loop
 *   `if ((byte)((candidate[i] + i * 5) ^ 0x3B) != Expected[i])`.
 * - ilspycmd -il licence.dll showed the Check loop in IL: get_Chars, ldc.i4.5,
 *   mul, add, ldc.i4.s 59, xor, conv.u1, then beq.s; and Main's decision at
 *   IL_0018 as `brfalse.s` (opcode 0x2C).
 * - The key recovers by inverting the transform: for each i,
 *   chr(((table[i] ^ 0x3B) - i*5) & 0xFF). Table 7F 6F 65 66 62 56 70 4B 63 5E
 *   gives "DOTNET-M08". `dotnet licence.dll DOTNET-M08` -> "licence ok", exit 0;
 *   a wrong key -> "licence rejected", exit 2.
 * - Patch, measured end to end: the `brfalse.s` at Main IL_0018 is at file offset
 *   0x2B4 (Main's IL starts at RVA 0x209C, section .text). Changing that one byte
 *   from 0x2C (brfalse.s) to 0x2D (brtrue.s) inverts the check — the patched
 *   assembly prints "licence rejected" for the real key and "licence ok" for a
 *   wrong one. ilspycmd on the patched file confirms IL_0018 now reads brtrue.s.
 * - The runtime resolves an assembly by NAME, so a copy renamed
 *   licence-patched.dll still loaded the original next to it; running the patched
 *   bytes required putting them in their own directory under the original name.
 *   This is quoted in the lesson as a real gotcha.
 */
import type { Module } from '../../types/content';

export const dotnetModule: Module = {
  id: 'dotnet-il-metadata',
  number: 8,
  title: '.NET — IL, Metadata, and Patching',
  tagline: 'Managed code decompiles almost back to source, because the compiler kept the very information native builds throw away.',
  part: 3,
  lessons: [
    {
      id: 'managed-is-different',
      title: 'Why Managed Code Gives So Much Back',
      blocks: [
        {
          type: 'callout',
          variant: 'info',
          title: 'Setup for this module',
          text: "Install **ILSpy**, or its command-line form **ilspycmd** (`dotnet tool install --global ilspycmd`), which this module measured its output from. dnSpy is a popular alternative that also edits. You do not need the .NET SDK to analyse a managed binary, only to build one.",
        },
        {
          type: 'prose',
          text: "Part 2 was about native code, where the compiler destroys almost everything. A .NET assembly is the opposite. The C# compiler does not produce machine code; it produces **Intermediate Language** plus a rich **metadata** table describing every type, method and field by name. That metadata has to survive, because the runtime needs it to work — which means it survives for you too.",
        },
        {
          type: 'heading',
          text: 'The difference, in one screenful',
        },
        {
          type: 'prose',
          text: "This is `ilspycmd` output for the second lab in this module. Compare it against what Ghidra gave you for a native binary in module 5 — placeholder names and invented types. Here the names are real:",
        },
        {
          type: 'code',
          language: 'csharp',
          title: 'ilspycmd licence.dll — the decompiled Check method',
          code: `private static readonly byte[] Expected = new byte[10] { 127, 111, 101, 102, 98, 86, 112, 75, 99, 94 };

private static bool Check(string candidate)
{
    if (candidate.Length != Expected.Length)
    {
        return false;
    }
    for (int i = 0; i < Expected.Length; i++)
    {
        if ((byte)((candidate[i] + i * 5) ^ 0x3B) != Expected[i])
        {
            return false;
        }
    }
    return true;
}`,
        },
        {
          type: 'prose',
          text: "The method name `Check`, the field name `Expected`, the parameter `candidate` — none of that was reconstructed or guessed. It was read out of the metadata, where the compiler stored it so the runtime could bind calls by name. The decompiler's job here is closer to formatting than to reverse engineering.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Why the names have to be there',
          text: "The CLI resolves methods, fields and types by metadata token at runtime, and reflection lets a program ask for them by name while it runs. Stripping the names the way a C compiler strips symbols would break the runtime. Obfuscators exist precisely to rename things back to noise — and when you meet one in module 12, this is the information it is destroying.",
        },
        {
          type: 'heading',
          text: 'strings lies about a .NET assembly',
        },
        {
          type: 'prose',
          text: "Reach for `strings` out of habit and a managed binary will fool you. The first lab, `keycheck.dll`, stores its key as an ordinary string constant — yet plain `strings` finds nothing:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'Measured: the same file, two ways',
          code: `$ strings keycheck.dll | grep RA-2F81
(nothing)

$ strings -e l keycheck.dll | grep RA-2F81
RA-2F81-KOBOLD`,
        },
        {
          type: 'prose',
          text: "The key is there in plain sight — as **UTF-16**. .NET user strings live in a metadata stream where each character is two bytes, so a tool scanning for runs of single-byte ASCII walks straight past them. `strings -e l` reads little-endian 16-bit, and there it is.",
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The habit to build',
          text: "On any managed file, run `strings -e l` as well as plain `strings`, or better, open it in ILSpy where the string heap is decoded for you. Concluding \"no interesting strings\" from ASCII alone is a mistake specific to this format, and an easy one.",
        },
        {
          type: 'quiz',
          id: 'm8-quiz-names',
          question: 'Why does a .NET decompiler recover real method and field names when a native one cannot?',
          options: [
            {
              text: 'The runtime needs that metadata to work',
              correct: true,
              explanation: "The CLI binds calls by name at run time, so the names are kept in metadata rather than discarded.",
            },
            {
              text: 'ILSpy guesses names from how things are used',
              correct: false,
              explanation: "It does invent names when they are genuinely missing, but here it is reading names that were stored.",
            },
            {
              text: 'C# compilers optimise less than C compilers',
              correct: false,
              explanation: "Optimisation level is not the reason; the metadata would be present even in a release build, as this lab is.",
            },
            {
              text: 'The assembly still contains its source file',
              correct: false,
              explanation: "No source is embedded. The names come from metadata tables, which are not the same as source code.",
            },
          ],
        },
      ],
    },
    {
      id: 'il-and-metadata',
      title: 'IL and the Metadata Root',
      blocks: [
        {
          type: 'prose',
          text: "Under the near-source C# is the actual content of the file: a stack-based instruction set and a set of metadata tables. You will not often read IL line by line — the decompiler is too good — but you need to recognise it, because patching happens at this level and obfuscated code sometimes only decompiles this far.",
        },
        {
          type: 'heading',
          text: 'IL is a stack machine',
        },
        {
          type: 'prose',
          text: "x86 works on registers; IL works on an **evaluation stack**. ECMA-335 defines it precisely, including a rule that matters for analysis: the stack depth and the type of each slot at any point \"shall be identical for all possible control flow paths\". You cannot have a value on the stack down one branch and not the other. That rigidity is why IL is verifiable and why decompilers do so well on it.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'ilspycmd -il licence.dll — the transform, in IL',
          code: `IL_0015: ldarg.0                         // candidate
IL_0016: ldloc.0                         // i
IL_0017: callvirt String::get_Chars(int32)   // candidate[i]
IL_001c: ldloc.0                         // i
IL_001d: ldc.i4.5                        // 5
IL_001e: mul                             // i * 5
IL_001f: add                             // candidate[i] + i*5
IL_0020: ldc.i4.s 59                     // 0x3B
IL_0022: xor                             // ^ 0x3B
IL_0023: conv.u1                         // (byte)
IL_0024: ldsfld  Expected
IL_0029: ldloc.0
IL_002a: ldelem.u1                       // Expected[i]
IL_002b: beq.s   IL_002f                 // equal? keep going`,
        },
        {
          type: 'prose',
          text: "Read top to bottom, tracking the stack: push the character, push `i`, push 5, `mul` replaces the top two with their product, `add` folds in the character, `xor` with `0x3B`, narrow to a byte, then push the table entry and compare. It is the same arithmetic as the C#, one push or operation per line. Every constant you need to invert the check — the `5`, the `0x3B`, the table — is visible.",
        },
        {
          type: 'heading',
          text: 'Finding the metadata, the way the runtime does',
        },
        {
          type: 'prose',
          text: "A .NET assembly is a PE file — everything from module 7 still applies — with one extra directory entry pointing at the CLI header. ECMA-335 says the CLI header's `MetaData` field is an \"RVA and size of the physical metadata\", and that metadata begins with a magic signature: **0x424A5342**. Those four bytes spell `BSJB` (for the four Microsoft engineers who designed it).",
        },
        {
          type: 'code',
          language: 'text',
          title: 'Measured: the metadata root in licence.dll',
          code: `BSJB at file offset 0x2E8
42 53 4A 42 01 00 01 00 00 00 00 00 0c 00 00 00
B  S  J  B  <-- 0x424A5342, the signature ECMA-335 specifies
version string: "v4.0.30319"`,
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'This is how you know it is managed at all',
          text: "A file can carry `MZ` and `PE\\0\\0` and still be a .NET assembly rather than a native one. The tell is the CLI header directory entry and the `BSJB` metadata root. When module 12's file-triage instincts say \"PE\", the follow-up question is always \"native or managed?\", and the `BSJB` signature answers it.",
        },
        {
          type: 'quiz',
          id: 'm8-quiz-stack',
          question: 'In the IL `ldloc.0`, `ldc.i4.5`, `mul`, what is on the stack after `mul`?',
          options: [
            {
              text: 'One value: local 0 times five',
              correct: true,
              explanation: "`mul` pops the two pushed values and pushes their product, so the stack is one deeper than before the sequence.",
            },
            {
              text: 'Two values: local 0 and five',
              correct: false,
              explanation: "Those were the inputs to `mul`; it consumes both and leaves only the result.",
            },
            {
              text: 'Three values, including the product',
              correct: false,
              explanation: "A binary operation removes its two operands before pushing one result, so the net change is minus one.",
            },
            {
              text: 'Nothing: `mul` writes to a local',
              correct: false,
              explanation: "IL arithmetic works on the stack, not on locals; storing to a local would need an explicit `stloc`.",
            },
          ],
        },
      ],
    },
    {
      id: 'patching-il',
      title: 'Patching a Single IL Byte',
      blocks: [
        {
          type: 'prose',
          text: "Because IL is simpler and more regular than x86, patching it is often a one-byte change. This module's second lab makes a licence decision at a single branch, and flipping that branch inverts the whole program. Everything here was done and measured, not described from theory.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'The decision in Main, as IL',
          code: `IL_0013: call bool Program::Check(string)
IL_0018: brfalse.s IL_0026        // if Check returned false, jump to "rejected"
IL_001a: ldstr "licence ok"
...
IL_0026: ldstr "licence rejected"`,
        },
        {
          type: 'prose',
          text: "`brfalse.s` branches to the rejection message when `Check` returned false. Its opcode is `0x2C`. The opcode for `brtrue.s` — branch when true — is `0x2D`, one greater. Change that single byte and the program keeps every good key out and lets every bad one in.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'Measured: one byte, opposite behaviour',
          code: `Main's IL starts at RVA 0x209C; IL_0018 is at file offset 0x2B4.
byte there: 0x2C  (brfalse.s)  ->  patched to 0x2D  (brtrue.s)

original licence.dll:
  DOTNET-M08   -> licence ok        (exit 0)
  NONSENSE12   -> licence rejected  (exit 2)

patched (the one byte changed):
  DOTNET-M08   -> licence rejected  (exit 2)
  NONSENSE12   -> licence ok        (exit 0)`,
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The gotcha that wastes an hour: assemblies load by name',
          text: "The patched copy was first saved as `licence-patched.dll` beside the original and run — and it behaved exactly like the original. The .NET runtime resolves an assembly by its **name**, found the unpatched `licence.dll` next door, and loaded that instead. The patched bytes only took effect once they were placed in their own directory under the original name. A patch that seems to do nothing is often a patch that was never loaded.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Patch versus keygen, previewed',
          text: "You just changed the program to accept anything — a **patch**. You could instead have inverted the transform to recover the one key it wants — a **keygen**. Both are legitimate analysis outcomes on your own binary, and module 13 develops the distinction. A patch changes the lock; a keygen makes the key.",
        },
        {
          type: 'prose',
          text: "One caution specific to real assemblies: many are **strong-name signed**, and editing a byte invalidates the signature. A loader that enforces the signature will then refuse the file. The lab assemblies are unsigned so the patch just works, but on a signed target the patch is only half the job — the other half is module 12's subject.",
        },
        {
          type: 'quiz',
          id: 'm8-quiz-patch',
          question: 'You patch `brfalse.s` to `brtrue.s` in a copy of an assembly, run it, and nothing changes. Most likely cause?',
          options: [
            {
              text: 'The runtime loaded the original assembly',
              correct: true,
              explanation: "Assemblies resolve by name, so an unpatched copy in the same directory gets loaded instead of your edit.",
            },
            {
              text: 'IL cannot be patched without recompiling',
              correct: false,
              explanation: "It can, and this lab proves it: a single byte in the file changes the branch the runtime takes.",
            },
            {
              text: 'The two opcodes are actually identical',
              correct: false,
              explanation: "They differ by one — 0x2C against 0x2D — and mean opposite things, branch-if-false versus branch-if-true.",
            },
            {
              text: 'The metadata checksum rejected the change',
              correct: false,
              explanation: "An unsigned assembly has no such enforcement; strong-name signing would refuse the file outright rather than ignore the edit.",
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
          text: "Two assemblies. The first hands you its key once you know where .NET keeps strings. The second stores no key at all, so you decompile it, read the transform, and invert it — then, if you like, patch the branch instead and defeat it without knowing the key at all.",
        },
        {
          type: 'quiz-set',
          id: 'm8-set-dotnet',
          title: 'Managed code check',
          questions: [
            {
              type: 'quiz',
              id: 'm8-set-q-strings',
              question: 'Plain `strings` finds nothing in a .NET assembly you know prints messages. Why?',
              options: [
                {
                  text: 'Its strings are stored as UTF-16',
                  correct: true,
                  explanation: "The user-string heap holds two-byte characters, so a scan for single-byte ASCII runs skips them.",
                },
                {
                  text: 'The assembly is encrypted on disk',
                  correct: false,
                  explanation: "Nothing here is encrypted; `strings -e l` reads the very same bytes as UTF-16 and finds them.",
                },
                {
                  text: 'The strings were stripped at build time',
                  correct: false,
                  explanation: "They are present and printed at runtime; they are simply in a wider encoding than plain strings expects.",
                },
                {
                  text: 'They live in a compressed metadata stream',
                  correct: false,
                  explanation: "The heaps are not compressed; the encoding, not compression, is what defeats a naive scan.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm8-set-q-il',
              question: 'What kind of instruction set is IL?',
              options: [
                {
                  text: 'A stack machine with typed slots',
                  correct: true,
                  explanation: "Operands are pushed and popped, and the stack's type state must match across all control-flow paths.",
                },
                {
                  text: 'A register machine like x86-64',
                  correct: false,
                  explanation: "IL has no general registers; values live on the evaluation stack and in named locals.",
                },
                {
                  text: 'Raw machine code for a CLI chip',
                  correct: false,
                  explanation: "No processor runs IL directly; the runtime JIT-compiles it to native code first.",
                },
                {
                  text: 'A text format the runtime parses',
                  correct: false,
                  explanation: "IL is binary in the file; the readable mnemonics are a disassembly the way x86 mnemonics are.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm8-set-q-bsjb',
              question: 'What does the signature `BSJB` (0x424A5342) mark?',
              options: [
                {
                  text: 'The start of the metadata root',
                  correct: true,
                  explanation: "ECMA-335 gives 0x424A5342 as the physical metadata signature; finding it confirms a managed image.",
                },
                {
                  text: 'The entry point of the assembly',
                  correct: false,
                  explanation: "The entry point is a method token in the CLI header, not a signature in the byte stream.",
                },
                {
                  text: 'The beginning of the IL code stream',
                  correct: false,
                  explanation: "Method bodies live in a section referenced by RVA; BSJB marks metadata, not code.",
                },
                {
                  text: 'The PE optional header magic',
                  correct: false,
                  explanation: "That is 0x020B for PE32+, a different value in a different structure from module 7.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm8-set-q-obf',
              question: 'Why do .NET obfuscators rename methods and fields to gibberish?',
              options: [
                {
                  text: 'Because the real names ship in metadata',
                  correct: true,
                  explanation: "Managed binaries carry readable names by necessity, so hiding them means overwriting them deliberately.",
                },
                {
                  text: 'Because renaming shrinks the assembly',
                  correct: false,
                  explanation: "Any size change is incidental; the purpose is to destroy the readability the format otherwise gives away.",
                },
                {
                  text: 'Because the runtime runs renamed code faster',
                  correct: false,
                  explanation: "Names are resolved to tokens; their spelling has no effect on execution speed.",
                },
                {
                  text: 'Because short names are required by the CLI',
                  correct: false,
                  explanation: "The CLI imposes no such requirement; original names are perfectly legal and usual.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm8-set-q-branch',
              question: '`brfalse.s` is 0x2C and `brtrue.s` is 0x2D. What does swapping them do to a check?',
              options: [
                {
                  text: 'Inverts which result passes',
                  correct: true,
                  explanation: "The branch now fires on the opposite condition, so accepted and rejected inputs trade places.",
                },
                {
                  text: 'Disables the branch entirely',
                  correct: false,
                  explanation: "The branch still executes; it simply tests the opposite truth value of the same result.",
                },
                {
                  text: 'Skips the comparison before it',
                  correct: false,
                  explanation: "The `call` to the check still runs; only the interpretation of its boolean result flips.",
                },
                {
                  text: 'Corrupts the method past loading',
                  correct: false,
                  explanation: "Both are valid one-byte short branches, so the method stays verifiable and runs fine.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm8-set-q-loadname',
              question: 'What is the safest way to run a patched assembly and be sure your bytes ran?',
              options: [
                {
                  text: 'Isolate it in its own directory',
                  correct: true,
                  explanation: "Name resolution cannot then find an unpatched copy nearby to load in preference to yours.",
                },
                {
                  text: 'Rename the patched file distinctively',
                  correct: false,
                  explanation: "A new filename does not help; the runtime binds by assembly name and finds the original beside it.",
                },
                {
                  text: 'Clear the machine assembly cache first',
                  correct: false,
                  explanation: "A local app does not resolve through a global cache here; the neighbour file is the real problem.",
                },
                {
                  text: 'Run it with administrator privileges',
                  correct: false,
                  explanation: "Privilege has no bearing on which of two same-named assemblies the loader chooses.",
                },
              ],
            },
          ],
        },
        {
          type: 'lab',
          id: 'm8-lab-keycheck',
          title: 'The key is a string — once you know where .NET keeps it',
          brief:
            "`keycheck.dll` is a small .NET console assembly that validates a licence key held as a constant. Plain `strings` will disappoint you; the point of this first lab is to learn where a managed binary actually keeps its text. Run it with `dotnet keycheck.dll`.",
          format: 'NET',
          tools: ['ILSpy or ilspycmd', 'strings', '7-Zip'],
          download: { file: 'm08-net-keycheck.zip', password: 'reverse' },
          questions: [
            {
              id: 'key',
              prompt: 'Which key does the program accept?',
              accept: ['RA-2F81-KOBOLD'],
              normalize: 'text',
              hint: 'Plain `strings` finds nothing. Try `strings -e l keycheck.dll` for UTF-16, or open it in ILSpy.',
              explanation:
                "RA-2F81-KOBOLD. It is a plain constant, but stored as UTF-16 in the user-string heap, which is why only a wide-string scan or a decompiler surfaces it.",
            },
            {
              id: 'encoding',
              prompt: 'How many bytes does each character of that key occupy in the file?',
              accept: ['2'],
              normalize: 'number',
              hint: 'Consider why `strings -e l` (little-endian 16-bit) found it while plain `strings` did not.',
              explanation:
                "Two. .NET user strings are UTF-16, so each character is two bytes — the reason an ASCII-only scan misses them entirely.",
            },
            {
              id: 'exit',
              prompt: 'What exit code does a wrong key produce?',
              accept: ['2'],
              normalize: 'number',
              hint: 'Run `dotnet keycheck.dll wrong; echo $?`.',
              explanation:
                "2, against 0 for the right key and 1 for no argument. The same distinct-code convention you have seen since module 2.",
            },
          ],
          walkthrough:
            "1. Unzip. Try the habit that has worked all course:\n     strings keycheck.dll | grep -i ra-\n   Nothing. That is the lesson.\n\n2. Managed strings are UTF-16:\n     strings -e l keycheck.dll\n       usage: keycheck <key>\n       RA-2F81-KOBOLD\n       valid\n       invalid\n\n3. Or open it in ILSpy, where the string heap is decoded and you also see the\n   comparison that uses the key.\n\n4. Confirm by running it:\n     dotnet keycheck.dll RA-2F81-KOBOLD   -> valid    (exit 0)\n     dotnet keycheck.dll wrong            -> invalid  (exit 2)\n\nThe takeaway is narrow and important: `strings` has a default encoding, and .NET\nis not it. Reaching for `strings -e l`, or just opening managed files in a proper\ndecompiler, is the fix.",
        },
        {
          type: 'lab',
          id: 'm8-lab-licence',
          title: 'No key in the file — decompile, invert, or patch',
          brief:
            "`licence.dll` stores no key anywhere. It keeps a ten-byte table and a per-character transform, so even `strings -e l` will not hand you the answer. Decompile it with ILSpy, read the transform, and either invert it to recover the key or patch the branch to defeat the check. Both routes are graded below.",
          format: 'NET',
          tools: ['ILSpy or ilspycmd', 'a hex editor', '7-Zip'],
          download: { file: 'm08-net-licence.zip', password: 'reverse' },
          questions: [
            {
              id: 'xorimm',
              prompt: 'Which value does the transform XOR each character with?',
              accept: ['0x3b', '3b', '59'],
              normalize: 'hex',
              hint: 'Decompile with ILSpy and read the loop in `Check`. One constant is XORed, one is a per-index multiplier.',
              explanation:
                "0x3B, which is 59. The full transform is `(byte)((candidate[i] + i * 5) ^ 0x3B)`, compared against the table entry.",
            },
            {
              id: 'tablelen',
              prompt: 'How many entries does the comparison table hold?',
              accept: ['10'],
              normalize: 'number',
              hint: 'ILSpy shows the `Expected` array literal directly; count its elements, which is also the required key length.',
              explanation:
                "Ten: `new byte[10] { 127, 111, 101, 102, 98, 86, 112, 75, 99, 94 }`. The key must be exactly this long, which the length check enforces first.",
            },
            {
              id: 'key',
              prompt: 'Which key does the program accept?',
              accept: ['DOTNET-M08'],
              normalize: 'text',
              hint: 'Invert the transform per index: (table[i] XOR 0x3B) minus (i * 5), as a character.',
              explanation:
                "DOTNET-M08. Running it confirms the inversion: `dotnet licence.dll DOTNET-M08` prints `licence ok` and exits 0.",
            },
            {
              id: 'branchopcode',
              prompt: 'In `Main`, which one-byte IL opcode makes the accept-or-reject decision? Give it in hex.',
              accept: ['0x2c', '2c'],
              normalize: 'hex',
              hint: 'View the IL (`ilspycmd -il`) and find the branch right after the call to `Check`. It is a short conditional branch.',
              explanation:
                "0x2C, `brfalse.s`. Changing it to 0x2D (`brtrue.s`) at file offset 0x2B4 inverts the program — that single byte is the whole patch.",
            },
          ],
          walkthrough:
            "1. Unzip. Confirm the key is not simply hiding in wide strings:\n     strings -e l licence.dll | grep -i dotnet     -> nothing useful\n\n2. Decompile:\n     ilspycmd licence.dll\n   Read Check:\n     if ((byte)((candidate[i] + i * 5) ^ 0x3B) != Expected[i]) return false;\n     Expected = { 127, 111, 101, 102, 98, 86, 112, 75, 99, 94 }\n\n3. Route A - recover the key by inverting the transform. In python:\n     >>> t = [127,111,101,102,98,86,112,75,99,94]\n     >>> ''.join(chr(((b ^ 0x3B) - i*5) & 0xFF) for i, b in enumerate(t))\n     'DOTNET-M08'\n     >>> # check\n     dotnet licence.dll DOTNET-M08   -> licence ok   (exit 0)\n\n4. Route B - patch the branch and never learn the key. View the IL:\n     ilspycmd -il licence.dll\n   In Main:\n     IL_0018: brfalse.s IL_0026     ; opcode 0x2C\n   That byte is at file offset 0x2B4. Change 0x2C to 0x2D (brtrue.s) with a hex\n   editor.\n\n5. Run the patched file - but in its OWN directory, or the runtime will load the\n   original licence.dll sitting next to it by name:\n     mkdir patched && cp <edited> patched/licence.dll && cp *.runtimeconfig.json patched/\n     cd patched\n     dotnet licence.dll DOTNET-M08   -> licence rejected\n     dotnet licence.dll anything     -> licence ok\n\nTwo routes, two lessons. Inverting the transform is the same skill as the native\nlabs, just in IL. Patching shows the managed file is trivially editable at the\nbyte level - and the load-by-name gotcha is the kind of thing that makes a\ncorrect patch look like a failed one.",
        },
        {
          type: 'exercise',
          id: 'm8-ex-keygen',
          title: 'Write the keygen',
          task: "Write a few lines in any language that take the `Expected` table from `licence.dll` and print the accepted key, without running the program. Then explain why a keygen is a stronger demonstration of understanding than a patch, and one situation where a patch is nevertheless the better choice.",
          hint: 'The transform is invertible per character; you already have the table and the two constants.',
          answer:
            "    t = [127,111,101,102,98,86,112,75,99,94]\n    print(''.join(chr(((b ^ 0x3B) - i*5) & 0xFF) for i, b in enumerate(t)))\n    # DOTNET-M08\n\nA keygen is stronger because it proves you understood the algorithm well enough\nto run it backwards; a patch only proves you found the branch. A keygen also\nleaves the binary untouched, so it survives signature checks and updates.\n\nA patch is better when the check is not invertible - a comparison against a\nserver response, or a hash with no feasible preimage. There is no key to\ngenerate, so changing the branch is the only route.",
          explanation: "This is the patch-versus-keygen distinction made concrete before module 13 formalises it. The choice is governed by the check: invertible arithmetic yields a keygen, an opaque or one-way check leaves patching as the only option. Recognising which you are looking at, early, saves you from trying to invert something that cannot be inverted.",
        },
        {
          type: 'exercise',
          id: 'm8-ex-signed',
          title: 'Reason about a signed assembly',
          task: "The lab assemblies are unsigned, so a byte patch just works. Suppose the target were strong-name signed. Describe what would happen when you ran your patched copy, and outline what an analyst would have to deal with in addition to the patch itself. You are not asked to defeat signing.",
          hint: 'A strong name is a signature over the assembly contents. Think about what editing a byte does to that signature, and who checks it.',
          answer:
            "Editing any byte invalidates the strong-name signature, because the signature\ncovers the assembly's contents. A loader that enforces the signature then refuses\nto load the file at all - so instead of inverted behaviour you get a load\nfailure.\n\nThe analyst would additionally have to deal with the signature: either the\nsignature check is not enforced in the scenario (common for locally run apps), or\nit is, and the assembly must be re-signed with a key the verifier trusts - which\non someone else's software is exactly the boundary module 1 draws.",
          explanation: "Signing is the first defensive layer you meet, and it changes the shape of the problem: the patch is still one byte, but making the patched file load is a separate step. Naming that step honestly - and noting that on third-party software crossing it is a legal question, not just a technical one - is the professional habit. Module 12 covers the technical side on binaries you are entitled to modify.",
        },
      ],
    },
  ],
};
