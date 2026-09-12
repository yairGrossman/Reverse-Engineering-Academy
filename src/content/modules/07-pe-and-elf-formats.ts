/**
 * SOURCES (verified while writing this module):
 *
 * FETCHED — PE, from Microsoft's own specification
 * (https://learn.microsoft.com/en-us/windows/win32/debug/pe-format):
 * - "At location 0x3c, the stub has the file offset to the PE signature." The
 *   signature "is \"PE\\0\\0\" (the letters \"P\" and \"E\" followed by two null
 *   bytes)."
 * - COFF File Header: offset 0 Machine (2), offset 2 NumberOfSections (2) — "The
 *   number of sections. This indicates the size of the section table, which
 *   immediately follows the headers." — offset 16 SizeOfOptionalHeader (2).
 * - Optional Header standard fields: offset 16 AddressOfEntryPoint (4), "The
 *   address of the entry point relative to the image base when the executable
 *   file is loaded into memory."
 * - Optional Header Windows-specific: ImageBase (8 bytes on PE32+), "The
 *   preferred address of the first byte of image when loaded into memory; must be
 *   a multiple of 64 K"; SectionAlignment, "The alignment (in bytes) of sections
 *   when they are loaded into memory ... The default is the page size for the
 *   architecture."; FileAlignment, "The alignment factor (in bytes) that is used
 *   to align the raw data of sections in the image file. The value should be a
 *   power of 2 between 512 and 64 K, inclusive. The default is 512."
 * - Section header: offset 12 VirtualAddress, "the address of the first byte of
 *   the section relative to the image base when the section is loaded into
 *   memory"; offset 20 PointerToRawData, "The file pointer to the first page of
 *   the section within the COFF file. For executable images, this must be a
 *   multiple of FileAlignment from the optional header."
 * - RVA, defined: "In an image file, this is the address of an item after it is
 *   loaded into memory, with the base address of the image file subtracted from
 *   it. The RVA of an item almost always differs from its position within the
 *   file on disk (file pointer)."
 *
 * FETCHED — ELF, from the System V gABI
 * (https://www.sco.com/developers/gabi/latest/ch4.sheader.html; the header
 * chapter ch4.eheader.html was already cited by module 2):
 * - sh_offset "gives the byte offset from the beginning of the file to the first
 *   byte in the section"; sh_addr, "If the section will appear in the memory
 *   image of a process, this member gives the address at which the section's
 *   first byte should reside."; sh_name is "an index into the section header
 *   string table section"; sh_size "gives the section's size in bytes".
 * - Flags: SHF_EXECINSTR "The section contains executable machine instructions.";
 *   SHF_ALLOC "The section occupies memory during process execution.";
 *   SHF_WRITE "The section contains data that should be writable during process
 *   execution."
 * - Special sections: .text "holds the 'text,' or executable instructions, of a
 *   program"; .rodata sections "hold read-only data that typically contribute to
 *   a non-writable segment in the process image"; .data sections "hold
 *   initialized data that contribute to the program's memory image".
 *
 * MEASURED on the course build machine. Both artifacts come from ONE source file,
 * labs/src/m07-pe-headers/headers.c — the PE with mingw gcc 15.2.0 -O1, the ELF
 * with `zig cc -target x86_64-linux-gnu` -O1, neither stripped.
 *
 * PE (headers.exe), read with objdump and by parsing the headers directly:
 * - `objdump -f` -> "start address 0x0000000140001400", format pei-x86-64.
 * - e_lfanew at 0x3C = 0x80; bytes at 0x80 = "PE\0\0".
 * - Machine = 0x8664; NumberOfSections = 19; SizeOfOptionalHeader = 0xF0;
 *   optional header magic = 0x020B (PE32+).
 * - AddressOfEntryPoint = 0x1400 (an RVA); ImageBase = 0x140000000; so the entry
 *   VA is 0x140001400, matching objdump.
 * - SectionAlignment = 0x1000; FileAlignment = 0x200.
 * - `objdump -h` section table (Size / VMA / File off):
 *     .text  0x1880  0x140001000  0x600
 *     .data  0x00a0  0x140003000  0x2000
 *     .rdata 0x0bc8  0x140004000  0x2200
 *     .pdata 0x0204  0x140005000  0x2e00
 *     .xdata 0x0194  0x140006000  0x3200
 *     .idata 0x0854  0x140008000  0x3400
 * - The marker string "REA-HEADERS-LAB-M07" sits at file offset 0x2230, inside
 *   .rdata (VirtualAddress 0x4000, PointerToRawData 0x2200), so
 *     RVA  = 0x4000 + (0x2230 - 0x2200) = 0x4030      VA = 0x140004030
 *     back = 0x2200 + (0x4030 - 0x4000) = 0x2230
 * - `objdump -p` imports: KERNEL32.dll (DeleteCriticalSection,
 *   EnterCriticalSection, ...) plus the UCRT API sets, e.g.
 *   api-ms-win-crt-environment-l1-1-0.dll and api-ms-win-crt-heap-l1-1-0.dll.
 *
 * ELF (headers), read with readelf and by locating the marker directly:
 * - `readelf -h`: Magic "7f 45 4c 46 02 01 01 00", Class ELF64, Data "2's
 *   complement, little endian", OS/ABI "UNIX - System V", Type "EXEC (Executable
 *   file)", Machine "Advanced Micro Devices X86-64", Entry point address
 *   0x10014b0, start of program headers 64, start of section headers 7104, size
 *   of program headers 56, Number of program headers 10, size of section headers
 *   64, Number of section headers 32, section header string table index 30.
 * - `readelf -lW` program headers: PHDR, INTERP requesting
 *   "/lib64/ld-linux-x86-64.so.2", LOAD (R) at 0x1000000, LOAD (R E) at
 *   0x10014b0, LOAD (RW) at 0x10025e0, DYNAMIC at 0x10025e0.
 * - The marker is at file offset 0x420, inside .rodata (sh_addr 0x1000400,
 *   sh_offset 0x400, sh_size 0x34), so its virtual address is 0x1000420 — in this
 *   build offset and address differ by a constant 0x1000000 across the file.
 * - Behaviour: `headers.exe` prints "headers lab: run with --marker" and exits 1;
 *   `headers.exe --marker` prints "REA-HEADERS-LAB-M07" and exits 0.
 */
