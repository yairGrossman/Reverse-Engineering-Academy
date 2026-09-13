/**
 * SOURCES (verified while writing this module):
 *
 * FETCHED — AOSP DEX format (source.android.com/docs/core/runtime/dex-format):
 * - "ubyte[8] DEX_FILE_MAGIC = { 0x64 0x65 0x78 0x0a 0x30 0x33 0x39 0x00 } =
 *   \"dex\\n039\\0\"", "the value intentionally contains a newline and a null
 *   byte in order to help in the detection of certain forms of corruption", and
 *   "the three decimal digits encode the format version number".
 * - header_item has a magic field, a checksum "adler32 checksum of the rest of
 *   the file", and a signature "SHA-1 signature (hash) of the rest of the file".
 * - string_ids: "identifiers for all the strings used by this file". class_defs:
 *   "class definitions list", superclass/interfaces ordered before the class.
 *
 * IMPORTANT VERSION NOTE (measured, contradicts the doc's example): d8 in
 * build-tools 37.0.0 at minApi 21 emits magic `dex\n035\0`, NOT the `dex\n039\0`
 * the documentation prints. Both are valid; the three digits are a version that
 * varies with the minimum API. The course's format checks accept any three-digit
 * version and this module teaches the discrepancy directly rather than pinning 039.
 *
 * MEASURED on the course build machine, Android build-tools 37.0.0 (dexdump,
 * aapt2, apksigner), on the lab artifact m10-apk-check/check.apk built by
 * labs/build.mjs (javac -> d8 -> aapt2 -> zipalign -> apksigner, no Gradle):
 * - `unzip -l check.apk` shows six entries: AndroidManifest.xml, classes.dex,
 *   resources.arsc, META-INF/ANDROIDD.SF, META-INF/ANDROIDD.RSA,
 *   META-INF/MANIFEST.MF.
 * - classes.dex first eight bytes: 64 65 78 0a 30 33 35 00 = "dex\n035\0".
 * - dex header, read directly and confirmed with `dexdump -f`: checksum (adler32)
 *   0x9e4e8c58, signature (sha1) 8109d3e2112e1dea28eb2a10413cec715edd084c,
 *   file_size 988 (matches the file), string_ids_size 17, class_defs_size 1.
 * - `dexdump -d classes.dex` disassembled Check.verify to smali-like bytecode:
 *     const/4 v0, #0                 ; result = false
 *     if-eqz v5, 0023                ; null check
 *     invoke-virtual String.length ; move-result v1
 *     const/4 v2, #6 ; if-eq v1, v2  ; length must be 6
 *     ... loop ...
 *     aget-char v4, v5, v2
 *     xor-int/lit8 v4, v4, #90       ; ^ 0x5A
 *     add-int/2addr v3, v4           ; sum += ...
 *     const/16 v5, #123 ; if-ne v3, v5  ; sum must equal 0x7B
 * - `aapt2 dump xmltree check.apk --file AndroidManifest.xml`: package
 *   "com.reacademy.lab", minSdkVersion 21, targetSdkVersion 36, compileSdkVersion
 *   36, application label "RE Lab Check", hasCode true. (The binary manifest is
 *   NOT text XML in the apk — aapt2 decodes it.)
 * - `apksigner verify --verbose check.apk`: "Verified using v1 scheme (JAR
 *   signing): true", v2 true, v3 true, "Number of signers: 1".
 * - The check, replicated exactly in python to confirm a valid code:
 *   verify(code) = (len(code)==6 and sum((ord(c) ^ 0x5A) for c in code) == 0x7B).
 *   "ZZZZZ!" satisfies it: Z^0x5A = 0 five times, '!' (0x21) ^ 0x5A = 0x7B = 123.
 *   Because it is a checksum, many 6-character codes pass — so the graded
 *   questions ask for the constants, and producing a valid code is an open
 *   exercise with a model answer.
 */
import type { Module } from '../../types/content';

