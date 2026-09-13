/**
 * SOURCES (verified while writing this module):
 *
 * READ LOCALLY — the installed CPython 3.14 tree, which is the exact-case source
 * for the .pyc header. PEP 552 was REJECTED for this (recorded failure 3): it is
 * Python 3.7 and gives no byte sizes. Instead, from
 * C:\Users\yairg\AppData\Local\Programs\Python\Python314\Lib\importlib\_bootstrap_external.py:
 * - MAGIC_NUMBER = _imp.pyc_magic_number_token.to_bytes(4, 'little').
 * - _classify_pyc: "magic = data[:4]" checked against MAGIC_NUMBER, "if
 *   len(data) < 16" is truncated, "flags = _unpack_uint32(data[4:8])", and
 *   "Only the first two flags are defined" (flags & ~0b11 is invalid). So the
 *   header is 16 bytes: magic[0:4], flags[4:8], then 8 more.
 * - _code_to_timestamp_pyc: MAGIC_NUMBER, _pack_uint32(0) flags, _pack_uint32(
 *   mtime), _pack_uint32(source_size), then marshal.dumps(code). So for a
 *   timestamp pyc the last 8 header bytes are mtime[8:12] and source_size[12:16].
 * - _code_to_hash_pyc: flags = 0b1 | checked<<1, then an 8-byte source_hash in
 *   place of mtime+size. So bit 0 of flags distinguishes hash-based from
 *   timestamp-based, and bit 1 is the "checked" flag.
 *
 * MEASURED on the course build machine, CPython 3.14.3:
 * - importlib.util.MAGIC_NUMBER = 2b0e0d0a (bytes 2b 0e 0d 0a).
 * - Lab artifact m11-pyc-token/token.pyc, built by labs/build.mjs
 *   (python -m compileall -b). First 16 bytes:
 *     2b 0e 0d 0a 00 00 00 00 d1 50 a5 6a 5e 01 00 00
 *   -> magic 2b0e0d0a, flags 0 (timestamp-based), mtime 1789219025,
 *      source_size 350 (0x15e).
 * - Behaviour: `python token.pyc quarry-07` -> "ok", exit 0; a wrong argument
 *   -> "no". `strings token.pyc` shows the fragments "arry" and "07" but not the
 *   assembled token.
 * - dis/marshal on the file: the module-level tuple constant is
 *   ('qu', 'arry', '-', '07'), and build_token disassembles to LOAD_CONST '' /
 *   LOAD_ATTR join / LOAD_GLOBAL _PARTS / CALL / RETURN_VALUE — i.e.
 *   "".join(_PARTS) = "quarry-07".
 */
import type { Module } from '../../types/content';