import type { Module } from '../../types/content';

export const peElfFormatsModule: Module = {
  id: 'pe-and-elf-formats',
  number: 7,
  title: 'PE and ELF File Formats',
  tagline: 'The containers around the code: headers, sections, imports, and the arithmetic that turns an address into a place in a file.',
  part: 2,
  lessons: [
    {
      id: 'the-pe-container',
      title: 'Inside a PE File',
      blocks: [
        {
          type: 'prose',
          text: "Everything so far treated a binary as code with some data attached. It is really a **container**: a set of headers telling the loader what to map where, which libraries to pull in, and where to start. Reading that container is how you orient yourself in a file you have never seen, and it is the last piece of groundwork before the managed formats in Part 3.",
        },
        {
          type: 'heading',
          text: 'Four headers, in order',
        },
        {
          type: 'prose',
          text: "A PE file opens with the MS-DOS stub you met in module 2. The specification is precise about how to get past it: **at location 0x3c, the stub has the file offset to the PE signature**, and that signature is `PE\\0\\0`. In this module's lab binary, the value at `0x3C` is `0x80`, and the four bytes at `0x80` are exactly `PE\\0\\0`.",
        },
        {
          type: 'table',
          headers: ['Structure', 'Holds', 'Fields worth knowing'],
          rows: [
            ['DOS stub', 'Legacy header and a stub program', 'The offset at `0x3C`'],
            ['COFF file header', 'Machine and layout counts', '`Machine`, `NumberOfSections`, `SizeOfOptionalHeader`'],
            ['Optional header', 'Loader instructions', '`AddressOfEntryPoint`, `ImageBase`, `SectionAlignment`, `FileAlignment`'],
            ['Section table', 'One entry per section', '`VirtualAddress`, `PointerToRawData`, size, characteristics'],
          ],
        },
        {
          type: 'prose',
          text: "The optional header is not optional for an executable — the name is historical. Its first field is a magic number that tells you the bit width: the lab binary reads `0x020B`, which is PE32+, meaning 64-bit. Immediately useful, because it also tells you `ImageBase` will be eight bytes rather than four.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'The lab binary, read straight out of its headers',
          code: `e_lfanew at 0x3C      = 0x80        -> "PE\\0\\0" at 0x80
Machine               = 0x8664      (x86-64)
NumberOfSections      = 19
SizeOfOptionalHeader  = 0xF0
Optional header magic = 0x020B      (PE32+, so 64-bit)
AddressOfEntryPoint   = 0x1400      (an RVA, not a file offset)
ImageBase             = 0x140000000
SectionAlignment      = 0x1000
FileAlignment         = 0x200`,
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'What an RVA is, in the spec\u2019s own words',
          text: "A relative virtual address is \"the address of an item after it is loaded into memory, with the base address of the image file subtracted from it\", and the specification adds the warning that matters: it \"almost always differs from its position within the file on disk\". `AddressOfEntryPoint = 0x1400` plus `ImageBase = 0x140000000` gives the entry virtual address `0x140001400` — which is exactly what `objdump -f` reports as the start address.",
        },
        {
          type: 'heading',
          text: 'Sections, and why there are nineteen of them',
        },
        {
          type: 'prose',
          text: "Nineteen sections for a program that prints one string sounds absurd until you look at what they are. Alongside the familiar three, a mingw-built PE carries exception-handling tables, import data, and several debug sections:",
        },
        {
          type: 'table',
          headers: ['Section', 'Virtual address', 'File offset', 'Contains'],
          rows: [
            ['`.text`', '`0x140001000`', '`0x600`', 'Code'],
            ['`.data`', '`0x140003000`', '`0x2000`', 'Writable initialised data'],
            ['`.rdata`', '`0x140004000`', '`0x2200`', 'Read-only data, including our marker string'],
            ['`.pdata`', '`0x140005000`', '`0x2e00`', 'Exception-unwind tables (module 4 mentioned these)'],
            ['`.xdata`', '`0x140006000`', '`0x3200`', 'The unwind data those tables point at'],
            ['`.idata`', '`0x140008000`', '`0x3400`', 'Import directory: which DLL provides what'],
          ],
        },
        {
          type: 'prose',
          text: "Look at the two address columns and the point of the next lesson becomes obvious. `.rdata` lives at virtual address `0x140004000` but at file offset `0x2200`. Those numbers are not the same and never will be, because the loader aligns sections to `0x1000` in memory while the file packs them to `0x200`.",
        },
        {
          type: 'heading',
          text: 'Imports name the program\u2019s dependencies for you',
        },
        {
          type: 'prose',
          text: "`objdump -p` prints the import directory, and it is the fastest summary of what a Windows binary can do. The lab file imports from `KERNEL32.dll` — `EnterCriticalSection`, `DeleteCriticalSection` and friends — plus a set of names like `api-ms-win-crt-heap-l1-1-0.dll` and `api-ms-win-crt-environment-l1-1-0.dll`.",
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Those api-ms-win-crt names are not real files on disk',
          text: "They are API sets: indirections the loader resolves to whichever library actually implements them. For analysis the practical consequence is that looking for `msvcrt.dll` in a modern binary and concluding it uses no C runtime is a mistake — the runtime arrived under an API set name instead.",
        },
        {
          type: 'quiz',
          id: 'm7-quiz-rva',
          question: 'A PE header gives `AddressOfEntryPoint = 0x1400` and `ImageBase = 0x140000000`. Where does execution begin?',
          options: [
            {
              text: 'At virtual address `0x140001400`',
              correct: true,
              explanation: "The entry point is an RVA, so add the image base. objdump reports exactly this as the start address.",
            },
            {
              text: 'At file offset `0x1400` in the file',
              correct: false,
              explanation: "An RVA is a memory address minus the base, and the spec warns it almost always differs from the file offset.",
            },
            {
              text: 'At virtual address `0x1400` once loaded',
              correct: false,
              explanation: "That ignores the image base, which is exactly the value an RVA has had subtracted from it.",
            },
            {
              text: 'Wherever the first section happens to begin',
              correct: false,
              explanation: "Execution starts at the recorded entry point, which is usually inside the first section but not at its start.",
            },
          ],
        },
      ],
    },
    {
      id: 'the-elf-container',
      title: 'Inside an ELF File',
      blocks: [
        {
          type: 'prose',
          text: "ELF solves the same problem with a different shape, and its one genuinely important idea has no PE equivalent worth the name: a file is described **twice**, once for the linker and once for the loader.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'readelf -h on the ELF twin of the same source',
          code: `Magic:                     7f 45 4c 46 02 01 01 00
Class:                     ELF64
Data:                      2's complement, little endian
OS/ABI:                    UNIX - System V
Type:                      EXEC (Executable file)
Machine:                   Advanced Micro Devices X86-64
Entry point address:       0x10014b0
Start of program headers:  64 (bytes into file)
Start of section headers:  7104 (bytes into file)
Number of program headers: 10
Number of section headers: 32
Section header string table index: 30`,
        },
        {
          type: 'prose',
          text: "The header is a directory of the rest of the file: where the two header tables live, how many entries each has, and where to start executing. Note that the ELF entry point is a **virtual address**, `0x10014b0`, not a relative one — no base to add.",
        },
        {
          type: 'heading',
          text: 'Sections for the linker, segments for the loader',
        },
        {
          type: 'table',
          headers: ['', 'Section headers', 'Program headers'],
          rows: [
            ['Count in the lab file', '32', '10'],
            ['Audience', 'Linkers, debuggers, analysts', 'The kernel and the dynamic loader'],
            ['Granularity', 'Named, fine-grained (`.text`, `.rodata`, ...)', 'Coarse: one entry per mapping'],
            ['Can be absent', 'Yes — stripping can remove them', 'No: without them it cannot be run'],
            ['Key fields', '`sh_name`, `sh_addr`, `sh_offset`, `sh_size`, `sh_flags`', 'Type, Offset, VirtAddr, FileSiz, MemSiz, flags'],
          ],
        },
        {
          type: 'prose',
          text: "The gABI is explicit about the section fields: `sh_offset` \"gives the byte offset from the beginning of the file to the first byte in the section\", while `sh_addr` gives \"the address at which the section's first byte should reside\" if it appears in the process image. One is a place in a file, the other a place in memory — the same distinction PE draws with `PointerToRawData` and `VirtualAddress`.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'readelf -lW — what the loader is actually told to do',
          code: `Type     Offset    VirtAddr     FileSiz  MemSiz   Flg
PHDR     0x000040  0x01000040   0x000230 0x000230 R
INTERP   0x000270  0x01000270   0x00001c 0x00001c R
    [Requesting program interpreter: /lib64/ld-linux-x86-64.so.2]
LOAD     0x000000  0x01000000   0x0004ac 0x0004ac R
LOAD     0x0004b0  0x010014b0   0x000130 0x000130 R E
LOAD     0x0005e0  0x010025e0   0x000180 0x000a20 RW
DYNAMIC  0x0005e0  0x010025e0   0x000150 0x000150 RW`,
        },
        {
          type: 'list',
          items: [
            '**INTERP** names the dynamic loader — `/lib64/ld-linux-x86-64.so.2` here. Its presence means the binary is dynamically linked; a static binary has no INTERP.',
            '**The three LOADs** are read-only headers and data, read-plus-execute code, and read-write data. The one marked `R E` starts at `0x10014b0`, which is also the entry point.',
            '**MemSiz larger than FileSiz** on the RW segment (`0xa20` against `0x180`) is the `.bss`: zero-initialised data that costs nothing in the file.',
            '**DYNAMIC** points at the table the loader reads for libraries and relocations.',
          ],
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Section flags say what a section is for',
          text: "The gABI defines them tersely. `SHF_EXECINSTR`: \"The section contains executable machine instructions.\" `SHF_ALLOC`: \"The section occupies memory during process execution.\" `SHF_WRITE`: \"The section contains data that should be writable during process execution.\" A section with `ALLOC` but not `WRITE` is where constants live — the ELF equivalent of `.rdata`, and the first place to look for tables and strings.",
        },
        {
          type: 'quiz',
          id: 'm7-quiz-segments',
          question: 'Why does an ELF file describe its contents with both section headers and program headers?',
          options: [
            {
              text: 'They serve the linker and the loader',
              correct: true,
              explanation: "Sections are fine-grained information for link time and analysis; segments tell the kernel what to map at run time.",
            },
            {
              text: 'One of the two is a legacy leftover',
              correct: false,
              explanation: "Both are current and both are used, by different consumers at different times in a binary's life.",
            },
            {
              text: 'Program headers describe only debug data',
              correct: false,
              explanation: "Program headers describe mappings, including code and data; debug information lives in sections.",
            },
            {
              text: 'Section headers exist only in static binaries',
              correct: false,
              explanation: "Dynamically linked files have them too, and stripping can remove them from either kind.",
            },
          ],
        },
      ],
    },
    {
      id: 'address-arithmetic',
      title: 'Address Arithmetic That Actually Works',
      blocks: [
        {
          type: 'prose',
          text: "You will do this conversion constantly: a tool gives you an address, and you need the byte in the file — or the reverse. It is two subtractions and an addition, and getting it wrong sends you to a plausible but wrong place, which is worse than getting nothing.",
        },
        {
          type: 'heading',
          text: 'RVA to file offset, in a PE',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            'Find the section whose `VirtualAddress` range contains the RVA.',
            "Subtract that section's `VirtualAddress` to get the offset within the section.",
            "Add the section's `PointerToRawData`.",
          ],
        },
        {
          type: 'code',
          language: 'text',
          title: 'The marker string in the lab binary, both directions',
          code: `.rdata:  VirtualAddress = 0x4000    PointerToRawData = 0x2200

RVA -> file offset
  0x2200 + (0x4030 - 0x4000) = 0x2230

file offset -> RVA
  0x4000 + (0x2230 - 0x2200) = 0x4030

full virtual address
  0x140000000 + 0x4030 = 0x140004030`,
        },
        {
          type: 'prose',
          text: "Both directions were checked against the real file: the bytes at offset `0x2230` are the string `REA-HEADERS-LAB-M07`, and the string's address in a disassembler is `0x140004030`. Notice that the gap between address and offset is `0x1E00` for this section and would be different for another — which is why you must find the containing section first rather than applying one global difference.",
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Where the gap comes from',
          text: "`SectionAlignment` is `0x1000` and `FileAlignment` is `0x200`. Sections are padded to a page in memory but only to 512 bytes on disk, so each section shifts differently between the two views. Assuming a single constant difference works until the second section, then silently stops working.",
        },
        {
          type: 'heading',
          text: 'The same job in an ELF',
        },
        {
          type: 'prose',
          text: "ELF gives you `sh_addr` and `sh_offset` per section, so the arithmetic is identical in spirit. In the lab's ELF, `.rodata` has `sh_addr = 0x1000400` and `sh_offset = 0x400`, and the marker sits at file offset `0x420`:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'ELF: offset to address',
          code: `.rodata:  sh_addr = 0x1000400    sh_offset = 0x400

0x1000400 + (0x420 - 0x400) = 0x1000420`,
        },
        {
          type: 'prose',
          text: "In this particular build every mapped byte happens to sit `0x1000000` above its file offset, so a single subtraction would have worked. Do not generalise from that: it is a property of how this file was linked, not a rule of the format. Use the section fields, and the answer is right in both formats and every build.",
        },
        {
          type: 'heading',
          text: 'Three numbers for the same byte',
        },
        {
          type: 'table',
          headers: ['Number', 'Where it comes from', 'Useful for'],
          rows: [
            ['File offset', 'Section header', 'Hex editors, patching, `xxd`'],
            ['Virtual address', 'File offset plus section mapping', 'Reading a static disassembler'],
            ['Runtime address', 'The loader, this run', 'Breakpoints in a live process'],
          ],
        },
        {
          type: 'prose',
          text: "Module 6 showed the third one biting: a breakpoint on `0x1400014c0` failed because the process was loaded elsewhere. With this lesson you can convert between the first two by hand, and a debugger gives you the third. Patching in module 13 needs the first, reading Ghidra needs the second, and setting a breakpoint needs the third.",
        },
        {
          type: 'quiz',
          id: 'm7-quiz-offset',
          question: 'A section has `VirtualAddress 0x4000` and `PointerToRawData 0x2200`. Which file offset holds RVA `0x4030`?',
          options: [
            {
              text: '`0x2230`, from 0x2200 plus 0x30',
              correct: true,
              explanation: "The RVA is 0x30 into the section, and the section's raw data starts at 0x2200 in the file.",
            },
            {
              text: '`0x4030`, because offsets match RVAs',
              correct: false,
              explanation: "They coincide only by accident; the specification warns explicitly that the two normally differ.",
            },
            {
              text: '`0x6230`, adding the two values',
              correct: false,
              explanation: "Adding an address to an offset produces a number that means nothing in either address space.",
            },
            {
              text: '`0x1E00`, the gap between the two fields',
              correct: false,
              explanation: "That difference is real and worth noticing, but it is the correction term rather than the answer.",
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
          text: "Two files, one source. Neither has a secret to find — the questions are all about the container, because being fluent with headers is what lets you land in the right place in every later module.",
        },
        {
          type: 'quiz-set',
          id: 'm7-set-formats',
          title: 'Container literacy check',
          questions: [
            {
              type: 'quiz',
              id: 'm7-set-q-pesig',
              question: 'How do you find the PE header in a PE file?',
              options: [
                {
                  text: 'Read the file offset stored at `0x3C`',
                  correct: true,
                  explanation: "The spec puts the offset to the PE signature at 0x3c, and the signature there is PE followed by two nulls.",
                },
                {
                  text: 'Scan the file for the bytes `PE\\0\\0`',
                  correct: false,
                  explanation: "It usually works and it is how a naive parser gets fooled, since those bytes can appear in data.",
                },
                {
                  text: 'It begins at file offset `0x80` here',
                  correct: false,
                  explanation: "0x80 is what this lab binary happens to use; the stub size varies between toolchains.",
                },
                {
                  text: 'Take the entry point and subtract the image base',
                  correct: false,
                  explanation: "That converts an entry point to an RVA and has nothing to do with locating the headers.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm7-set-q-nsections',
              question: 'Which field tells you how many section headers to read?',
              options: [
                {
                  text: '`NumberOfSections`, in the COFF header',
                  correct: true,
                  explanation: "The spec says it indicates the size of the section table, which follows immediately after the headers.",
                },
                {
                  text: '`SizeOfOptionalHeader`, in the same header',
                  correct: false,
                  explanation: "That tells you where the section table starts, not how many entries it has.",
                },
                {
                  text: '`SectionAlignment`, in the optional header',
                  correct: false,
                  explanation: "Alignment describes how sections are laid out in memory, not how many exist.",
                },
                {
                  text: '`NumberOfSymbols`, further down the COFF header',
                  correct: false,
                  explanation: "That counts symbol table entries, which is a different table entirely and often zero.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm7-set-q-interp',
              question: 'An ELF program header of type INTERP names `/lib64/ld-linux-x86-64.so.2`. What does that mean?',
              options: [
                {
                  text: 'The binary is dynamically linked',
                  correct: true,
                  explanation: "INTERP names the dynamic loader the kernel must start first; a static binary has no such entry.",
                },
                {
                  text: 'The binary is a shared library itself',
                  correct: false,
                  explanation: "Type EXEC against DYN tells you that, and a library does not request an interpreter for itself.",
                },
                {
                  text: 'The program is a script in disguise',
                  correct: false,
                  explanation: "Scripts use a shebang line in a text file; this is a segment inside a real ELF binary.",
                },
                {
                  text: 'Debug information is stored in that library',
                  correct: false,
                  explanation: "Debug data lives in the file's own sections, or in a separate file next to it.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm7-set-q-bss',
              question: 'A LOAD segment has FileSiz `0x180` but MemSiz `0xa20`. What is the difference?',
              options: [
                {
                  text: 'Zero-initialised data costing no file space',
                  correct: true,
                  explanation: "The `.bss` is described rather than stored: the loader maps the extra bytes and zeroes them.",
                },
                {
                  text: 'Space reserved for future relocation entries',
                  correct: false,
                  explanation: "Relocations are stored data with their own sections, so they do occupy file space.",
                },
                {
                  text: 'Padding the linker inserted for alignment',
                  correct: false,
                  explanation: "Alignment padding appears in both figures, since it is present in the file as well.",
                },
                {
                  text: 'Compressed data expanded during loading',
                  correct: false,
                  explanation: "A plain ELF is not compressed; that is packing, which module 12 covers separately.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm7-set-q-gap',
              question: 'Why is a single global difference between addresses and file offsets unsafe in a PE?',
              options: [
                {
                  text: 'Each section shifts by a different amount',
                  correct: true,
                  explanation: "Memory alignment is 0x1000 and file alignment 0x200, so the two views drift apart per section.",
                },
                {
                  text: 'The image base changes when the file loads',
                  correct: false,
                  explanation: "Relocation affects runtime addresses; the file-to-RVA relationship is fixed inside the file.",
                },
                {
                  text: 'Section headers store only sizes, not offsets',
                  correct: false,
                  explanation: "They store both VirtualAddress and PointerToRawData, which is what makes the conversion possible.",
                },
                {
                  text: 'Compilers write the section table out of order',
                  correct: false,
                  explanation: "Order is not the problem; differing alignment between the two views is.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm7-set-q-apiset',
              question: 'A modern Windows binary imports `api-ms-win-crt-heap-l1-1-0.dll`. What is that?',
              options: [
                {
                  text: 'An API set the loader resolves elsewhere',
                  correct: true,
                  explanation: "API set names are indirections; the loader maps them onto whichever library implements the functions.",
                },
                {
                  text: 'A private DLL shipped beside the program',
                  correct: false,
                  explanation: "No such file usually sits next to the binary, which is why looking for one confuses people.",
                },
                {
                  text: 'Evidence that the binary was packed',
                  correct: false,
                  explanation: "Packed files tend to import very little; a long API set list is ordinary modern linkage.",
                },
                {
                  text: 'A delay-loaded import resolved on demand',
                  correct: false,
                  explanation: "Delay loading is a separate mechanism with its own directory, unrelated to API set naming.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm7-set-q-threenumbers',
              question: 'You want to patch a byte you found at virtual address `0x140004030`. Which number do you need?',
              options: [
                {
                  text: 'Its file offset, via the section headers',
                  correct: true,
                  explanation: "A hex editor addresses the file, so convert through the containing section's two address fields.",
                },
                {
                  text: 'Its runtime address in the live process',
                  correct: false,
                  explanation: "That is what a debugger needs for a breakpoint, not what an on-disk edit needs.",
                },
                {
                  text: 'The RVA on its own, with no conversion',
                  correct: false,
                  explanation: "The RVA is the middle step; using it directly as a file offset writes to the wrong place.",
                },
                {
                  text: 'The image base, subtracted from the address',
                  correct: false,
                  explanation: "That gives you the RVA, which still has to be converted before the file can be edited.",
                },
              ],
            },
          ],
        },
        {
          type: 'lab',
          id: 'm7-lab-pe',
          title: 'Read a PE by its headers',
          brief:
            "`headers.exe` does almost nothing on purpose. Every question below is answered from the file's own headers, using `objdump` or a hex editor — no disassembly needed. The last one asks you to do the RVA conversion by hand and check it against the bytes.",
          format: 'PE',
          tools: ['objdump', 'a hex viewer', '7-Zip'],
          download: { file: 'm07-pe-headers.zip', password: 'reverse' },
          questions: [
            {
              id: 'peoff',
              prompt: 'What file offset does the value at 0x3C point to?',
              accept: ['0x80', '80'],
              normalize: 'hex',
              hint: 'Read four little-endian bytes at 0x3C: `od -An -tx4 -j 0x3c -N4 headers.exe`.',
              explanation:
                "0x80, and the four bytes there are `PE\\0\\0`. This indirection is why you never scan a PE for its signature — the header tells you where it is.",
            },
            {
              id: 'nsections',
              prompt: 'How many sections does the file have?',
              accept: ['19'],
              normalize: 'number',
              hint: '`NumberOfSections` is two bytes at offset 2 of the COFF header, which begins right after the four signature bytes. Or count the rows in `objdump -h`.',
              explanation:
                "19. A trivial program carries code, data, imports, exception tables and a stack of debug sections — the count alone tells you the toolchain was mingw rather than a lean hand-built file.",
            },
            {
              id: 'entryrva',
              prompt: 'What is the entry point RVA?',
              accept: ['0x1400', '1400'],
              normalize: 'hex',
              hint: '`objdump -f` prints the start address as a full virtual address. Subtract the image base to get the RVA.',
              explanation:
                "0x1400. objdump reports `start address 0x0000000140001400`, and the image base is 0x140000000, so the stored `AddressOfEntryPoint` is 0x1400.",
            },
            {
              id: 'imagebase',
              prompt: 'What is the image base?',
              accept: ['0x140000000', '140000000'],
              normalize: 'hex',
              hint: 'Eight bytes in the optional header on PE32+. Or read it off the VMA column of `objdump -h` and round down to the 64K boundary.',
              explanation:
                "0x140000000, the usual default for a 64-bit mingw executable. The spec requires it to be a multiple of 64K.",
            },
            {
              id: 'markeroff',
              prompt: 'The marker string sits at RVA 0x4030. What file offset is that?',
              accept: ['0x2230', '2230'],
              normalize: 'hex',
              hint: '`.rdata` has VirtualAddress 0x4000 and PointerToRawData 0x2200. Find the offset within the section, then add the raw pointer.',
              explanation:
                "0x2230: 0x2200 + (0x4030 - 0x4000). Check it with `od -An -c -j 0x2230 -N19 headers.exe` and you get `REA-HEADERS-LAB-M07`.",
            },
          ],
          walkthrough:
            "1. Unzip, then get the quick summary:\n     objdump -f headers.exe\n       start address 0x0000000140001400\n     objdump -h headers.exe\n       .text  VMA 0x140001000  File off 0x600\n       .rdata VMA 0x140004000  File off 0x2200\n\n2. Walk the headers by hand, so the tool is confirming you rather than the\n   reverse:\n     od -An -tx4 -j 0x3c -N4 headers.exe      -> 00000080\n     od -An -c  -j 0x80 -N4 headers.exe       -> P E \\0 \\0\n\n   From the COFF header at 0x84: Machine 0x8664, NumberOfSections 19,\n   SizeOfOptionalHeader 0xF0. From the optional header: magic 0x020B (PE32+),\n   AddressOfEntryPoint 0x1400, ImageBase 0x140000000, SectionAlignment 0x1000,\n   FileAlignment 0x200.\n\n3. Entry point, both ways round:\n     RVA 0x1400 + base 0x140000000 = 0x140001400 = objdump's start address\n\n4. Convert the marker's RVA to a file offset:\n     .rdata VirtualAddress 0x4000, PointerToRawData 0x2200\n     0x2200 + (0x4030 - 0x4000) = 0x2230\n     od -An -c -j 0x2230 -N19 headers.exe   -> REA-HEADERS-LAB-M07\n\n5. See who the program depends on:\n     objdump -p headers.exe | grep 'DLL Name'\n       KERNEL32.dll\n       api-ms-win-crt-heap-l1-1-0.dll\n       api-ms-win-crt-environment-l1-1-0.dll   (and more)\n\nThe habit to keep: when a tool hands you an address, decide immediately which of\nthe three numbers it is — file offset, virtual address, or runtime address — and\nconvert deliberately. Most wasted hours in this craft start with using one where\nanother was meant.",
        },
        {
          type: 'lab',
          id: 'm7-lab-elf',
          title: 'Read an ELF by its headers',
          brief:
            "`headers` is the Linux twin of the same source. Use `readelf` and answer from the header tables. Pay attention to the two different tables — the questions deliberately ask about both.",
          format: 'ELF',
          tools: ['readelf', 'a hex viewer', '7-Zip'],
          download: { file: 'm07-elf-headers.zip', password: 'reverse' },
          questions: [
            {
              id: 'entry',
              prompt: 'What is the entry point address?',
              accept: ['0x10014b0', '10014b0'],
              normalize: 'hex',
              hint: '`readelf -h headers` prints it directly. Note that ELF stores a virtual address here, not a relative one.',
              explanation:
                "0x10014b0. Unlike PE there is no base to add — and this address is also where the executable LOAD segment begins.",
            },
            {
              id: 'phnum',
              prompt: 'How many program headers does it have?',
              accept: ['10'],
              normalize: 'number',
              hint: '`readelf -h` gives the count; `readelf -lW` lists them.',
              explanation:
                "10, against 32 section headers. Program headers are the loader's coarse view — PHDR, INTERP, three LOADs, DYNAMIC and a few others.",
            },
            {
              id: 'shnum',
              prompt: 'How many section headers does it have?',
              accept: ['32'],
              normalize: 'number',
              hint: 'Same `readelf -h` output, a few lines below the program header count.',
              explanation:
                "32. The two counts differing is the point: sections are the fine-grained view for linkers and analysts, segments the coarse one for the loader.",
            },
            {
              id: 'interp',
              prompt: 'Which interpreter does the INTERP segment request?',
              accept: ['/lib64/ld-linux-x86-64.so.2', 'ld-linux-x86-64.so.2'],
              normalize: 'text',
              hint: '`readelf -lW headers` prints it in square brackets under the INTERP line.',
              explanation:
                "`/lib64/ld-linux-x86-64.so.2` — the dynamic loader. Its presence tells you the binary is dynamically linked before you look at a single import.",
            },
            {
              id: 'markervaddr',
              prompt: 'The marker string is at file offset 0x420. What virtual address is that?',
              accept: ['0x1000420', '1000420'],
              normalize: 'hex',
              hint: 'Find the section containing offset 0x420 with `readelf -SW headers`; it has sh_addr 0x1000400 and sh_offset 0x400.',
              explanation:
                "0x1000420: sh_addr 0x1000400 + (0x420 - 0x400). In this build the difference happens to be a constant 0x1000000 across the file, but using the section fields is what makes the method reliable.",
            },
          ],
          walkthrough:
            "1. Unzip, then read the header:\n     readelf -h headers\n       Entry point address: 0x10014b0\n       Number of program headers: 10\n       Number of section headers: 32\n\n2. The loader's view:\n     readelf -lW headers\n       INTERP  [Requesting program interpreter: /lib64/ld-linux-x86-64.so.2]\n       LOAD    0x000000 0x01000000 R\n       LOAD    0x0004b0 0x010014b0 R E     <- code, and the entry point\n       LOAD    0x0005e0 0x010025e0 RW      <- FileSiz 0x180, MemSiz 0xa20\n\n   That third LOAD is the .bss story: 0x8a0 bytes exist only once loaded.\n\n3. The analyst's view:\n     readelf -SW headers | grep -E 'rodata|text|bss'\n       .rodata  addr 0x1000400  offset 0x400  size 0x34\n\n4. Locate the marker and convert:\n     grep -abo REA-HEADERS-LAB-M07 headers     -> 1056, which is 0x420\n     0x1000400 + (0x420 - 0x400) = 0x1000420\n\n5. Compare against the PE twin you just read:\n     - PE hides its header behind an offset at 0x3C; ELF starts with its header.\n     - PE stores the entry point as an RVA; ELF stores a virtual address.\n     - PE has one table of sections; ELF has sections AND segments.\n     - Both need per-section arithmetic to turn an address into a file offset.\n\nThe formats look nothing alike and describe the same four things: where to map,\nwhat to map it as, what to import, and where to start.",
        },
        {
          type: 'exercise',
          id: 'm7-ex-parser',
          title: 'Write the twelve-line parser',
          task: "Write a short script in any language that opens a PE file, reads the offset at 0x3C, checks for the signature, and prints Machine, NumberOfSections, AddressOfEntryPoint and ImageBase. Run it against the lab file and check every value against `objdump`. Then say which field you would add next and why.",
          hint: 'All four fields are at fixed offsets from the signature: the COFF header follows the four signature bytes, and the optional header follows the COFF header\u2019s twenty bytes.',
          answer:
            "In python:\n    import struct\n    b = open('headers.exe','rb').read()\n    pe = struct.unpack_from('<I', b, 0x3C)[0]\n    assert b[pe:pe+4] == b'PE\\0\\0'\n    machine, nsec = struct.unpack_from('<HH', b, pe+4)\n    opt = pe + 24\n    entry = struct.unpack_from('<I', b, opt+16)[0]\n    base  = struct.unpack_from('<Q', b, opt+24)[0]\n    print(hex(machine), nsec, hex(entry), hex(base))\n\nAgainst the lab file: 0x8664, 19, 0x1400, 0x140000000 — all four matching\nobjdump.\n\nThe field to add next is the section table, because without it you cannot convert\nan RVA to a file offset, and almost every practical question needs that.",
          explanation: "Writing the parser is worth an hour once. After it, headers stop being something a tool tells you about and become something you can check, which matters the first time a file is deliberately malformed to confuse tools — a packed or tampered binary often has headers that one parser accepts and another rejects, and knowing the layout is how you tell which one is lying.",
        },
        {
          type: 'exercise',
          id: 'm7-ex-strip',
          title: 'Predict what stripping removes',
          task: "The ELF lab file has 32 section headers and 10 program headers. Predict what happens to each count if the file is stripped, and explain why one of them cannot be reduced to zero. Then say how you would still find code in a file whose section headers were gone entirely.",
          hint: 'Ask who reads each table, and what would break if it were missing.',
          answer:
            "Stripping removes symbol tables and debug sections, so the section count drops.\nThe program header count does not change, because the kernel needs it to run the\nfile at all: every LOAD entry is load-bearing in the literal sense.\n\nSection headers can be removed entirely — a file with sh_num 0 still runs. Program\nheaders cannot.\n\nFinding code without section headers: read the program headers instead. The LOAD\nsegment with the execute flag is the code, and the ELF header's entry point is\ninside it. That is exactly what a debugger or loader does, and it is why analysis\nof a stripped file starts from segments rather than sections.",
          explanation: "This is the most useful practical consequence of the two-table design. Section headers are a convenience that can be deleted; program headers are a requirement. When a file resists analysis, ask which tables it actually needs to keep working, because those are the ones that must still be honest — and honest structures are where your foothold is.",
        },
      ],
    },
  ],
};