export const androidModule: Module = {
  id: 'android-apk',
  number: 10,
  title: 'Android — DEX, Manifest, Repack and Resign',
  tagline: 'An APK is a ZIP you can walk end to end: bytecode in one file, the manifest in another, and a signature that notices when you change either.',
  part: 3,
  lessons: [
    {
      id: 'what-an-apk-is',
      title: 'Walking an APK',
      blocks: [
        {
          type: 'callout',
          variant: 'info',
          title: 'Setup for this module',
          text: "Install **jadx**, which decompiles DEX bytecode to Java and decodes the binary manifest in one step. The Android SDK build-tools give you **dexdump**, **aapt2** and **apksigner** on the command line; this module measured its output from build-tools 37.0.0. You do not need a device or emulator — everything here is static.",
        },
        {
          type: 'prose',
          text: "Android does not run Java bytecode. It runs **DEX** — Dalvik Executable — a register-based bytecode packaged with resources and a manifest into an APK. And an APK, like a JAR, is just a ZIP. That is the theme of this module: the whole thing is walkable, one entry at a time.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'unzip -l check.apk — the entire lab APK',
          code: `AndroidManifest.xml       the binary-encoded manifest
classes.dex               all the code, as DEX bytecode
resources.arsc            compiled resources
META-INF/ANDROIDD.SF      signature: list of file digests
META-INF/ANDROIDD.RSA     signature: the certificate and signed digest
META-INF/MANIFEST.MF      signature: digest of every other entry`,
        },
        {
          type: 'prose',
          text: "Six entries. A real app built with Gradle would bury this under thousands of `androidx` classes and generated resources, which is exactly why this course builds its APK by hand — so you can see every part. The three `META-INF` files are the signature, and they matter to the last lesson.",
        },
        {
          type: 'heading',
          text: 'The manifest is not text',
        },
        {
          type: 'prose',
          text: "Open `AndroidManifest.xml` from inside the APK in a text editor and you get binary noise. Android compiles the manifest to a binary XML format, so you need a tool to decode it. `aapt2 dump xmltree` does it:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'aapt2 dump xmltree, decoded',
          code: `package="com.reacademy.lab"
minSdkVersion=21
targetSdkVersion=36
application label="RE Lab Check" hasCode=true`,
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The manifest is your first read, always',
          text: "Package name, minimum and target SDK, permissions, and every component the app declares are all here. On an unknown APK this is where you start, because it tells you what the app is allowed to do before you read a line of code. jadx decodes it for you in the same view as the sources.",
        },
        {
          type: 'quiz',
          id: 'm10-quiz-apk',
          question: 'What is an APK file, structurally?',
          options: [
            {
              text: 'A ZIP of DEX, resources, manifest',
              correct: true,
              explanation: "An APK is a ZIP archive holding classes.dex, resources, the binary manifest and a signature.",
            },
            {
              text: 'A single native ELF for Android',
              correct: false,
              explanation: "Android apps ship as DEX bytecode in a ZIP; native libraries are optional extras inside it.",
            },
            {
              text: 'A JAR renamed for the Play Store',
              correct: false,
              explanation: "It is ZIP-based like a JAR, but the code is DEX rather than `.class`, and the structure differs.",
            },
            {
              text: 'An encrypted container for the device',
              correct: false,
              explanation: "Nothing is encrypted; an APK is a plain ZIP you can list and extract with any unzip tool.",
            },
          ],
        },
      ],
    },
    {
      id: 'dex-format',
      title: 'The DEX File',
      blocks: [
        {
          type: 'prose',
          text: "`classes.dex` holds all the app's code. It opens with a magic value the AOSP documentation specifies as `DEX_FILE_MAGIC`, and there is a subtlety here worth more than the byte itself.",
        },
        {
          type: 'code',
          language: 'text',
          title: 'The first eight bytes of the lab’s classes.dex',
          code: `64 65 78 0a 30 33 35 00
 d  e  x \\n  0  3  5 \\0`,
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The documentation says 039; this file says 035',
          text: "The AOSP page prints `DEX_FILE_MAGIC` as `dex\\n039\\0`. The measured file reads `dex\\n035\\0`. Both are correct: the three digits are a **version that varies with the minimum API level**, and `d8` at `minSdkVersion 21` emits 035. A format check that hard-codes 039 would reject a perfectly valid DEX — so accept any three-digit version, and never trust a single example over the rule behind it.",
        },
        {
          type: 'prose',
          text: "The documentation notes the magic \"intentionally contains a newline and a null byte\" to help detect corruption — the same defensive trick you have now seen in several formats. After the magic comes a header the AOSP spec lays out field by field, and every value below was read from the lab file, then confirmed with `dexdump -f`:",
        },
        {
          type: 'table',
          headers: ['Header field', 'Measured value', 'What it is'],
          rows: [
            ['magic', '`dex\\n035\\0`', 'Format identifier and version'],
            ['checksum', '`0x9e4e8c58`', 'adler32 of the rest of the file'],
            ['signature', '`8109d3e2…084c`', 'SHA-1 of the rest of the file'],
            ['file_size', '988', 'Total size, matching the actual file'],
            ['string_ids_size', '17', 'How many strings the file uses'],
            ['class_defs_size', '1', 'One class defined — our `Check`'],
          ],
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'The checksum and signature are integrity, not security',
          text: "The adler32 checksum and SHA-1 signature inside the DEX header cover the file's own bytes so the runtime can detect corruption. They are not a defence against tampering — anyone editing the DEX recomputes them. Real tamper-resistance is the APK signature in META-INF, which is the next lesson.",
        },
        {
          type: 'heading',
          text: 'DEX bytecode is register-based',
        },
        {
          type: 'prose',
          text: "Unlike the JVM's stack machine, DEX uses **registers** — `v0`, `v1`, and so on — which makes its bytecode read a little more like the x86 you already know. Here is the lab's `verify` method from `dexdump -d`, trimmed to the logic:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'dexdump -d classes.dex, the verify method',
          code: `const/4      v2, #6
if-eq        v1, v2, ...      ; length must be 6, else fail
...
aget-char    v4, v5, v2       ; code[i]
xor-int/lit8 v4, v4, #90      ; ^ 0x5A
add-int/2addr v3, v4          ; sum += (code[i] ^ 0x5A)
...
const/16     v5, #123         ; 0x7B
if-ne        v3, v5, ...      ; sum must equal 0x7B`,
        },
        {
          type: 'prose',
          text: "Read it with the same eyes as every check so far. It requires a six-character code, XORs each character with `0x5A`, sums the results, and demands the total equal `0x7B` (123). `xor-int/lit8` is \"XOR with an 8-bit literal\", `add-int/2addr` adds into the first operand — the `2addr` forms are DEX's compact two-register instructions.",
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'A sum is not a fixed key',
          text: "This check compares a **sum**, so it is not looking for one specific code — many six-character strings add up to 0x7B after the XOR. That is a weaker check than a per-character table, and recognising the difference matters: a checksum is defeated by finding any satisfying input, not by recovering a unique one.",
        },
        {
          type: 'quiz',
          id: 'm10-quiz-dexver',
          question: 'A DEX file begins `dex\\n035\\0`, but the documentation shows `dex\\n039\\0`. What do you conclude?',
          options: [
            {
              text: 'Both valid; the digits are a version',
              correct: true,
              explanation: "The three digits encode a format version that varies with the build's minimum API, so 035 is legitimate.",
            },
            {
              text: 'The file is corrupt or was truncated',
              correct: false,
              explanation: "The magic is intact and well-formed; only the version digits differ, and that is expected.",
            },
            {
              text: 'The documentation is simply wrong',
              correct: false,
              explanation: "The doc shows one valid example; it is not claiming 039 is the only version that exists.",
            },
            {
              text: 'The file targets a different processor',
              correct: false,
              explanation: "DEX is processor-independent bytecode; the version reflects the format, not any CPU.",
            },
          ],
        },
      ],
    },
    {
      id: 'repack-and-resign',
      title: 'Repack and Resign',
      blocks: [
        {
          type: 'prose',
          text: "The reason APK analysis needs a whole lesson on signing is that you cannot quietly edit one. Change any entry — patch the DEX, swap a resource — and the signature no longer matches, so Android refuses to install it. Editing an APK is therefore always a three-step move: unpack, change, then **repack and resign**.",
        },
        {
          type: 'heading',
          text: 'What the signature actually covers',
        },
        {
          type: 'prose',
          text: "The three `META-INF` files are a chain of digests. `MANIFEST.MF` lists a digest of every other entry; the `.SF` file digests the manifest; the `.RSA` file holds the certificate and the signed digest of the `.SF`. `apksigner verify` walks that chain — on the lab APK it reports:",
        },
        {
          type: 'code',
          language: 'text',
          title: 'apksigner verify --verbose check.apk',
          code: `Verified using v1 scheme (JAR signing): true
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
Number of signers: 1`,
        },
        {
          type: 'callout',
          variant: 'concept',
          title: 'v1 signs entries, v2 and up sign the whole file',
          text: "v1 (JAR signing) covers each ZIP entry's contents, which is why it survives a re-zip. v2 and later sign a digest of the entire APK, so even repackaging invalidates them. When you resign a modified APK you generate all the schemes fresh; there is no way to keep the original signer's certificate without their private key.",
        },
        {
          type: 'heading',
          text: 'The workflow, and its one hard rule',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            'Unpack the APK (it is a ZIP), or decode it fully with a tool like apktool.',
            'Make your change — patch the DEX, edit smali, replace a resource.',
            'Repack the ZIP.',
            '**Align** it with `zipalign`, before signing, because signing must be the last thing that touches the file.',
            'Sign it with `apksigner` using a debug key you generate yourself.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The boundary this course draws',
          text: "You resign with your **own** key, producing an APK that installs on your **own** device for analysis. You cannot forge the original developer's signature — that needs their private key, and faking it to impersonate their app is both infeasible and squarely across the legal line module 1 drew. Repacking is for studying your own copy, not redistributing someone else's app.",
        },
        {
          type: 'prose',
          text: "This is why the lab APK is built without Gradle and signed with a generated debug key: the whole pipeline, including the resign step, is something you can reproduce and inspect. On a third-party app the technique is identical, and the ownership question is the part that decides whether you should.",
        },
        {
          type: 'quiz',
          id: 'm10-quiz-resign',
          question: 'You patch one byte in an APK’s classes.dex and try to install it. What happens?',
          options: [
            {
              text: 'Install fails: the signature broke',
              correct: true,
              explanation: "Any change breaks the META-INF digests, so Android rejects the APK until it is resigned.",
            },
            {
              text: 'It installs, since DEX has its own checksum',
              correct: false,
              explanation: "The DEX checksum is internal integrity; the APK signature is the gate the installer enforces.",
            },
            {
              text: 'It installs but the patched code is ignored',
              correct: false,
              explanation: "Android does not selectively ignore code; it refuses the whole APK when the signature fails.",
            },
            {
              text: 'It installs only if you keep the original key',
              correct: false,
              explanation: "You cannot keep the original signature after editing without the developer's private key.",
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
          text: "One APK, walked end to end. The graded questions ask for facts you read off the tools — the constants in the check, the DEX version, the signer count. Producing a code that passes the check is an open exercise, because it is a checksum and many codes work.",
        },
        {
          type: 'quiz-set',
          id: 'm10-set-android',
          title: 'Android internals check',
          questions: [
            {
              type: 'quiz',
              id: 'm10-set-q-zip',
              question: 'How do you list the contents of an APK?',
              options: [
                {
                  text: 'Any unzip tool works on a ZIP',
                  correct: true,
                  explanation: "An APK is a ZIP archive, so `unzip -l` or 7-Zip lists its entries directly.",
                },
                {
                  text: 'Only with the Android SDK present',
                  correct: false,
                  explanation: "SDK tools help decode contents, but listing the archive needs nothing beyond an unzip utility.",
                },
                {
                  text: 'By booting it in an emulator first',
                  correct: false,
                  explanation: "Listing files is static; running the app is unrelated to reading its archive.",
                },
                {
                  text: 'By decrypting with the signing key',
                  correct: false,
                  explanation: "It is not encrypted, and the signing key verifies rather than unlocks the archive.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm10-set-q-manifest',
              question: 'Why can you not just read AndroidManifest.xml in a text editor?',
              options: [
                {
                  text: 'It is compiled to binary XML',
                  correct: true,
                  explanation: "Android stores the manifest in a binary XML format, so a tool like aapt2 or jadx must decode it.",
                },
                {
                  text: 'It is encrypted inside the APK',
                  correct: false,
                  explanation: "Nothing in the APK is encrypted; the manifest is simply a binary encoding, not ciphertext.",
                },
                {
                  text: 'It is compressed with a custom codec',
                  correct: false,
                  explanation: "ZIP compression is standard; the obstacle is the binary XML encoding, not a special codec.",
                },
                {
                  text: 'It is stored only inside classes.dex',
                  correct: false,
                  explanation: "The manifest is its own entry in the APK, separate from the DEX bytecode.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm10-set-q-dexmagic',
              question: 'What are the first bytes of a DEX file?',
              options: [
                {
                  text: '`dex`, newline, digits, null',
                  correct: true,
                  explanation: "DEX_FILE_MAGIC is `dex\\n`, a three-digit version, then a null byte — 035 in this build.",
                },
                {
                  text: '`CA FE BA BE` like a class file',
                  correct: false,
                  explanation: "That is Java class magic; DEX uses its own `dex\\n` sequence instead.",
                },
                {
                  text: '`PK` because the APK is a ZIP',
                  correct: false,
                  explanation: "`PK` begins the APK archive, but classes.dex inside it starts with the DEX magic.",
                },
                {
                  text: '`4D 5A` from a Windows binary',
                  correct: false,
                  explanation: "`MZ` is a PE file; DEX is neither a PE nor built for Windows.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm10-set-q-register',
              question: 'How does DEX bytecode differ from JVM bytecode?',
              options: [
                {
                  text: 'DEX uses registers, the JVM a stack',
                  correct: true,
                  explanation: "DEX names registers like v0 and v1, where the JVM pushes and pops an evaluation stack.",
                },
                {
                  text: 'DEX is text, JVM bytecode is binary',
                  correct: false,
                  explanation: "Both are binary; the readable mnemonics come from a disassembler in each case.",
                },
                {
                  text: 'DEX drops names, the JVM keeps them',
                  correct: false,
                  explanation: "Both retain enough for decompilers to recover names; the real difference is the machine model.",
                },
                {
                  text: 'DEX runs natively, the JVM interprets',
                  correct: false,
                  explanation: "Both are compiled or interpreted by a runtime; neither is raw native code on its own.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm10-set-q-checksum',
              question: 'The DEX header carries an adler32 checksum and a SHA-1 signature. What are they for?',
              options: [
                {
                  text: 'Detecting file corruption',
                  correct: true,
                  explanation: "They cover the file's own bytes for integrity; an editor just recomputes them, so they are not anti-tamper.",
                },
                {
                  text: 'Proving who signed this app',
                  correct: false,
                  explanation: "Authorship is the APK signature in META-INF; the DEX hashes say nothing about a signer.",
                },
                {
                  text: 'Encrypting the stored bytecode',
                  correct: false,
                  explanation: "Hashes are not encryption, and the bytecode is plainly readable with dexdump.",
                },
                {
                  text: 'Speeding up class loading',
                  correct: false,
                  explanation: "They are integrity fields; verifying a hash does not accelerate loading.",
                },
              ],
            },
            {
              type: 'quiz',
              id: 'm10-set-q-sign',
              question: 'Why must you resign an APK after editing it?',
              options: [
                {
                  text: 'Any change breaks the existing signature',
                  correct: true,
                  explanation: "The META-INF digests cover the entries, so editing one makes verification fail until resigned.",
                },
                {
                  text: 'The DEX version number increments',
                  correct: false,
                  explanation: "Editing does not bump the DEX version; the obstacle is the APK signature, not the version.",
                },
                {
                  text: 'ZIP compression scrambles the code',
                  correct: false,
                  explanation: "Compression is lossless; the code is intact, but its digest no longer matches the signature.",
                },
                {
                  text: 'Android recompiles the manifest on install',
                  correct: false,
                  explanation: "The installer verifies the signature rather than recompiling the manifest.",
                },
              ],
            },
          ],
        },
        {
          type: 'lab',
          id: 'm10-lab-check',
          title: 'Walk the APK, read the check',
          brief:
            "`check.apk` is a hand-built Android app with a single `verify` method. Because it was built without Gradle, it has just six entries and you can inspect every one. Open it in jadx, or use `dexdump`, `aapt2` and `apksigner` from the command line, and answer from what the tools show.",
          format: 'APK',
          tools: ['jadx', 'dexdump', 'aapt2', 'apksigner', '7-Zip'],
          download: { file: 'm10-apk-check.zip', password: 'reverse' },
          questions: [
            {
              id: 'package',
              prompt: 'What is the application package name?',
              accept: ['com.reacademy.lab'],
              normalize: 'text',
              hint: 'Decode the manifest: `aapt2 dump xmltree check.apk --file AndroidManifest.xml`, or read it in jadx.',
              explanation:
                "com.reacademy.lab. The manifest is binary XML inside the APK, so it must be decoded rather than read as text.",
            },
            {
              id: 'minsdk',
              prompt: 'What minSdkVersion does the manifest declare?',
              accept: ['21'],
              normalize: 'number',
              hint: 'Same aapt2 dump; look for minSdkVersion.',
              explanation:
                "21. This also explains the DEX version: d8 targeting minSdk 21 emits the 035 magic rather than a higher number.",
            },
            {
              id: 'dexver',
              prompt: 'What three-digit version appears in the classes.dex magic?',
              accept: ['035', '35'],
              normalize: 'number',
              hint: 'Extract classes.dex and read its first eight bytes: `od -An -c -N8 classes.dex`.',
              explanation:
                "035 — `dex\\n035\\0` — not the 039 the documentation prints. The digits are a version tied to the build's minimum API.",
            },
            {
              id: 'xorkey',
              prompt: 'Which value does verify XOR each character with, in hex?',
              accept: ['0x5a', '5a', '90'],
              normalize: 'hex',
              hint: 'Disassemble with `dexdump -d classes.dex` and read the loop, or let jadx decompile it. Look for `xor-int/lit8`.',
              explanation:
                "0x5A (90 decimal). The check XORs every character with 0x5A, sums the results, and requires the total to equal 0x7B.",
            },
            {
              id: 'target',
              prompt: 'What total must the XORed characters sum to, in hex?',
              accept: ['0x7b', '7b', '123'],
              normalize: 'hex',
              hint: 'After the loop, `const/16 v5, #123` then `if-ne`. 123 decimal is the target.',
              explanation:
                "0x7B, which is 123. A six-character code passes when the sum of (character XOR 0x5A) equals exactly 0x7B.",
            },
            {
              id: 'signers',
              prompt: 'How many signers does apksigner report?',
              accept: ['1'],
              normalize: 'number',
              hint: 'Run `apksigner verify --verbose check.apk` and read the last line.',
              explanation:
                "1 — a single signer, using v1, v2 and v3 schemes. Editing any entry breaks all three and forces a resign.",
            },
          ],
          walkthrough:
            "1. Unzip the download, then list the APK — it is a ZIP:\n     unzip -l check.apk\n     -> AndroidManifest.xml, classes.dex, resources.arsc, three META-INF files\n\n2. Decode the manifest:\n     aapt2 dump xmltree check.apk --file AndroidManifest.xml\n     -> package com.reacademy.lab, minSdkVersion 21, targetSdkVersion 36\n\n3. Extract and inspect the DEX:\n     unzip check.apk classes.dex\n     od -An -c -N8 classes.dex        -> d e x \\n 0 3 5 \\0   (035, not 039)\n     dexdump -f classes.dex           -> checksum, signature, sizes\n\n4. Read the check:\n     dexdump -d classes.dex\n     ... const/4 v2, #6 ; if-eq        (length must be 6)\n     ... xor-int/lit8 v4, v4, #90      (^ 0x5A)\n     ... add-int/2addr v3, v4          (sum)\n     ... const/16 v5, #123 ; if-ne     (sum must equal 0x7B)\n   Or open check.apk in jadx and read the decompiled verify() directly.\n\n5. Confirm the signature:\n     apksigner verify --verbose check.apk\n     -> v1/v2/v3 true, Number of signers: 1\n\nThe lesson of the walk: nothing here was hidden, because a hand-built APK is\nsmall enough to read whole. On a real app the same six ideas apply, just buried\nunder generated code - which is what jadx's tree view is for.",
        },
        {
          type: 'exercise',
          id: 'm10-ex-code',
          title: 'Produce a code that passes',
          task: "The check requires a six-character code where the sum of (character XOR 0x5A) equals 0x7B (123). Find one such code, show your working, and explain why there is more than one right answer here when the earlier labs had exactly one.",
          hint: 'Z is 0x5A, so Z XOR 0x5A is 0. Build most of the code from characters that contribute a known amount, then solve the last one.',
          answer:
            "One clean answer: ZZZZZ!\n  Z is 0x5A, and 0x5A XOR 0x5A = 0, so five Z's contribute 0.\n  '!' is 0x21, and 0x21 XOR 0x5A = 0x7B = 123.\n  Sum = 0 + 0 + 0 + 0 + 0 + 123 = 123 = 0x7B. Six characters, so it passes.\n\nWhy many answers exist: the check compares a SUM, not each character against a\nfixed table. Any six characters whose XORed values total 123 pass - you can trade\namount between positions freely. The earlier labs pinned every character with a\nper-index table, so exactly one string worked.",
          explanation: "This is the practical meaning of the checksum-versus-table distinction. A summing check has a huge solution space, which makes it easy to satisfy but also a weaker gate: an attacker needs any preimage, not the intended one. Recognising the shape of a check - unique key, checksum, or one-way hash - tells you immediately whether to hunt for the key, solve a constraint, or give up on recovery and patch instead.",
        },
        {
          type: 'exercise',
          id: 'm10-ex-repack',
          title: 'Plan the repack you would not redistribute',
          task: "Describe, in order, the steps to patch this APK so `verify` always returns true, install it on your own device, and confirm the change. Then state plainly what you must not do with the result and why.",
          hint: 'Recall the align-then-sign rule, and that you sign with your own key.',
          answer:
            "Steps:\n  1. Unpack: apktool d check.apk  (decodes DEX to smali and the manifest to text)\n  2. Edit verify in smali so it returns 1 unconditionally - or patch the\n     if-ne so the comparison always falls through to the success path.\n  3. Repack: apktool b, producing a new unsigned APK.\n  4. Align: zipalign -p 4 on the rebuilt APK.\n  5. Sign: generate a debug key with keytool, then apksigner sign with it.\n  6. Install on your own device/emulator and run it to confirm any code passes.\n\nWhat you must not do: sign it as, or distribute it as, the original developer's\napp. You cannot reproduce their signature without their private key, and passing\noff a modified build as theirs - or redistributing their app at all - is the\nboundary module 1 drew. This is for studying your own copy.",
          explanation: "The repack-and-resign loop is the standard way to test a hypothesis about an APK: change the code, run it, see if behaviour matches your reading. The align-then-sign order is the part beginners get wrong, because signing must be the final operation on the file. And the ownership line is not a footnote - it is the difference between analysis and infringement, and it is worth stating out loud every time.",
        },
      ],
    },
  ],
};