export const pythonModule: Module = {
  id: 'python-bytecode',
  number: 11,
  title: 'Interpreted — Python Bytecode and Bundled Apps',
  tagline: 'When the source is gone but the bytecode is not: reading a .pyc, and where interpreted code hides in shipped apps.',
  part: 3,
  lessons: [
    {
      id: 'the-pyc-file',
      title: 'The .pyc File',
      blocks: [
        {
          type: 'callout',
          variant: 'info',
          title: 'Setup for this module',
          text: "You need the **Python** you installed in module 1 — that is the whole toolkit. Its `dis` module disassembles bytecode, `marshal` loads the code object out of a `.pyc`, and `importlib.util.MAGIC_NUMBER` tells you which interpreter a file was compiled for. Use the **same major.minor Python** as the file: a `.pyc` is version-specific, and 3.14 cannot read 3.12's bytecode.",
        },
        {
          type: 'prose',
          text: "Interpreted languages lose less than compiled ones. When Python imports a module it caches a compiled `.pyc` alongside, and that file contains the bytecode plus enough structure that `dis` reconstructs a readable disassembly. The source text is gone, but the logic is entirely recoverable.",
        },
        {
          type: 'heading',
          text: 'A sixteen-byte header, read from the interpreter itself',
        },
        {
          type: 'prose',
          text: "The `.pyc` format is not covered accurately by the well-known PEP for it — that PEP is from Python 3.7 and gives no byte sizes, and the interpreter here is 3.14. So this comes from the interpreter's own source, `importlib/_bootstrap_external.py`, and the measured bytes of the lab file:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'The first sixteen bytes of the lab’s token.pyc',
          code: `2b 0e 0d 0a  00 00 00 00  d1 50 a5 6a  5e 01 00 00
\\_________/  \\_________/  \\_________/  \\_________/
  magic         flags        mtime      source_size`,
        },
        {
          type: 'table',
          headers: ['Bytes', 'Field', 'Measured value', 'Meaning'],
          rows: [
            ['0–3', 'magic', '`2b 0e 0d 0a`', 'Which interpreter version compiled it'],
            ['4–7', 'flags', '`00 00 00 00`', 'Bit 0: hash-based? Bit 1: checked? Here 0, so timestamp-based'],
            ['8–11', 'mtime', '`d1 50 a5 6a`', 'Source last-modified time'],
            ['12–15', 'source_size', '`5e 01 00 00`', '0x15E = 350 bytes of original source'],
          ],
        },
        {
          type: 'prose',
          text: "The interpreter's `MAGIC_NUMBER` here is exactly `2b 0e 0d 0a`, matching the file's first four bytes. That is the check `import` itself performs: `_classify_pyc` compares the first four bytes against `MAGIC_NUMBER` and raises `ImportError` on a mismatch. It is why a `.pyc` from the wrong Python simply refuses to load.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Two shapes of header after the flags',
          text: "The interpreter source shows the last eight header bytes depend on bit 0 of the flags. A **timestamp-based** pyc (flag bit 0 clear, like this lab) stores the source's modification time and size, so `import` can tell whether the source changed. A **hash-based** pyc stores an 8-byte hash of the source instead. Reading the flags first tells you which layout the remaining bytes follow.",
        },
        {
          type: 'quiz',
          id: 'm11-quiz-header',
          question: 'The flags field of a .pyc is zero. What does that tell you about the next eight bytes?',
          options: [
            {
              text: 'They are a modification time and size',
              correct: true,
              explanation: "Flag bit 0 clear means a timestamp-based pyc, whose header carries the source mtime and byte size.",
            },
            {
              text: 'They are an eight-byte source hash',
              correct: false,
              explanation: "A hash-based pyc has flag bit 0 set; with flags zero the layout is mtime plus size instead.",
            },
            {
              text: 'They are the length of the whole bytecode',
              correct: false,
              explanation: "No length prefix precedes the code object; marshal reads it directly after the 16-byte header.",
            },
            {
              text: 'They are a continuation of the magic',
              correct: false,
              explanation: "The magic is only the first four bytes; the flags and the following fields are separate.",
            },
          ],
        },
      ],
    },
    {
      id: 'disassembling-bytecode',
      title: 'Disassembling with dis',
      blocks: [
        {
          type: 'prose',
          text: "Past the header is a **marshalled code object** — Python's serialisation of compiled code. `marshal.loads` turns it back into a code object, and `dis` disassembles it. You rarely need to touch the bytes by hand; the standard library reads its own format.",
        },
        {
          type: 'code',
          language: 'python',
          title: 'Loading and disassembling a .pyc',
          code: `import dis, marshal

data = open("token.pyc", "rb").read()
code = marshal.loads(data[16:])   # skip the 16-byte header
dis.dis(code)                     # disassemble the module`,
        },
        {
          type: 'heading',
          text: 'Python is a stack machine too',
        },
        {
          type: 'prose',
          text: "By now the pattern is familiar: like the JVM and the CLR, CPython runs a stack machine. Here is the lab's `build_token`, disassembled straight from the `.pyc`:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'dis output for build_token',
          code: `RESUME       0
LOAD_CONST   0 ('')
LOAD_ATTR    1 (join + NULL|self)
LOAD_GLOBAL  2 (_PARTS)
CALL         1
RETURN_VALUE`,
        },
        {
          type: 'prose',
          text: "Read it as `''.join(_PARTS)`: push the empty string, look up its `join` attribute, push the global `_PARTS`, call with one argument, return. The opcodes are wordier than x86 but the shape is the same — and crucially, the names `join`, `_PARTS` and the constant `''` all survived, because Python bytecode keeps them.",
        },
        {
          type: 'heading',
          text: 'The constants are right there',
        },
        {
          type: 'prose',
          text: "A code object carries its constants in `co_consts`, and `dis` or a one-line script reads them. The lab's module-level constants include the tuple that `build_token` joins:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'The tuple constant, straight from co_consts',
          code: `('qu', 'arry', '-', '07')`,
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Why strings only half-worked here',
          text: "`strings token.pyc` shows `arry` and `07` but not the finished token, because the program never stores `\"quarry-07\"` — it assembles it at runtime from four pieces. This is the same lesson as the native labs: a value built from parts is not a string in the file, so you read the code that builds it rather than grepping for the answer.",
        },
        {
          type: 'quiz',
          id: 'm11-quiz-dis',
          question: 'Why does `dis` recover names like `join` and `_PARTS` from a .pyc?',
          options: [
            {
              text: 'Bytecode keeps names as constants',
              correct: true,
              explanation: "A code object stores its names and constants, so the disassembler reads them directly from the file.",
            },
            {
              text: 'dis re-downloads the original source',
              correct: false,
              explanation: "It works entirely offline on the compiled file; no source is fetched or required.",
            },
            {
              text: 'The .pyc embeds the whole .py text',
              correct: false,
              explanation: "Only bytecode and metadata are stored; the source text itself is not kept in the pyc.",
            },
            {
              text: 'Python cannot compile away any names',
              correct: false,
              explanation: "Local variable names can be reduced to indices; the point is that these names are retained.",
            },
          ],
        },
      ],
    },
    {
      id: 'bundled-apps',
      title: 'Where Interpreted Code Hides in Shipped Apps',
      blocks: [
        {
          type: 'prose',
          text: "A shipped Python or JavaScript app rarely arrives as a neat `.pyc`. It is bundled — into a single executable, or an Electron archive — and the first task is finding the interpreted code inside the wrapper. You cannot always run these bundlers on this machine, so this lesson describes what to look for rather than claiming measured output, and says so.",
        },
        {
          type: 'heading',
          text: 'Bundled Python',
        },
        {
          type: 'prose',
          text: "Tools like PyInstaller wrap the interpreter, the standard library, and the app's own `.pyc` files into one executable. The reverse-engineering move is to unpack the wrapper back into those `.pyc` files, then use exactly the `dis` skills from this module. The details of a specific bundler's format are not measured here — when you meet one, identify the bundler first and read its own documentation.",
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'A version mismatch will stop you',
          text: "An extracted `.pyc` only disassembles cleanly under the **same major.minor Python** that built it — the magic number is the check. If `dis` chokes or `import` refuses the file, read its magic number and match your interpreter to it before assuming the file is corrupt or obfuscated. This is the single most common failure when analysing bundled Python.",
        },
        {
          type: 'heading',
          text: 'Electron and bundled JavaScript',
        },
        {
          type: 'prose',
          text: "An Electron desktop app is a browser bundled with a Node runtime, and its JavaScript usually lives in an `app.asar` archive. `asar` is not encryption — it is a simple concatenation format with a header index, extractable with the `asar` tool. Inside is the app's JavaScript, often minified rather than compiled, which means it reads back more easily than any bytecode in this course.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'The recurring shape of the problem',
          text: "Bundled apps are containers around interpreted code, exactly as an APK is a container around DEX. The workflow is always: identify the container, extract it, then apply the language-specific reading skill. Nothing about the wrapper is the hard part — it is packaging, not protection, and module 12 is where real protection begins.",
        },
        {
          type: 'quiz',
          id: 'm11-quiz-bundle',
          question: 'You extract a `.pyc` from a bundled app and `dis` produces garbage. Most likely cause?',
          options: [
            {
              text: 'Your Python version does not match',
              correct: true,
              explanation: "Bytecode is version-specific; the magic number must match the interpreter reading it, or disassembly breaks.",
            },
            {
              text: 'The bytecode is encrypted here',
              correct: false,
              explanation: "Bundling is packaging, not encryption; a version mismatch is far more common than genuine encryption.",
            },
            {
              text: 'The file must be run, not disassembled',
              correct: false,
              explanation: "`dis` reads a valid pyc statically; if it fails, the file or the interpreter version is the issue.",
            },
            {
              text: 'Electron apps cannot contain Python',
              correct: false,
              explanation: "The scenario is bundled Python; Electron is a separate JavaScript case discussed alongside it.",
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
          text: "One `.pyc`, no source. Read its header to confirm the interpreter, then disassemble it to recover a token the program assembles at runtime rather than storing whole. Everything here uses only the Python standard library.",
        },
        {
          type: 'quiz-set',
          id: 'm11-set-python',
          title: 'Python bytecode check',
          questions: [
            {
              type: 'quiz',
              id: 'm11-set-q-magic',
              question: 'What does the first four bytes of a .pyc identify?',
              options: [
                {
                  text: 'The interpreter version used',
                  correct: true,
                  explanation: "The magic number encodes the CPython version; import rejects a pyc whose magic does not match.",
                },
                {
                  text: 'The length of the marshalled code',
                  correct: false,
                  explanation: "No size prefix lives there; marshal reads the code object after the fixed 16-byte header.",
                },
                {
                  text: 'A checksum of the whole file',
                  correct: false,
                  explanation: "The magic is a version tag, not a checksum; integrity for hash pycs lives in a separate field.",
                },
                {
                  text: 'The name of the source module',
                  correct: false,
                  explanation: "The module name is not stored in the header; it comes from the file path at import time.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm11-set-q-header',
              question: 'How large is the .pyc header before the code object begins?',
              options: [
                {
                  text: '16 bytes',
                  correct: true,
                  explanation: "Four fields of four bytes each: magic, flags, then either mtime and size or a source hash.",
                },
                {
                  text: '4 bytes',
                  correct: false,
                  explanation: "That is only the magic; three more fields follow before the marshalled code.",
                },
                {
                  text: '8 bytes',
                  correct: false,
                  explanation: "Magic plus flags is eight, but the header continues with two more four-byte fields.",
                },
                {
                  text: '32 bytes',
                  correct: false,
                  explanation: "The header is half that; 16 bytes is what the interpreter source and the file both show.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm11-set-q-marshal',
              question: 'What sits immediately after the 16-byte header?',
              options: [
                {
                  text: 'A marshalled code object',
                  correct: true,
                  explanation: "`marshal.loads(data[16:])` returns the code object that `dis` then disassembles.",
                },
                {
                  text: 'The raw UTF-8 source text',
                  correct: false,
                  explanation: "The source is not stored; only its compiled, marshalled form appears after the header.",
                },
                {
                  text: 'A table of string constants',
                  correct: false,
                  explanation: "Constants live inside the code object's co_consts, not as a separate section in the file.",
                },
                {
                  text: 'A second copy of the magic',
                  correct: false,
                  explanation: "The magic appears once, at the very start; nothing repeats it after the header.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm11-set-q-stack',
              question: 'What kind of virtual machine does CPython bytecode target?',
              options: [
                {
                  text: 'A stack-based machine',
                  correct: true,
                  explanation: "Opcodes like LOAD_CONST and CALL push and pop an evaluation stack, as the JVM and CLR do.",
                },
                {
                  text: 'A register-based machine',
                  correct: false,
                  explanation: "That is closer to DEX; CPython works on a stack rather than numbered registers.",
                },
                {
                  text: 'Native x86 execution',
                  correct: false,
                  explanation: "Bytecode is interpreted, not run as machine code; there is no direct CPU execution here.",
                },
                {
                  text: 'A tree-walking evaluator',
                  correct: false,
                  explanation: "CPython compiles to bytecode first; it does not walk the syntax tree at run time.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm11-set-q-strings',
              question: 'A token appears in `dis` output but not in `strings`. Why?',
              options: [
                {
                  text: 'The program builds it at runtime',
                  correct: true,
                  explanation: "Joining pieces means the whole token is never a literal in the file, so strings finds only fragments.",
                },
                {
                  text: 'strings cannot read .pyc files',
                  correct: false,
                  explanation: "It reads any file's printable runs; it found the fragments, just not the assembled whole.",
                },
                {
                  text: 'The token is stored encrypted',
                  correct: false,
                  explanation: "Nothing is encrypted; it is simply built from parts rather than stored complete.",
                },
                {
                  text: 'dis invented the token from names',
                  correct: false,
                  explanation: "`dis` reports real constants; the token comes from joining the parts it shows.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm11-set-q-version',
              question: 'Why must you disassemble a .pyc with the matching Python version?',
              options: [
                {
                  text: 'Bytecode changes between versions',
                  correct: true,
                  explanation: "Opcodes and the magic number evolve, so a mismatched interpreter reads the file wrongly or refuses it.",
                },
                {
                  text: 'Older Python cannot run `dis`',
                  correct: false,
                  explanation: "`dis` exists across versions; the problem is the bytecode dialect, not the tool's availability.",
                },
                {
                  text: 'The file is locked to one machine',
                  correct: false,
                  explanation: "A pyc is portable across machines of the same version; it is not tied to hardware.",
                },
                {
                  text: 'Marshal format is encrypted per version',
                  correct: false,
                  explanation: "Marshal is not encrypted; it simply changes shape between releases along with the bytecode.",
                },
              ],
            },
          ],
        },
        {
          type: 'lab',
          id: 'm11-lab-token',
          title: 'Recover a token from bytecode',
          brief:
            "`token.pyc` is a compiled Python module with no source alongside it. It builds a token from pieces at runtime, so `strings` will not hand it to you whole. Read the header to confirm your interpreter matches, then disassemble it with the standard library and reconstruct the token.",
          format: 'PYC',
          tools: ['Python (dis, marshal)', 'strings', '7-Zip'],
          download: { file: 'm11-pyc-token.zip', password: 'reverse' },
          questions: [
            {
              id: 'magic',
              prompt: 'What are the first four bytes of the file, in hex?',
              accept: ['2b0e0d0a', '0x2b0e0d0a'],
              normalize: 'hex',
              hint: 'Read them with `od -An -tx1 -N4 token.pyc`, and compare against `python -c "import importlib.util; print(importlib.util.MAGIC_NUMBER.hex())"`.',
              explanation:
                "2b 0e 0d 0a, the CPython 3.14 magic number. It matches `importlib.util.MAGIC_NUMBER`, confirming your interpreter can read this file.",
            },
            {
              id: 'flags',
              prompt: 'What is the value of the flags field (bytes 4 to 7)?',
              accept: ['0'],
              normalize: 'number',
              hint: 'Four bytes little-endian right after the magic. `od -An -tx1 -j4 -N4 token.pyc`.',
              explanation:
                "0, meaning a timestamp-based pyc — so the next eight bytes are the source modification time and size, not a hash.",
            },
            {
              id: 'srcsize',
              prompt: 'What source_size does the header record, in decimal?',
              accept: ['350'],
              normalize: 'number',
              hint: 'Bytes 12 to 15, little-endian: `0x5e 0x01 0x00 0x00`.',
              explanation:
                "350 (0x15E). For a timestamp pyc this is the byte length of the original source, which `import` uses to detect changes.",
            },
            {
              id: 'token',
              prompt: 'Which token does the program accept?',
              accept: ['quarry-07'],
              normalize: 'text',
              hint: 'Load the code object with `marshal.loads(open("token.pyc","rb").read()[16:])` and inspect `co_consts`, or run `dis` and read the tuple that `build_token` joins.',
              explanation:
                "quarry-07, joined from the tuple ('qu', 'arry', '-', '07'). Running `python token.pyc quarry-07` prints `ok`.",
            },
          ],
          walkthrough:
            "1. Unzip, and check your interpreter matches the file:\n     od -An -tx1 -N4 token.pyc\n       2b 0e 0d 0a\n     python -c \"import importlib.util; print(importlib.util.MAGIC_NUMBER.hex())\"\n       2b0e0d0a\n   Same magic, so this Python can read it.\n\n2. Read the rest of the header:\n     od -An -tx1 -N16 token.pyc\n       2b 0e 0d 0a  00 00 00 00  d1 50 a5 6a  5e 01 00 00\n     flags = 0 (timestamp-based), mtime, source_size = 0x15E = 350.\n\n3. strings is not enough:\n     strings token.pyc | grep -i quarry     -> nothing whole (just 'arry', '07')\n   The token is assembled, not stored.\n\n4. Disassemble:\n     python -c \"import dis,marshal; dis.dis(marshal.loads(open('token.pyc','rb').read()[16:]))\"\n   build_token is ''.join(_PARTS), and _PARTS is the constant tuple\n     ('qu', 'arry', '-', '07')\n   Join them: quarry-07.\n\n5. Confirm:\n     python token.pyc quarry-07   -> ok\n     python token.pyc wrong       -> no\n\nThe recurring lesson, one last time in Part 3: a value built at runtime is not a\nstring in the file. Reading the code that builds it is the whole job, and Python\nbytecode makes that unusually easy because the names and constants all survive.",
        },
        {
          type: 'exercise',
          id: 'm11-ex-header',
          title: 'Parse the header by hand',
          task: "Write a few lines that open `token.pyc`, read the 16-byte header, and print the magic (hex), the flags, and — because flags is zero — the mtime and source_size. Then say how your parser would need to change if bit 0 of the flags were set instead.",
          hint: 'Four little-endian uint32s. `int.from_bytes(data[8:12], "little")` reads the mtime.',
          answer:
            "    data = open('token.pyc','rb').read()\n    magic = data[0:4]\n    flags = int.from_bytes(data[4:8], 'little')\n    mtime = int.from_bytes(data[8:12], 'little')\n    size  = int.from_bytes(data[12:16], 'little')\n    print(magic.hex(), flags, mtime, size)\n    # 2b0e0d0a 0 1789219025 350\n\nIf bit 0 of flags were set, the pyc would be hash-based: bytes 8 to 15 would be\nan 8-byte source hash rather than an mtime and a size, so the parser would read\ndata[8:16] as a single hash field and not try to interpret it as two integers.",
          explanation: "Parsing the header by hand fixes the format in memory and, more usefully, teaches you to read the flags before the fields that depend on them - the same discipline as reading a PE's optional-header magic before its width-dependent fields. A parser that assumes one layout will silently misread the other, which is exactly the kind of quiet error that sends an analysis astray.",
        },
        {
          type: 'exercise',
          id: 'm11-ex-compare',
          title: 'Rank the four bytecode formats you have met',
          task: "Across Part 3 you have read .NET IL, JVM bytecode, DEX, and now CPython bytecode. Rank them from most to least recoverable back toward source, and justify the ranking in terms of what each format keeps. Then state the one attack that worked on all four.",
          hint: 'Think about names, types, and how close the decompiled output was to the original in each module.',
          answer:
            "Roughly most-to-least recoverable:\n  1. .NET IL and Java bytecode (tie) - both keep full names and types, and\n     decompilers gave back near-source with real identifiers.\n  2. CPython bytecode - keeps names and constants, disassembles cleanly, but\n     there is no standard decompiler to source as polished as the managed ones;\n     you read dis output.\n  3. DEX - register-based and decompilable with jadx, but names can be stripped\n     or obfuscated more aggressively, and it is a step further from source.\n\nThe one attack that worked on all four: read the check as arithmetic and either\ninvert it to recover the key or find an input that satisfies it. The instruction\nset changed each time; the move did not.",
          explanation: "The point of doing the same kind of lab in four formats was never the formats - it was to show that the analytic move is invariant. Once you can read a comparison or a transform in any of these instruction sets, a new bytecode is just new syntax for an idea you already have. That transfer is what makes the rest of the field learnable.",
        },
      ],
    },
  ],
};
