/**
 * SOURCES (verified while writing this module):
 *
 * FETCHED — JVM Specification, Java SE 21 (exact match to the installed JDK 21):
 * https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html
 * - ClassFile begins: "u4 magic; u2 minor_version; u2 major_version;
 *   u2 constant_pool_count; cp_info constant_pool[constant_pool_count-1]; ..."
 *   and "The magic field ... has the value 0xCAFEBABE".
 * - Table 4.1-A: Java SE 21, released September 2023, major version 65, supported
 *   majors 45..65.
 * - constant_pool: "a table of structures (§4.4) representing various string
 *   constants, class and interface names, field names, and other constants ...
 *   The format of each constant_pool table entry is indicated by its first 'tag'
 *   byte." Indexed from 1 to constant_pool_count - 1.
 *
 * MEASURED on the course build machine, JDK 21.0.12.1 (javac, jar, javap), and
 * CFR 0.152:
 * - Two labs. m09-jar-license (already in the repo) keeps its serial as a String
 *   constant; m09-jar-serial (added for this module) keeps only an int[] table
 *   and a transform. Both built by labs/build.mjs (javac + jar).
 * - license.jar behaviour: `java -jar license.jar JV-91C4-ORCHID` -> "valid";
 *   a wrong serial -> "invalid"; no argument -> "usage: java -jar license.jar
 *   <serial>".
 * - Class file magic, read directly from License.class inside the jar:
 *   `ca fe ba be 00 00 00 41`. 0x41 = 65, and `javap -verbose` confirms
 *   "major version: 65", "minor version: 0" — Java SE 21 per the table above.
 * - serial.jar behaviour: `java -jar serial.jar JAVA-M09-XY` -> "serial ok",
 *   exit 0; a wrong serial -> "serial bad", exit 2.
 * - `strings serial.jar` does NOT contain the serial (there is no serial string
 *   in the file to find).
 * - `javap -p -c Serial.class` disassembled check() to (excerpt):
 *     invokevirtual String.charAt:(I)C
 *     iload_1 / iconst_3 / imul / bipush 17 / iadd / ixor
 *     bipush 7 / iadd / sipush 255 / iand
 *     ... getstatic EXPECTED / iaload / if_icmpeq
 *   i.e. mixed = ((charAt(i) ^ (i*3 + 0x11)) + 7) & 0xFF, compared to EXPECTED[i].
 * - CFR 0.152 decompiled the same method to near-source Java:
 *     private static final int[] EXPECTED = new int[]{98, 92, 72, 98, 55, 116,
 *       26, 38, 11, 123, 125};
 *     int n = (string.charAt(i) ^ i * 3 + 17) + 7 & 0xFF;
 * - The serial recovers by inverting the transform per index:
 *   chr((((table[i] - 7) & 0xFF) ^ (i*3 + 0x11)) & 0xFF). The table
 *   98,92,72,98,55,116,26,38,11,123,125 gives "JAVA-M09-XY", which runs to
 *   "serial ok".
 */
import type { Module } from '../../types/content';

