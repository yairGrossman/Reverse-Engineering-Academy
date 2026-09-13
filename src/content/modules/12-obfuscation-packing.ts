/**
 * SOURCES (verified while writing this module):
 *
 * TOOL — UPX 5.2.1 (win64), downloaded from the official release
 * github.com/upx/upx/releases/tag/v5.2.1, `upx --version` reports "upx 5.2.1 /
 * NRV data compression library 0.84 / UCL data compression library 1.03". Its
 * self-description from `upx --help`: "Ultimate Packer for eXecutables", with
 * "-d  decompress", "-l  list compressed file", "-t  test compressed file". The
 * course teaches DETECTION and unpacking with the tool's own reversible `-d`, not
 * evasion.
 *
 * MEASURED on the course build machine (mingw gcc 15.2.0), on the lab artifact
 * m12-pe-guarded/guarded.exe and a UPX-packed copy of it:
 * - guarded.exe behaviour (no debugger attached): prints "no debugger; here is
 *   the flag:" then "FLAG{unpack_me}", exit 0. Under a debugger the
 *   IsDebuggerPresent gate makes it print "debugger detected", exit 3.
 * - The flag is XOR-encoded (byte ^ 0x5A) in .data and decoded at runtime, so
 *   `strings guarded.exe` does NOT contain "FLAG{unpack_me}". (It does contain
 *   Windows SDK identifiers that happen to include the substring "FLAG", which
 *   is a good example of why grepping strings for a word is noisy.)
 * - `objdump -p guarded.exe` shows IsDebuggerPresent imported from KERNEL32.dll
 *   (import entry __imp_IsDebuggerPresent).
 * - UPX packing: `upx guarded.exe` -> "132749 -> 72845, 54.87%, win64/pe".
 * - Sections, `objdump -h`: plain file has .text/.data/.rdata/.pdata/.xdata/
 *   .idata; the packed file has UPX0 (0x1c000, CODE, no raw data), UPX1
 *   (0x7e00, the compressed payload) and .rsrc. The UPX0/UPX1 names are the tell.
 * - Entropy (Shannon, bits/byte, computed over the whole file): plain 5.346,
 *   packed 6.046 — higher, but not extreme, because headers and the decompressor
 *   stub are not compressed. Entropy is a SIGNAL, not proof.
 * - Import table: the plain file lists 9 DLLs including KERNEL32.dll with
 *   IsDebuggerPresent; the packed file's import table no longer contains
 *   IsDebuggerPresent at all (grep count 0) — the real imports are rebuilt by the
 *   unpacking stub at runtime.
 * - Unpacking: `upx -d` on a packed copy restores a working binary that prints
 *   the flag again, confirming packing is reversible transport, not protection of
 *   the logic.
 * - The XOR table in .data decodes to the flag: [0x1C,0x16,0x1B,0x1D,0x21,0x2F,
 *   0x34,0x2A,0x3B,0x39,0x31,0x05,0x37,0x3F,0x27] each ^ 0x5A = "FLAG{unpack_me}".
 */
import type { Module } from '../../types/content';

