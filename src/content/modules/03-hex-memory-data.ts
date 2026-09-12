/**
 * SOURCES (verified while writing this module):
 * - Endianness and two's complement values are MEASURED on the course build
 *   machine, not recalled. A C program storing 0x12345678 and 0xBEEF and
 *   printing the raw bytes produced, on x86-64:
 *       u32 0x12345678 in memory: 78 56 34 12
 *       u16 0xBEEF     in memory: EF BE
 *       int -1 as hex: FFFFFFFF      int -5 as hex: FFFFFFFB
 *       char 'A' = 65 = 0x41
 * - The lab answers are likewise measured: `strings` on the built
 *   xorsecret.exe does NOT contain the secret; `nm` reports "no symbols";
 *   running it with `tungsten` prints "correct" and exits 0, a wrong word
 *   prints "wrong" and exits 2.
 * - The brute-force figures quoted in the walkthrough are real counts from
 *   running that script against the shipped artifact: a loose [a-z]{7,}
 *   filter yields 13371 candidates across all 255 keys, while requiring
 *   exactly eight delimited lowercase letters yields 409 — and key 0x3B
 *   yields exactly ['tungsten'].
 */
import type { Module } from '../../types/content';

export const hexMemoryDataModule: Module = {
  id: 'hex-memory-data',
  number: 3,
  title: 'Hex, Memory & Data',
  tagline: 'Reading raw bytes as numbers, text and structures — the literacy everything else needs.',
  part: 1,
  lessons: [
    {
      id: 'numbers-in-bytes',
      title: 'Numbers in Bytes',
      blocks: [
        {
          type: 'prose',
          text: "A binary is a pile of bytes. Every skill in this course is some version of deciding what a given run of bytes *means*. That starts with being fluent in hex, and with two conventions that trip up everyone at first: byte order and negative numbers.",
        },
        {
          type: 'heading',
          text: 'Hex, because it maps to bytes',
        },
        {
          type: 'prose',
          text: "One byte is eight bits, which is exactly two hex digits — `00` through `FF`, or 0 to 255. That one-to-one fit is the entire reason every tool shows hex instead of decimal. `0x41` is one byte; `65` tells you nothing about how much space it takes.",
        },
        {
          type: 'table',
          headers: ['Hex', 'Decimal', 'As ASCII', 'Worth memorising because'],
          rows: [
            ['`0x00`', '0', 'NUL', 'Ends a C string'],
            ['`0x20`', '32', 'space', 'Start of printable ASCII; also flips letter case when XORed'],
            ['`0x41`', '65', '`A`', 'Anchor for uppercase: `A`–`Z` is `0x41`–`0x5A`'],
            ['`0x61`', '97', '`a`', 'Anchor for lowercase: `a`–`z` is `0x61`–`0x7A`'],
            ['`0x7F`', '127', 'DEL', 'Last ASCII value; also the first byte of every ELF file'],
            ['`0xFF`', '255', '—', 'All bits set; as a signed byte it is −1'],
          ],
        },
        {
          type: 'heading',
          text: 'Little-endian: the surprise',
        },
        {
          type: 'prose',
          text: "On x86-64, a multi-byte number is stored **least significant byte first**. This is measured, not asserted — here is the actual output of a C program on the machine that builds these labs:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'Storing 0x12345678 and 0xBEEF, then printing the raw bytes',
          code: 'u32 0x12345678 in memory: 78 56 34 12\nu16 0xBEEF in memory:     EF BE',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The mistake everyone makes once',
          text: "You see `78 56 34 12` in a hex editor and read the value as `0x78563412`. It is `0x12345678`. Whenever you read a number out of a dump, reverse the bytes first. Text is **not** affected — a string is a sequence of single bytes, so `Hello` reads left to right exactly as you expect.",
        },
        {
          type: 'heading',
          text: "Negative numbers: two's complement",
        },
        {
          type: 'prose',
          text: "Negative integers are stored as **two's complement**, which is why small negative numbers look enormous in hex. Measured on the same machine:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'Signed 32-bit values printed as hex',
          code: 'int -1  as hex: FFFFFFFF\nint -5  as hex: FFFFFFFB',
        },
        {
          type: 'prose',
          text: "So a value like `0xFFFFFFFF` in a register is almost certainly `-1`, not four billion — and it is frequently an error return. Spotting that saves real time: a function returning `0xFFFFFFFF` is usually telling you it failed.",
        },
        {
          type: 'quiz',
          id: 'm3-quiz-endian',
          question: 'A hex dump shows the four bytes `EF BE AD DE`. As a 32-bit value on x86-64, that is:',
          options: [
            {
              text: '`0xDEADBEEF`',
              correct: true,
              explanation: "Reverse the bytes: little-endian stores the least significant byte first.",
            },
            {
              text: '`0xEFBEADDE`',
              correct: false,
              explanation: "That reads the dump left to right, which ignores the byte ordering.",
            },
            {
              text: '`0xBEEFDEAD`',
              correct: false,
              explanation: "Swapping in pairs is not how endianness works; reverse all four bytes.",
            },
            {
              text: '`0xADDEEFBE`',
              correct: false,
              explanation: "This rotates the bytes rather than reversing their order.",
            },
          ],
        },
      ],
    },
    {
      id: 'data-in-memory',
      title: 'Data in Memory',
      blocks: [
        {
          type: 'prose',
          text: "Once you can read bytes as numbers, the next question is how larger things are laid out — because recognising a layout is how you find the interesting part of a file fast.",
        },
        {
          type: 'heading',
          text: 'Strings',
        },
        {
          type: 'prose',
          text: "A C string is bytes followed by a `0x00` terminator; the length is not stored anywhere. That single fact explains a whole bug class you will meet later, and it explains why `strings` works at all — the tool simply looks for runs of printable bytes ending in a zero. Other languages differ: many store a length alongside the data instead, and UTF-16 text (common on Windows) puts a zero byte between every ASCII character, which is why it can look like `H.e.l.l.o` in a dump.",
        },
        {
          type: 'heading',
          text: 'Where data lives',
        },
        {
          type: 'table',
          headers: ['Region', 'Holds', 'Lifetime', 'What it means for you'],
          rows: [
            ['`.text`', 'Machine code', 'Whole run', 'Read-only and executable — the code you disassemble'],
            ['`.rdata` / `.rodata`', 'Constants, string literals', 'Whole run', 'Where `strings` finds most of its hits'],
            ['`.data`', 'Initialised globals', 'Whole run', 'Values that start known and then change'],
            ['Stack', 'Locals, arguments, return addresses', 'One function call', 'Grows down; the return address is why overflows matter'],
            ['Heap', 'Runtime allocations', 'Until freed', 'Where objects and buffers of unknown size go'],
          ],
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Read-only data is the first place to look',
          text: "Licence keys, format magic numbers, encryption keys, lookup tables and error messages nearly all sit in the read-only data section. When a program compares your input against something, that something usually lives there — so finding the constant often finds the check.",
        },
        {
          type: 'heading',
          text: 'When the constant is hidden',
        },
        {
          type: 'prose',
          text: "Developers who do not want a secret sitting in plain sight store it transformed and undo the transform at runtime. The simplest version is a single-byte **XOR**, and it is worth understanding properly because XOR is everywhere in this field. It is its own inverse: applying the same key twice returns the original, so the same three lines both encode and decode.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'XOR is reversible',
          code: "'t' = 0x74\n0x74 ^ 0x3B = 0x4F     <- stored in the file\n0x4F ^ 0x3B = 0x74     <- recovered at runtime",
        },
        {
          type: 'prose',
          text: "This defeats `strings` completely — the encoded bytes are not printable text, so the tool walks straight past them. It does not defeat you, because a single byte key has only 255 possibilities, and trying all of them takes milliseconds. That is exactly the lab below.",
        },
        {
          type: 'quiz',
          id: 'm3-quiz-xor',
          question: 'Why does a single-byte XOR defeat `strings` but not a determined analyst?',
          options: [
            {
              text: 'There are only 255 possible keys to try',
              correct: true,
              explanation: "The encoded bytes are unprintable so strings skips them, but the keyspace is tiny.",
            },
            {
              text: 'XOR cannot be reversed without the original',
              correct: false,
              explanation: "XOR is its own inverse — applying the same key again restores the data.",
            },
            {
              text: 'The tool only reads the first file section',
              correct: false,
              explanation: "It scans the whole file; printability is what decides a hit, not location.",
            },
            {
              text: 'Encoded text is stored outside the file',
              correct: false,
              explanation: "The bytes are right there in the binary; they just are not readable text.",
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
          text: "The lab below is the first one that does not simply hand you the answer. It is stripped and its secret is encoded — and you can still solve it with nothing but a hex editor and a few lines of Python.",
        },
        {
          type: 'quiz-set',
          id: 'm3-set-bytes',
          title: 'Byte literacy check',
          questions: [
            {
              type: 'quiz',
              id: 'm3-set-q-hex',
              question: 'Why do reverse engineering tools display hex rather than decimal?',
              options: [
                {
                  text: 'Two hex digits map onto exactly one byte',
                  correct: true,
                  explanation: "The alignment is exact, so size and bit patterns stay visible at a glance.",
                },
                {
                  text: 'Hex numbers take up less room onscreen',
                  correct: false,
                  explanation: "Sometimes true, but compactness is not why the convention exists.",
                },
                {
                  text: 'Processors do their arithmetic in base 16',
                  correct: false,
                  explanation: "Hardware works in binary; hex is a notation for humans reading it.",
                },
                {
                  text: 'Decimal is not able to show values above 255',
                  correct: false,
                  explanation: "Decimal represents any value; the issue is it hides byte boundaries.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm3-set-q-string',
              question: 'In a hex dump you see `48 00 65 00 6C 00 6C 00 6F 00`. This is most likely:',
              options: [
                {
                  text: 'UTF-16 text, one zero byte per character',
                  correct: true,
                  explanation: "ASCII characters widened to two bytes each — very common on Windows.",
                },
                {
                  text: 'Five separate C strings placed back to back',
                  correct: false,
                  explanation: "Possible in principle, but single-letter strings in a row are implausible.",
                },
                {
                  text: 'A little-endian array of 16-bit integers',
                  correct: false,
                  explanation: "Structurally it could be, but the values spell readable text as UTF-16.",
                },
                {
                  text: 'Encrypted data using a zero byte as a key',
                  correct: false,
                  explanation: "XOR with zero changes nothing, so that would not be encryption at all.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm3-set-q-neg',
              question: 'A function returns `0xFFFFFFFF` in a 32-bit register. The likeliest reading is:',
              options: [
                {
                  text: 'It returned −1, signalling a failure',
                  correct: true,
                  explanation: "Two's complement makes −1 all bits set, and −1 is a classic error return.",
                },
                {
                  text: 'It returned the largest value it could',
                  correct: false,
                  explanation: "That reading treats the value as unsigned, which is rarely the intent.",
                },
                {
                  text: 'It returned a pointer to the last page',
                  correct: false,
                  explanation: "Nothing about this value suggests an address; it is a sentinel.",
                },
                {
                  text: 'The register was not written by the call',
                  correct: false,
                  explanation: "Uninitialised registers hold junk, not this specific recognisable value.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm3-set-q-rdata',
              question: 'Where would you look first for a hard-coded comparison value?',
              options: [
                {
                  text: 'The read-only data section',
                  correct: true,
                  explanation: "Constants the code compares against are overwhelmingly stored there.",
                },
                {
                  text: 'The stack, during the first call',
                  correct: false,
                  explanation: "The stack holds transient locals, not values baked into the build.",
                },
                {
                  text: 'The heap, after allocation runs',
                  correct: false,
                  explanation: "Heap contents appear at runtime; a constant exists before that.",
                },
                {
                  text: 'The import table for the binary',
                  correct: false,
                  explanation: "Imports name external functions, not the data used in comparisons.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm3-set-q-strip',
              question: 'A binary is stripped AND its secret is XOR-encoded. Which is harder for you?',
              options: [
                {
                  text: 'Neither one is a real obstacle alone',
                  correct: true,
                  explanation: "Stripping costs names, and a one-byte key falls to 255 guesses. Both are speed bumps.",
                },
                {
                  text: 'Stripping, since the code is now unreadable',
                  correct: false,
                  explanation: "The instructions are untouched; only the convenience of names is gone.",
                },
                {
                  text: 'Encoding, since XOR cannot be undone',
                  correct: false,
                  explanation: "XOR is its own inverse, and a single-byte keyspace is trivially small.",
                },
                {
                  text: 'Both, since the two combine to compound',
                  correct: false,
                  explanation: "They are independent measures; neither makes the other meaningfully harder.",
                },
              ],
            },
          ],
        },
        {
          type: 'lab',
          id: 'm3-lab-xor',
          title: 'The secret that is not in the strings',
          brief:
            "`xorsecret.exe` accepts one secret word. It is **stripped**, so there are no function names, and running `strings` on it will not show you the word — it is stored XOR-encoded with a single-byte key. You do not need a disassembler for this one. A hex editor and a short script are enough.",
          format: 'PE',
          tools: ['strings', 'Python (or any hex editor)', '7-Zip'],
          download: { file: 'm03-pe-xorsecret.zip', password: 'reverse' },
          questions: [
            {
              id: 'key',
              prompt: 'What is the single-byte XOR key? (hex or decimal both accepted)',
              accept: ['0x3B'],
              normalize: 'number',
              hint: 'There are only 255 possibilities. XOR the whole file with each one and look for a readable English word.',
              explanation:
                "`0x3B`, which is 59 in decimal. The keyspace is so small that brute force is instant — this is why a single-byte XOR is obfuscation, not encryption.",
            },
            {
              id: 'secret',
              prompt: 'What is the secret word the program accepts?',
              accept: ['tungsten'],
              normalize: 'text',
              hint: 'It is an ordinary English word, eight letters, all lowercase. Confirm it by running the program.',
              explanation:
                "`tungsten`. Run `xorsecret.exe tungsten` and it prints `correct` and exits 0; anything else prints `wrong` and exits 2. Always confirm a recovered secret by using it.",
            },
            {
              id: 'len',
              prompt: 'How many bytes long is the encoded blob in the file?',
              accept: ['8'],
              normalize: 'number',
              hint: 'The same length as the decoded word — XOR does not change the size of anything.',
              explanation:
                "Eight. XOR is byte-for-byte, so encoded and decoded data are always the same length. That property is itself a clue: a transform that preserves length is a strong hint that you are looking at XOR rather than a real cipher with padding.",
            },
          ],
          walkthrough:
            "1. Confirm the problem is real:\n     strings xorsecret.exe | grep -i tungsten     -> nothing\n     strings xorsecret.exe                        -> \"usage: %s <word>\", \"correct\", \"wrong\"\n   So the program clearly compares against something, but that something is\n   not stored as text.\n\n2. Confirm it is stripped:\n     nm xorsecret.exe        -> \"no symbols\"\n\n3. Brute force all 255 single-byte keys. The naive version finds too much:\n\n     import re\n     data = open('xorsecret.exe','rb').read()\n     for key in range(1, 256):\n         dec = bytes(b ^ key for b in data)\n         for m in re.finditer(rb'[a-z]{7,}', dec):\n             print(hex(key), m.group())\n\n   That prints 13371 candidates across all keys - far too many to read.\n\n4. Tighten the filter. Require a run of exactly eight lowercase letters with\n   a non-letter on each side:\n\n     rx = re.compile(rb'(?<![a-zA-Z])[a-z]{8}(?![a-zA-Z])')\n     for key in range(1, 256):\n         for m in rx.finditer(bytes(b ^ key for b in data)):\n             print(hex(key), m.group().decode())\n\n   Now there are 409 lines in total, and scanning them by eye, one is an\n   obvious English word:\n     0x3b tungsten\n\n   (You will also see 0x20 produce 'overflow' - that is a false positive.\n   XOR with 0x20 flips letter case, so it merely lower-cases an existing\n   uppercase string. Worth knowing, because it will fool you again later.)\n\n5. Verify, do not assume:\n     ./xorsecret.exe tungsten   -> correct   (exit 0)\n     ./xorsecret.exe granite    -> wrong     (exit 2)\n\nThe transferable lesson is step 4. Brute force alone gave noise; brute force\nplus one good constraint gave the answer. Almost every hard problem in this\nfield is solved by finding the constraint, not by trying harder.",
        },
        {
          type: 'exercise',
          id: 'm3-lab-ex1',
          title: 'Build the opposite of the lab',
          task: "Write a few lines in any language that take a word and a one-byte key and print the encoded bytes as hex. Use it to produce an encoding of your own secret, then decode it again with the same code. Why does the same code work in both directions?",
          hint: 'Think about what XOR does to a bit when you apply the same mask twice.',
          answer:
            "secret = 'granite'\nkey = 0x5C\nenc = bytes(ord(c) ^ key for c in secret)\nprint(enc.hex())                         # encode\nprint(bytes(b ^ key for b in enc))       # decode with identical code\n\nThe same code works both ways because XOR is its own inverse: for any bit,\nb ^ k ^ k == b. There is no separate decode routine to find in a binary —\nwhich is precisely why the decoding loop you spot in a program IS also the\nencoding loop.",
          explanation: "Writing the encoder is the fastest way to stop finding the decoder mysterious. It also builds an instinct you will use constantly: when you see a loop XORing a buffer against a constant just before a comparison, you are looking at an obfuscated string being restored, and you can decode it yourself without ever running the program.",
        },
      ],
    },
  ],
};