export const javaModule: Module = {
  id: 'java-bytecode',
  number: 9,
  title: 'Java — Class Format and JVM Bytecode',
  tagline: 'Another managed format that decompiles almost back to source — with a magic number you already half-know and a stack machine of its own.',
  part: 3,
  lessons: [
    {
      id: 'the-class-file',
      title: 'The Class File',
      blocks: [
        {
          type: 'callout',
          variant: 'info',
          title: 'Setup for this module',
          text: "You already have the JDK from module 1, which gives you **javap** (the disassembler that ships with Java). Add **CFR**, a single-jar Java decompiler, and optionally **jadx**, which you will install for module 10 anyway. Run a decompiler with `java -jar cfr.jar target.jar`.",
        },
        {
          type: 'prose',
          text: "Java is the other big managed platform, and it behaves like .NET did in module 8: the compiler keeps names and constants because the runtime needs them, so decompilation gives back something very close to source. The container is different, though, and worth knowing byte for byte because it is small and rigid.",
        },
        {
          type: 'heading',
          text: 'A magic number you have seen before',
        },
        {
          type: 'prose',
          text: "A `.class` file opens with four bytes the JVM specification fixes as `0xCAFEBABE`. You met it back in module 2 as the thing DEX magic is *not*. Here it is, read straight out of the lab's class file:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'The first eight bytes of License.class',
          code: `ca fe ba be 00 00 00 41
\\_________/ \\___/ \\___/
 magic       minor  major = 0x41 = 65`,
        },
        {
          type: 'prose',
          text: "The JVMS lays out the header exactly: `u4 magic`, `u2 minor_version`, `u2 major_version`. The major version here is 65, and the specification's own table maps 65 to **Java SE 21** — which is the JDK that built these labs. That number is how you tell which Java a class file was compiled for, regardless of what produced it.",
        },
        {
          type: 'table',
          headers: ['major_version', 'Java SE'],
          rows: [
            ['52', '8'],
            ['61', '17'],
            ['65', '21 (this course\u2019s JDK)'],
          ],
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'The version is a compatibility gate, not trivia',
          text: "A JVM refuses to load a class whose major version is newer than it supports — the JVMS says version 21 supports majors 45 through 65. So an `UnsupportedClassVersionError` is not a corrupt file; it is a class compiled for a newer Java than the one running it, and the major version tells you exactly which.",
        },
        {
          type: 'heading',
          text: 'The constant pool holds the names',
        },
        {
          type: 'prose',
          text: "After the header comes the **constant pool**, which the JVMS describes as a table of \"string constants, class and interface names, field names, and other constants\". This is where a Java binary keeps the human-readable information — and, like .NET metadata, why a decompiler can hand back real names. It is indexed from 1, a detail that trips up anyone writing their own parser.",
        },
        {
          type: 'prose',
          text: "A `.jar` is simpler than it looks: it is a ZIP archive (module 2's `PK` magic) of `.class` files plus a `META-INF/MANIFEST.MF`. Unzip it and you have the classes; the manifest names the entry-point class for `java -jar`.",
        },
        {
          type: 'quiz',
          id: 'm9-quiz-magic',
          question: 'A class file starts `CA FE BA BE 00 00 00 41`. What is the 0x41?',
          options: [
            {
              text: 'The major version, meaning Java 21',
              correct: true,
              explanation: "65 decimal is major version 65, which the JVMS table maps to Java SE 21 — the JDK used here.",
            },
            {
              text: 'The number of entries in the constant pool',
              correct: false,
              explanation: "The constant pool count comes after the version fields, not immediately inside the magic.",
            },
            {
              text: 'The first tag byte of the constant pool',
              correct: false,
              explanation: "Tags appear once the pool begins; byte 7 is still the low half of major_version.",
            },
            {
              text: 'A minor version of 65 for this file',
              correct: false,
              explanation: "Minor version is the two bytes before it, here 0x0000; 0x41 is the major version.",
            },
          ],
        },
      ],
    },
    {
      id: 'jvm-bytecode',
      title: 'Reading JVM Bytecode with javap',
      blocks: [
        {
          type: 'prose',
          text: "The JVM, like the CLR, is a **stack machine**. Its bytecode is even more regular than IL, and `javap -c` — bundled with your JDK, nothing to install — disassembles it. You will lean on a decompiler most of the time, but reading bytecode directly is how you handle the cases a decompiler chokes on, and how you confirm what it claims.",
        },
        {
          type: 'heading',
          text: 'The transform, as bytecode',
        },
        {
          type: 'prose',
          text: "Here is the heart of the second lab's `check` method, from `javap -p -c`. The second lab stores no serial string — only a table and this loop — so this is the code you have to read to solve it:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'javap -p -c Serial.class, the transform inside the loop',
          code: `23: aload_0                    // the candidate string
24: iload_1                    // i
25: invokevirtual String.charAt:(I)C
28: iload_1                    // i
29: iconst_3                   // 3
30: imul                       // i * 3
31: bipush        17           // 0x11
33: iadd                       // i*3 + 17
34: ixor                       // charAt(i) ^ (i*3 + 17)
35: bipush        7
37: iadd                       // + 7
38: sipush        255
41: iand                       // & 0xFF
42: istore_2                   // mixed
...
44: getstatic     EXPECTED
48: iaload                     // EXPECTED[i]
49: if_icmpeq     54           // equal? keep looping`,
        },
        {
          type: 'prose',
          text: "Read the stack, one line at a time, exactly as you did for IL in module 8. Push the character; push `i`; push 3; `imul` folds them to `i*3`; `bipush 17` and `iadd` make `i*3 + 17`; `ixor` combines it with the character; `+ 7`, then `& 0xFF`. The result is compared against `EXPECTED[i]`. Every constant you need to invert the check is right there: 3, 17, 7, 255, and the table.",
        },
        {
          type: 'table',
          headers: ['Bytecode', 'Meaning', 'x86 analogy'],
          rows: [
            ['`iload_1`', 'Push int local 1 onto the stack', '`mov` from a slot'],
            ['`imul`', 'Multiply the top two ints', '`imul`'],
            ['`ixor`', 'XOR the top two ints', '`xor`'],
            ['`iand`', 'AND the top two ints', '`and`'],
            ['`invokevirtual`', 'Call an instance method', '`call`'],
            ['`if_icmpeq`', 'Pop two, branch if equal', '`cmp` then `je`'],
            ['`iaload`', 'Load from an int array', 'indexed `mov`'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The i prefix is the type',
          text: "`iload`, `imul`, `iadd`, `iaload` all start with `i` for int. There are parallel families: `l` for long, `f` for float, `d` for double, `a` for reference. When you see `aload_0` in a non-static method it is loading `this`; in a static one it is the first argument. The type is in the opcode, which is why the JVM can verify bytecode.",
        },
        {
          type: 'quiz',
          id: 'm9-quiz-stack',
          question: 'In `iload_1`, `iconst_3`, `imul`, what is left on the stack afterwards?',
          options: [
            {
              text: 'One int: local 1 times three',
              correct: true,
              explanation: "`imul` pops both operands and pushes the single product, so the stack ends one deeper.",
            },
            {
              text: 'Two ints: local 1 and three',
              correct: false,
              explanation: "Those were consumed by `imul`; a binary op leaves only its result behind.",
            },
            {
              text: 'The product stored into local 1',
              correct: false,
              explanation: "Storing back to a local needs `istore_1`; `imul` only touches the stack.",
            },
            {
              text: 'Three ints including both operands',
              correct: false,
              explanation: "`imul` removes its two inputs before pushing the product, a net change of minus one.",
            },
          ],
        },
      ],
    },
    {
      id: 'decompiling-and-recovering',
      title: 'From Bytecode Back to Java',
      blocks: [
        {
          type: 'prose',
          text: "You rarely read a whole program in bytecode. A decompiler like CFR turns the class back into Java, and because Java bytecode keeps so much, the result is remarkably close to what was written.",
        },
        {
          type: 'code',
          language: 'java',
          title: 'CFR 0.152 on serial.jar — the same method as source',
          code: `private static final int[] EXPECTED = new int[]{98, 92, 72, 98, 55, 116, 26, 38, 11, 123, 125};

public static boolean check(String string) {
    if (string.length() != EXPECTED.length) {
        return false;
    }
    for (int i = 0; i < EXPECTED.length; ++i) {
        int n = (string.charAt(i) ^ i * 3 + 17) + 7 & 0xFF;
        if (n == EXPECTED[i]) continue;
        return false;
    }
    return true;
}`,
        },
        {
          type: 'prose',
          text: "The array literal is fully recovered, and the transform reads as one line of arithmetic. The only cosmetic loss is the parameter name — CFR called it `string` because the original name is not required to be kept — and the loop was rewritten with `continue`, which is behaviour-identical to the original `if`.",
        },
        {
          type: 'heading',
          text: 'Inverting the transform',
        },
        {
          type: 'prose',
          text: "With the transform in front of you, recovering the serial is arithmetic. The forward direction is `(c XOR (i*3 + 17)) + 7`, masked to a byte. Run it backwards per index: subtract 7, then XOR with `(i*3 + 17)` again, because XOR is its own inverse.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'Recovering the serial from the table',
          code: `table = [98, 92, 72, 98, 55, 116, 26, 38, 11, 123, 125]

for each i:
  c = ((table[i] - 7) & 0xFF) XOR (i*3 + 17)

-> "JAVA-M09-XY"`,
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'Same skill, three platforms now',
          text: "Native (module 4), .NET (module 8), and now Java: the check is a reversible per-character transform against a stored table, and the attack is always to read the transform and run it backwards. The instruction set changes — x86, IL, JVM bytecode — but the move does not. That transfer is the point of doing it in each.",
        },
        {
          type: 'prose',
          text: "Patching Java is also possible, and it is the same idea as module 8: flip the branch after the check. But recovering the serial is usually cleaner here, because the transform decompiles so readably. When a decompiler gives you the algorithm this plainly, inverting it beats editing bytecode.",
        },
        {
          type: 'quiz',
          id: 'm9-quiz-decompile',
          question: 'CFR names a parameter `string` instead of its original name. Why?',
          options: [
            {
              text: 'The original name need not be kept',
              correct: true,
              explanation: "Local and parameter names are optional debug information; without it CFR synthesises a plausible name.",
            },
            {
              text: 'CFR deliberately obscures parameters',
              correct: false,
              explanation: "It is reconstructing, not obscuring; it names what it can and invents only what was dropped.",
            },
            {
              text: 'Java forbids meaningful parameter names',
              correct: false,
              explanation: "Source names are unrestricted; they simply are not mandatory in the compiled class.",
            },
            {
              text: 'The name was encrypted in the constant pool',
              correct: false,
              explanation: "Nothing is encrypted; the name was just not stored, so there was nothing to read back.",
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
          text: "Two jars. The first keeps its serial as a string, so a decompiler prints it outright. The second keeps only a table, so you read the bytecode or the decompiled Java and invert the transform. Both are the managed-code moves from module 8, in a new instruction set.",
        },
        {
          type: 'quiz-set',
          id: 'm9-set-java',
          title: 'JVM bytecode check',
          questions: [
            {
              type: 'quiz',
              id: 'm9-set-q-magic',
              question: 'Which four bytes begin every Java class file?',
              options: [
                {
                  text: 'The bytes `CA FE BA BE`',
                  correct: true,
                  explanation: "The JVMS fixes the magic as 0xCAFEBABE, the value that identifies a class file.",
                },
                {
                  text: 'The bytes `4D 5A 90 00`',
                  correct: false,
                  explanation: "That is `MZ`, the DOS-stub start of a PE file, from module 2.",
                },
                {
                  text: 'The bytes `7F 45 4C 46`',
                  correct: false,
                  explanation: "That is the ELF identification; Linux native, not a Java class.",
                },
                {
                  text: 'The bytes `64 65 78 0A`',
                  correct: false,
                  explanation: "That is `dex\\n`, the Android DEX magic, which module 10 covers.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm9-set-q-version',
              question: 'A class file has major version 65. What does that tell you?',
              options: [
                {
                  text: 'It was compiled for Java SE 21',
                  correct: true,
                  explanation: "The JVMS table maps major version 65 to Java SE 21, so the file targets that release.",
                },
                {
                  text: 'It uses 65 constant-pool entries',
                  correct: false,
                  explanation: "The pool count is a separate field after the version, unrelated to the version number.",
                },
                {
                  text: 'It needs Java 65 to run at all',
                  correct: false,
                  explanation: "There is no Java 65; the number is the class-format version, which maps to SE 21.",
                },
                {
                  text: 'It was built at optimisation level 65',
                  correct: false,
                  explanation: "Java has no such level; the byte is the class-file format version, nothing about optimisation.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm9-set-q-jar',
              question: 'What is a `.jar` file, structurally?',
              options: [
                {
                  text: 'A ZIP of classes and manifest',
                  correct: true,
                  explanation: "It is an ordinary ZIP archive holding `.class` files plus META-INF/MANIFEST.MF.",
                },
                {
                  text: 'A single linked native executable',
                  correct: false,
                  explanation: "A jar is not native; it contains portable class files the JVM loads, not machine code.",
                },
                {
                  text: 'One class file with many methods',
                  correct: false,
                  explanation: "A jar bundles many separate class files; each class is still its own entry.",
                },
                {
                  text: 'A compressed image of JVM memory',
                  correct: false,
                  explanation: "Nothing about a jar is a memory image; it is a static archive on disk.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm9-set-q-stack',
              question: 'The `i` in `iload`, `imul`, `iadd` stands for what?',
              options: [
                {
                  text: 'The int type of the operands',
                  correct: true,
                  explanation: "JVM opcodes carry the operand type; `i` is int, with `l`, `f`, `d`, `a` families alongside.",
                },
                {
                  text: 'An index into the constant pool',
                  correct: false,
                  explanation: "Pool indices are operands to some opcodes, not the meaning of the leading letter.",
                },
                {
                  text: 'The instruction number in order',
                  correct: false,
                  explanation: "Instruction offsets are the numbers in the left column, unrelated to the `i` prefix.",
                },
                {
                  text: 'An immediate value follows it',
                  correct: false,
                  explanation: "Immediates appear as `bipush`/`sipush`/`ldc`; the `i` marks the type instead.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm9-set-q-invert',
              question: 'The forward transform is `(c ^ k) + 7` masked to a byte. How do you invert it?',
              options: [
                {
                  text: 'Subtract 7, then XOR with `k`',
                  correct: true,
                  explanation: "Undo the last operation first: subtract the 7, then XOR again since XOR is its own inverse.",
                },
                {
                  text: 'XOR with `k`, then subtract 7',
                  correct: false,
                  explanation: "Order matters — the 7 was added last, so it must be undone first.",
                },
                {
                  text: 'Add 7, then XOR with `k`',
                  correct: false,
                  explanation: "Adding 7 repeats the forward step rather than reversing it.",
                },
                {
                  text: 'XOR with 7, then subtract `k`',
                  correct: false,
                  explanation: "The 7 was added, not XORed, and `k` was XORed, not subtracted; this mixes the operations up.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm9-set-q-decompiler',
              question: 'Why does a Java decompiler reconstruct code so close to the original source?',
              options: [
                {
                  text: 'Bytecode keeps names and structure',
                  correct: true,
                  explanation: "Class files retain the constant pool and typed, structured bytecode, so much of the source is recoverable.",
                },
                {
                  text: 'The source is embedded in the jar',
                  correct: false,
                  explanation: "Source is not shipped in a normal jar; the fidelity comes from the bytecode and metadata.",
                },
                {
                  text: 'Java skips compilation entirely',
                  correct: false,
                  explanation: "Java is compiled to bytecode; that compiled form simply preserves a lot of information.",
                },
                {
                  text: 'Decompilers run the program to observe it',
                  correct: false,
                  explanation: "Decompilation is static; running to observe is dynamic analysis from module 6.",
                },
              ],
            },
          ],
        },
        {
          type: 'lab',
          id: 'm9-lab-license',
          title: 'The serial is right there — decompile and read it',
          brief:
            "`license.jar` validates a serial held as a string constant. This first lab is about getting comfortable with the Java toolchain: unzip the jar, look at a class file's magic and version, and decompile it. Run it with `java -jar license.jar <serial>`.",
          format: 'JAR',
          tools: ['CFR or jadx', 'javap', '7-Zip'],
          download: { file: 'm09-jar-license.zip', password: 'reverse' },
          questions: [
            {
              id: 'magic',
              prompt: 'What are the first four bytes of the class file, in hex?',
              accept: ['cafebabe', '0xcafebabe'],
              normalize: 'hex',
              hint: 'Unzip the jar (it is a ZIP), then `od -An -tx1 -N4 License.class`.',
              explanation:
                "0xCAFEBABE, the class-file magic the JVMS fixes. Every `.class` starts with it, which is how you recognise one regardless of its extension.",
            },
            {
              id: 'version',
              prompt: 'What major version is the class file, in decimal?',
              accept: ['65'],
              normalize: 'number',
              hint: 'It is the two bytes after the magic and minor version, or read it from `javap -verbose License.class`.',
              explanation:
                "65, which the JVMS maps to Java SE 21 — the JDK that built the labs. The measured bytes were `... 00 00 00 41`, and 0x41 is 65.",
            },
            {
              id: 'serial',
              prompt: 'Which serial does the program accept?',
              accept: ['JV-91C4-ORCHID'],
              normalize: 'text',
              hint: 'Decompile with `java -jar cfr.jar license.jar`, or open it in jadx, and read the constant.',
              explanation:
                "JV-91C4-ORCHID, a plain string constant the decompiler prints directly. `java -jar license.jar JV-91C4-ORCHID` prints `valid`.",
            },
          ],
          walkthrough:
            "1. Unzip the archive, then unzip the jar itself (a jar is a ZIP):\n     unzip license.jar\n     -> License.class, META-INF/MANIFEST.MF\n\n2. Look at the class header:\n     od -An -tx1 -N8 License.class\n     -> ca fe ba be 00 00 00 41\n     magic CAFEBABE, major version 0x41 = 65 = Java 21.\n     javap -verbose License.class | grep -i version   confirms it.\n\n3. Decompile:\n     java -jar cfr.jar license.jar\n   You get near-source Java, including:\n     private static final String SERIAL = \"JV-91C4-ORCHID\";\n\n4. Confirm:\n     java -jar license.jar JV-91C4-ORCHID   -> valid\n     java -jar license.jar wrong            -> invalid\n\nThis lab is deliberately easy. Its job is to make the Java tools familiar before\nthe next one takes the string away.",
        },
        {
          type: 'lab',
          id: 'm9-lab-serial',
          title: 'No serial stored — read the transform and invert it',
          brief:
            "`serial.jar` keeps no serial string. It stores an eleven-entry table and a per-character transform, so decompiling it shows you the algorithm, not the answer. Read the transform with CFR or `javap -c`, then run it backwards to recover the serial.",
          format: 'JAR',
          tools: ['CFR or jadx', 'javap', '7-Zip'],
          download: { file: 'm09-jar-serial.zip', password: 'reverse' },
          questions: [
            {
              id: 'xorterm',
              prompt: 'The transform XORs each character with `i * 3 + K`. What is K, in decimal?',
              accept: ['17'],
              normalize: 'number',
              hint: 'In `javap -c` it appears as `bipush 17` right before `ixor`; CFR writes it as `i * 3 + 17`.',
              explanation:
                "17 (0x11). The full per-character transform is `((charAt(i) ^ (i*3 + 17)) + 7) & 0xFF`, compared against the table.",
            },
            {
              id: 'addend',
              prompt: 'Which constant is added after the XOR?',
              accept: ['7'],
              normalize: 'number',
              hint: 'After `ixor` comes `bipush 7` then `iadd`.',
              explanation:
                "7. To invert, this is the first thing you undo — subtract 7 before XORing back, because it was the last operation applied.",
            },
            {
              id: 'tablelen',
              prompt: 'How many entries does the table have?',
              accept: ['11'],
              normalize: 'number',
              hint: 'CFR prints the `EXPECTED` array literal; count its elements, which is also the required serial length.',
              explanation:
                "Eleven. The length check rejects anything else first, so the serial is exactly eleven characters long.",
            },
            {
              id: 'serial',
              prompt: 'Which serial does the program accept?',
              accept: ['JAVA-M09-XY'],
              normalize: 'text',
              hint: 'Invert per index: (table[i] - 7) & 0xFF, then XOR with (i*3 + 17), as a character.',
              explanation:
                "JAVA-M09-XY. Running it confirms the inversion: `java -jar serial.jar JAVA-M09-XY` prints `serial ok` and exits 0.",
            },
            {
              id: 'exit',
              prompt: 'What exit code does a wrong serial produce?',
              accept: ['2'],
              normalize: 'number',
              hint: 'Run `java -jar serial.jar wrong; echo $?`.',
              explanation:
                "2, against 0 for the right serial. The program calls `System.exit` with the code, so the shell sees it directly.",
            },
          ],
          walkthrough:
            "1. Unzip, and confirm the serial is not simply stored:\n     strings serial.jar | grep -i java-m09    -> nothing\n\n2. Decompile:\n     java -jar cfr.jar serial.jar\n   Read check():\n     EXPECTED = {98, 92, 72, 98, 55, 116, 26, 38, 11, 123, 125}\n     int n = (string.charAt(i) ^ i * 3 + 17) + 7 & 0xFF;\n     if (n == EXPECTED[i]) continue;\n\n   Or read the bytecode directly:\n     javap -p -c Serial.class\n     ... imul / bipush 17 / iadd / ixor / bipush 7 / iadd / sipush 255 / iand\n\n3. Invert the transform per index. In python:\n     >>> t = [98,92,72,98,55,116,26,38,11,123,125]\n     >>> ''.join(chr(((b - 7) & 0xFF) ^ (i*3 + 17)) for i, b in enumerate(t))\n     'JAVA-M09-XY'\n\n4. Confirm:\n     java -jar serial.jar JAVA-M09-XY   -> serial ok   (exit 0)\n     java -jar serial.jar wrong         -> serial bad  (exit 2)\n\nThe payoff line: this is the module 8 keygen skill in a third instruction set.\nWhen you can read charAt, imul, ixor and iand as arithmetic, JVM bytecode stops\nbeing a wall and becomes just another way of writing the loop.",
        },
        {
          type: 'exercise',
          id: 'm9-ex-javap',
          title: 'Match bytecode to source, line by line',
          task: "Take the `javap -c` output for `check` in `serial.jar` and annotate each instruction from offset 23 to 49 with the piece of the Java expression it implements. Then say which single instruction you would change to make the loop accept any character at one position, and what that tells you about patching Java versus recovering the serial.",
          hint: 'The comparison at the end is `if_icmpeq`. Think about what changing it, or the constant it is compared against, would do.',
          answer:
            "Annotated:\n  23 aload_0 / 24 iload_1 / 25 charAt      -> string.charAt(i)\n  28 iload_1 / 29 iconst_3 / 30 imul       -> i * 3\n  31 bipush 17 / 33 iadd                   -> i*3 + 17\n  34 ixor                                  -> charAt(i) ^ (i*3+17)\n  35 bipush 7 / 37 iadd                    -> + 7\n  38 sipush 255 / 41 iand                  -> & 0xFF\n  42 istore_2                              -> int mixed = ...\n  44 getstatic EXPECTED / 47 iload_1 / 48 iaload -> EXPECTED[i]\n  49 if_icmpeq                             -> if (mixed == EXPECTED[i])\n\nTo accept any character at every position you would change `if_icmpeq` to an\nunconditional branch to the loop's continue target - one opcode.\n\nWhat it tells you: patching defeats the check without knowing the serial, but it\nchanges the program; recovering the serial leaves the jar untouched and proves\nyou understood the algorithm. On a jar you decompiled this cleanly, recovery is\nusually the better demonstration.",
          explanation: "Annotating bytecode against its source is the exercise that makes a stack machine stop being intimidating. Once you can point at each opcode and name the sub-expression it computes, you can also see precisely where a single change would alter behaviour - which is the foundation of both patching and confident recovery.",
        },
        {
          type: 'exercise',
          id: 'm9-ex-obfuscate',
          title: 'Predict what an obfuscator would do here',
          task: "You have seen how readable `serial.jar` is. Describe what a Java obfuscator would change to make this jar hard to analyse, which of your findings would survive it, and why the transform's constants are harder to hide than the method names.",
          hint: 'Separate what is required for the code to run from what is only there for humans.',
          answer:
            "An obfuscator would rename check, Serial, EXPECTED and the locals to noise like\na, b, c; it might inline the method, split the loop, or add dead branches. The\nnames go first because they are not needed to run.\n\nWhat survives: the arithmetic. The constants 3, 17, 7, 255 and the table values\nare operands the code must execute, so they remain in the bytecode as bipush,\nsipush and array data no matter how the names are mangled. You could still read\nimul / ixor / iadd / iand and invert the transform.\n\nWhy the constants are harder to hide: a name is metadata the runtime looks up,\nreplaceable with any other string. A constant is part of the computation - hiding\nit means computing it at runtime instead, which is more work and leaves its own\ntraces.",
          explanation: "This previews module 12 and makes its central point concrete: obfuscation attacks the readable metadata, which is cheap to destroy, but the executable logic and its constants must remain executable. An analyst who reads arithmetic rather than names is far more resistant to obfuscation - which is exactly why this course teaches you to read the loop.",
        },
      ],
    },
  ],
};