export const obfuscationModule: Module = {
  id: 'obfuscation-packing',
  number: 12,
  title: 'Obfuscation, Packing and Anti-Analysis',
  tagline: 'The defences that make a binary look unreadable — and why detecting them is most of defeating them.',
  part: 4,
  lessons: [
    {
      id: 'anti-debug',
      title: 'Anti-Debugging',
      blocks: [
        {
          type: 'callout',
          variant: 'warning',
          title: 'This module teaches detection, not evasion',
          text: "Everything here is about recognising a defence and analysing your own binary past it. The techniques generalise to malware analysis, which is defensive work — but the course draws the line at your own files and does not teach how to make code evade detection in the wild. The module 1 boundary still holds.",
        },
        {
          type: 'prose',
          text: "Part 4 is about binaries that fight back. The commonest first line of defence is **anti-debugging**: the program checks whether it is being debugged and behaves differently if so. The lab binary does exactly this, and it is the simplest possible form.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'The lab binary, run two ways',
          code: `$ ./guarded.exe
no debugger; here is the flag:
FLAG{unpack_me}

# under a naive debugger, the same binary:
debugger detected      (exit 3)`,
        },
        {
          type: 'heading',
          text: 'The check announces itself in the imports',
        },
        {
          type: 'prose',
          text: "The Windows API `IsDebuggerPresent` returns whether a debugger is attached. A program that calls it must import it, and imports are public — module 7 taught you to read them. `objdump -p` shows it plainly:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'objdump -p guarded.exe',
          code: `DLL Name: KERNEL32.dll
  ...
  __imp_IsDebuggerPresent`,
        },
        {
          type: 'prose',
          text: "That import is the giveaway. When you see `IsDebuggerPresent`, `CheckRemoteDebuggerPresent`, or `NtQueryInformationProcess` in a binary's imports, you know before running it that there is a debugger check, and roughly where to look. The check itself is a single call whose result feeds a branch — exactly the `cmp`/`jcc` shape from module 4.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Three ways past an anti-debug check',
          text: "Once you have found it: **patch** the branch so the check's result is ignored (module 8's move, in native code); **change the returned value** in the debugger, forcing `IsDebuggerPresent` to report zero; or simply **analyse statically**, where no debugger is running so the check never fires. The lab's flag is recoverable by the third route alone — you never have to defeat the check to read it.",
        },
        {
          type: 'quiz',
          id: 'm12-quiz-antidebug',
          question: 'A binary imports `IsDebuggerPresent`. What have you learned before running it?',
          options: [
            {
              text: 'It behaves differently under a debugger',
              correct: true,
              explanation: "The import signals a debugger check, so dynamic analysis may hit a branch that static reading avoids.",
            },
            {
              text: 'It is packed and must be unpacked first',
              correct: false,
              explanation: "Packing has different signs — UPX sections, few imports; a named API import is the opposite of hidden.",
            },
            {
              text: 'It cannot be analysed statically at all',
              correct: false,
              explanation: "Static analysis is exactly what reads the import and the branch; no debugger runs, so the check never fires.",
            },
            {
              text: 'It encrypts its strings at runtime',
              correct: false,
              explanation: "String encoding is a separate defence; importing a debugger-check API says nothing about strings.",
            },
          ],
        },
      ],
    },
    {
      id: 'string-obfuscation',
      title: 'String Obfuscation',
      blocks: [
        {
          type: 'prose',
          text: "The second defence in the lab is one you have already defeated several times without naming it: the interesting string is not stored in the clear. Here it is a flag, XOR-encoded in `.data` and decoded at startup.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'strings guarded.exe — searching for the flag',
          code: `$ strings guarded.exe | grep FLAG
JOB_OBJECT_NET_RATE_CONTROL_FLAGS
LoaderFlags
ExceptionFlags
...`,
          },
        {
          type: 'prose',
          text: "The word `FLAG` appears many times — all of it Windows SDK identifiers, none of it the flag. This is a double lesson: the real string `FLAG{unpack_me}` is **not** there because it is encoded, and grepping `strings` for a keyword produces confident-looking noise. A hit in `strings` is a lead, never an answer.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Why obfuscated strings are still recoverable',
          text: "The program must decode the string to use it, so the decoder and the key are both in the binary. That is the same argument as every keygen in this course: a value the program can compute, you can compute. The XOR key `0x5A` and the encoded bytes are right there in `.data`; reading the decode loop hands you both.",
        },
        {
          type: 'heading',
          text: 'The escalation ladder',
        },
        {
          type: 'table',
          headers: ['Technique', 'What strings shows', 'How you read it'],
          rows: [
            ['Plaintext', 'The string itself', '`strings`, and you are done (module 2)'],
            ['Assembled from parts', 'Fragments only', 'Read the code that joins them (module 11)'],
            ['XOR / simple encoding', 'Ciphertext bytes', 'Find the decoder, apply the key (here)'],
            ['Encryption with a derived key', 'Ciphertext', 'Recover the key at runtime with a debugger (module 6)'],
          ],
        },
        {
          type: 'prose',
          text: "Each rung defeats the previous rung's technique and is defeated by the next tool you already have. Obfuscation raises the cost of analysis; it does not change the fact that everything the program needs is inside it.",
        },
        {
          type: 'quiz',
          id: 'm12-quiz-strings',
          question: 'You grep `strings` for a keyword and get dozens of hits, none the value you want. What is the likely situation?',
          options: [
            {
              text: 'The value is encoded and hits are noise',
              correct: true,
              explanation: "An obfuscated string will not appear in the clear, while the keyword coincidentally matches unrelated identifiers.",
            },
            {
              text: 'The binary has no interesting strings',
              correct: false,
              explanation: "The many hits show plenty of text; the target is simply not stored as plaintext to be found.",
            },
            {
              text: 'The file is corrupt and cannot be read',
              correct: false,
              explanation: "`strings` read it fine and produced output; nothing indicates corruption here.",
            },
            {
              text: 'You are using the wrong string encoding',
              correct: false,
              explanation: "Encoding matters for .NET, but a native PE's ASCII strings read fine; the value is encoded, not mis-decoded.",
            },
          ],
        },
      ],
    },
    {
      id: 'packing',
      title: 'Packing',
      blocks: [
        {
          type: 'prose',
          text: "Packing compresses (or encrypts) the whole program and prepends a small stub that unpacks it into memory at startup. The original code never sits on disk in readable form, so a decompiler sees only the stub. **UPX** is the common, honest example — an open-source compressor whose `-d` flag reverses it — and this lesson measures what it does to the lab binary.",
        },
        {
          type: 'heading',
          text: 'The tells, all measured',
        },
        {
          type: 'table',
          headers: ['Signal', 'Plain guarded.exe', 'UPX-packed'],
          rows: [
            ['Section names', '`.text .data .rdata .idata`', '`UPX0 UPX1 .rsrc`'],
            ['File size', '132,749 bytes', '72,845 bytes (54.9%)'],
            ['Entropy (bits/byte)', '5.346', '6.046'],
            ['Imports listed', '9 DLLs, incl. IsDebuggerPresent', 'Few; IsDebuggerPresent absent'],
          ],
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'UPX0 and UPX1 are the signature',
          text: "The renamed sections are the clearest tell. `UPX0` is reserved empty space that the stub fills at runtime with the unpacked code; `UPX1` holds the compressed payload. Named sections replaced by `UPX0`/`UPX1` mean UPX, full stop — and even custom packers usually leave two similar sections, one empty-on-disk and one high-entropy.",
        },
        {
          type: 'heading',
          text: 'Two subtler tells',
        },
        {
          type: 'prose',
          text: "The **import table shrinks dramatically**. The plain binary imports `IsDebuggerPresent` and eight CRT libraries; the packed one imports almost nothing, because the real imports are rebuilt by the stub after it decompresses. A binary that does obvious work but imports almost no functions is packed until proven otherwise.",
        },
        {
          type: 'prose',
          text: "And **entropy rises** — here from 5.35 to 6.05 bits per byte. Compressed and encrypted data looks random, so it approaches the 8.0 maximum. But note the measured rise is modest, not dramatic: the headers, the stub, and `.rsrc` are not compressed, and this is a small binary. Entropy is a **signal to investigate**, never a verdict on its own.",
        },
        {
          type: 'heading',
          text: 'Unpacking is often trivial',
        },
        {
          type: 'code',
          language: 'text',
          title: 'UPX reverses itself',
          code: `$ upx -d guarded-packed.exe
Unpacked 1 file.

$ ./guarded-packed.exe
no debugger; here is the flag:
FLAG{unpack_me}`,
        },
        {
          type: 'prose',
          text: "For UPX, `-d` undoes the packing and you are back to a normal binary. For a custom packer there is no `-d`, and the general technique is dynamic: let the stub unpack the program in memory, then dump the process once execution reaches the original entry point. That is a module 6 skill — a breakpoint after the unpacking stub, then read memory — applied to a new problem.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Packing is transport, not protection',
          text: "The unpacked flag came back identical, because packing never changed the logic — it only wrapped it. Every packer must unpack to run, so the original is always recoverable from memory at runtime. Packing raises effort and hides from static tools; it does not make anything impossible.",
        },
        {
          type: 'quiz',
          id: 'm12-quiz-packing',
          question: 'A PE has sections named `UPX0` and `UPX1` and imports almost nothing. What is it?',
          options: [
            {
              text: 'A UPX-packed executable file',
              correct: true,
              explanation: "The UPX0/UPX1 section names plus a stripped import table are the standard signature of UPX packing.",
            },
            {
              text: 'A .NET assembly with few imports',
              correct: false,
              explanation: "Managed assemblies show a CLI header and BSJB metadata, not UPX section names.",
            },
            {
              text: 'A corrupt binary, damaged sections',
              correct: false,
              explanation: "The sections are intact and deliberately named; this is packing, not corruption.",
            },
            {
              text: 'A driver with unusual sections',
              correct: false,
              explanation: "Drivers keep normal section names; UPX0/UPX1 specifically indicate the UPX packer.",
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
          text: "One binary with two defences — an anti-debug check and an encoded flag — which you can defeat by static analysis alone. Then pack it yourself with UPX to measure what changes, and unpack it to confirm the logic never did.",
        },
        {
          type: 'quiz-set',
          id: 'm12-set-defenses',
          title: 'Defeating defences check',
          questions: [
            {
              type: 'quiz',
              id: 'm12-set-q-import',
              question: 'Which import warns you a binary checks for a debugger?',
              options: [
                {
                  text: '`IsDebuggerPresent` in KERNEL32',
                  correct: true,
                  explanation: "It reports whether a debugger is attached, and importing it signals a debugger check.",
                },
                {
                  text: '`GetProcAddress` from KERNEL32.dll',
                  correct: false,
                  explanation: "That resolves function addresses dynamically; common everywhere and not a debugger check.",
                },
                {
                  text: '`WriteFile` from KERNEL32.dll',
                  correct: false,
                  explanation: "That writes to a file or stream; it has nothing to do with detecting a debugger.",
                },
                {
                  text: '`VirtualAlloc` from KERNEL32',
                  correct: false,
                  explanation: "That allocates memory, which packers use, but it does not check for a debugger.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm12-set-q-static',
              question: 'Why can you read the lab’s flag without defeating its anti-debug check?',
              options: [
                {
                  text: 'Static reading runs no debugger',
                  correct: true,
                  explanation: "The check only fires at runtime under a debugger; reading the decode loop statically never triggers it.",
                },
                {
                  text: 'The check is disabled in release builds',
                  correct: false,
                  explanation: "It is compiled in and active; you simply avoid the condition that trips it.",
                },
                {
                  text: 'IsDebuggerPresent returns zero here',
                  correct: false,
                  explanation: "It returns true under a debugger; the point is that static reading involves no debugger.",
                },
                {
                  text: 'The flag is stored in plaintext anyway',
                  correct: false,
                  explanation: "It is XOR-encoded; you recover it from the decode loop, not from a plaintext copy.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm12-set-q-xor',
              question: 'The flag is XOR-encoded in .data. Why is it still recoverable?',
              options: [
                {
                  text: 'The decoder and key are present',
                  correct: true,
                  explanation: "The program must decode to use the flag, so the key and the loop are present for you to read.",
                },
                {
                  text: 'XOR encoding is a form of compression',
                  correct: false,
                  explanation: "XOR is not compression; it is a reversible byte transform, recoverable via its key.",
                },
                {
                  text: 'The operating system decrypts it for you',
                  correct: false,
                  explanation: "The OS does nothing here; the program's own code performs the decode at startup.",
                },
                {
                  text: 'Encoded strings are stored twice over',
                  correct: false,
                  explanation: "There is one encoded copy; recovery comes from the decoder, not a second plaintext copy.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm12-set-q-upxsec',
              question: 'What are the UPX0 and UPX1 sections for?',
              options: [
                {
                  text: 'Empty space and the compressed payload',
                  correct: true,
                  explanation: "UPX0 is reserved room the stub fills with unpacked code; UPX1 holds the compressed original.",
                },
                {
                  text: 'Two halves of the original code section',
                  correct: false,
                  explanation: "The original sections are gone; UPX0/UPX1 are the packer's own layout, not split code.",
                },
                {
                  text: 'Debug data added by the packer',
                  correct: false,
                  explanation: "Packing strips information rather than adding debug data; these hold the payload and its target space.",
                },
                {
                  text: 'A digital signature over the file',
                  correct: false,
                  explanation: "Signatures live in a certificate directory, not in renamed code sections.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm12-set-q-entropy',
              question: 'Packing raised the file’s entropy from 5.3 to 6.0 bits per byte. How should you read that?',
              options: [
                {
                  text: 'A signal to investigate, not proof',
                  correct: true,
                  explanation: "Higher entropy suggests compression or encryption, but headers and stubs keep it below the maximum.",
                },
                {
                  text: 'Proof the file is definitely packed',
                  correct: false,
                  explanation: "Entropy alone is not conclusive; confirm with section names and the import table.",
                },
                {
                  text: 'Proof the file is encrypted, not packed',
                  correct: false,
                  explanation: "Entropy cannot distinguish compression from encryption; both raise it similarly.",
                },
                {
                  text: 'A signal the file may be corrupt',
                  correct: false,
                  explanation: "Corruption is unrelated; the raised entropy reflects compressed data, and the file runs fine.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm12-set-q-unpack',
              question: 'You unpack the binary and the flag comes back unchanged. What does that show?',
              options: [
                {
                  text: 'Packing wrapped the logic unchanged',
                  correct: true,
                  explanation: "The original is recovered intact, so packing was reversible transport rather than protection of the logic.",
                },
                {
                  text: 'The packer failed to compress properly',
                  correct: false,
                  explanation: "It compressed and reversed correctly; identical output is exactly what success looks like.",
                },
                {
                  text: 'The flag stayed outside the packing',
                  correct: false,
                  explanation: "The whole binary, flag included, was packed; unpacking simply restored it.",
                },
                {
                  text: 'Unpacking removed the anti-debug check',
                  correct: false,
                  explanation: "The check is part of the code and survives unpacking; only the packing wrapper was removed.",
                },
              ],
            },
          ],
        },
        {
          type: 'lab',
          id: 'm12-lab-guarded',
          title: 'Two defences, one static read — then pack it yourself',
          brief:
            "`guarded.exe` checks for a debugger and hides its flag with XOR encoding. You can recover the flag by static analysis without ever tripping the check. Then, if you have UPX, pack a copy and measure what changes — the download is the unpacked binary, and packing it is part of the exercise.",
          format: 'PE',
          tools: ['objdump', 'Ghidra', 'UPX (optional)', '7-Zip'],
          download: { file: 'm12-pe-guarded.zip', password: 'reverse' },
          questions: [
            {
              id: 'antidebugapi',
              prompt: 'Which imported function performs the debugger check?',
              accept: ['IsDebuggerPresent'],
              normalize: 'text',
              hint: 'List imports with `objdump -p guarded.exe` and look for a KERNEL32 function whose name says what it does.',
              explanation:
                "IsDebuggerPresent, imported from KERNEL32.dll. Seeing it tells you the binary branches on debugger presence before you run anything.",
            },
            {
              id: 'xorkey',
              prompt: 'Which single-byte key decodes the flag, in hex?',
              accept: ['0x5a', '5a'],
              normalize: 'hex',
              hint: 'Find the decode loop in Ghidra, or notice the encoded bytes in .data being XORed by a constant.',
              explanation:
                "0x5A. Each encoded byte in .data is XORed with 0x5A at startup; XOR is its own inverse, so the same key recovers the flag.",
            },
            {
              id: 'flag',
              prompt: 'What is the decoded flag?',
              accept: ['FLAG{unpack_me}'],
              normalize: 'text',
              hint: 'XOR the encoded .data bytes with 0x5A, or just run the binary with no debugger attached and read what it prints.',
              explanation:
                "FLAG{unpack_me}. Running the binary normally prints it, because the anti-debug check only fires under a debugger.",
            },
            {
              id: 'exitdbg',
              prompt: 'What exit code does the binary return when it detects a debugger?',
              accept: ['3'],
              normalize: 'number',
              hint: 'Read the branch after the IsDebuggerPresent call; it prints "debugger detected" and returns a value.',
              explanation:
                "3. The detected path returns 3, against 0 for the normal path that prints the flag — distinct codes for distinct outcomes.",
            },
          ],
          walkthrough:
            "1. Unzip. Read the imports first:\n     objdump -p guarded.exe | grep -i debugger\n     -> __imp_IsDebuggerPresent   (from KERNEL32.dll)\n   So there is a debugger check. Note it and move on.\n\n2. The flag is not in strings:\n     strings guarded.exe | grep FLAG\n     -> only Windows identifiers like LoaderFlags, ExceptionFlags\n   The real flag is encoded.\n\n3. Recover it statically. In Ghidra, the decode loop XORs a .data array with a\n   constant; the constant is 0x5A. Apply it to the encoded bytes:\n     encoded ^ 0x5A -> FLAG{unpack_me}\n   Or, since the check only fires under a debugger, just run it:\n     ./guarded.exe   -> no debugger; here is the flag: FLAG{unpack_me}\n\n4. Now measure packing. Pack a copy (keep the original):\n     cp guarded.exe packed.exe\n     upx packed.exe        -> 132749 -> 72845 (54.87%)\n   Compare:\n     objdump -h packed.exe   -> UPX0, UPX1, .rsrc  (not .text/.data/...)\n     objdump -p packed.exe   -> IsDebuggerPresent no longer in the import table\n   The imports were rebuilt into the stub; entropy rose from ~5.3 to ~6.0.\n\n5. Unpack and confirm nothing was really hidden:\n     upx -d packed.exe\n     ./packed.exe          -> FLAG{unpack_me}, unchanged\n\nThe whole module in one line: defences raise the cost of reading a binary; they\ndo not change what the binary must contain in order to run.",
        },
        {
          type: 'exercise',
          id: 'm12-ex-dynamic-unpack',
          title: 'Plan a dynamic unpack for a packer with no -d',
          task: "UPX unpacks itself with `-d`, but a custom packer will not. Describe how you would recover the original code from a binary packed by an unknown packer, using the dynamic-analysis skills from module 6. Say what event you are waiting for and how you would know you have reached it.",
          hint: 'The stub must transfer control to the unpacked original entry point. Think about where that jump lands and what memory looks like just after it.',
          answer:
            "Plan:\n  1. Load the packed binary in a debugger. The entry point is the stub, not the\n     real code.\n  2. Let the stub run - it decompresses the original into memory (often into the\n     empty UPX0-like section). Set a hardware/memory breakpoint on that region,\n     or single-step to the 'tail jump' where the stub jumps into the freshly\n     written code.\n  3. When execution leaves the stub for that region - a jump to an address that\n     was empty on disk but now holds code - you have reached the original entry\n     point (OEP).\n  4. Dump the process memory from there, fix up the import table, and you have an\n     unpacked binary to analyse statically.\n\nHow you know: the tell is control transferring to an address in a section that\nhad no raw data in the file. That jump out of the stub into just-written memory\nis the OEP.",
          explanation: "This is the general unpacking technique, and it follows directly from 'packing is transport': because the program must unpack itself to run, you let it, then catch it the instant the real code exists in memory. The tail jump to the original entry point is the universal signal, and recognising it is what turns module 6's breakpoint-and-dump skills into a packer-independent method.",
        },
        {
          type: 'exercise',
          id: 'm12-ex-layered',
          title: 'Order the defences by cost to you',
          task: "This binary combined anti-debugging, string encoding, and (once you pack it) packing. Rank those three by how much they actually slowed you down, and explain why the ranking might reverse for a different analyst or a different goal.",
          hint: 'Consider which defences you bypassed for free with the approach you were already taking.',
          answer:
            "For the static approach taken here, roughly:\n  - Anti-debugging cost almost nothing: static analysis runs no debugger, so the\n    check never fired.\n  - String encoding cost a little: one XOR loop to read and invert.\n  - Packing cost the most: it hides everything from static tools until unpacked,\n    forcing an extra step.\n\nWhy it can reverse: an analyst working dynamically hits the anti-debug check\nfirst and hard, so for them it is the expensive one. If the goal is to run the\nsample rather than read it, packing is trivial (it self-unpacks on run) while\nanti-debug becomes the wall. The cost of a defence depends on your method and\nyour goal, not on the defence alone.",
          explanation: "Defences are not absolutely ranked - their cost is relative to how you are working. The lesson is to notice which defences your chosen approach bypasses for free and pick the approach accordingly: a check that is devastating to one method is invisible to another. Knowing that lets you route around defences instead of grinding through them.",
        },
      ],
    },
  ],
};
