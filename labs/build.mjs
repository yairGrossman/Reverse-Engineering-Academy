/**
 * Lab artifact builder.
 *
 * Compiles every lab under labs/src/<id>/ into a real binary, verifies it is
 * actually the format it claims to be, wraps it in a password-protected zip,
 * and records size + SHA-256 in a generated manifest the site imports.
 *
 * Why a password: these are unsigned, deliberately crackme-shaped
 * executables. Antivirus quarantines them and browsers block the download.
 * The password is published in the lesson — it defeats the scanner, not the
 * learner. ZipCrypto (not AES) is used deliberately: measured on this
 * machine, an AES zip cannot be opened by Info-ZIP `unzip` ("need PK compat.
 * v5.1") nor by Python's stdlib `zipfile`, while ZipCrypto opens in 7-Zip,
 * `unzip` and `zipfile` alike. Broad reach matters more than strength for a
 * password everyone can read.
 *
 * Run: npm run labs:build
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC_DIR = path.join(HERE, 'src');
const OUT_DIR = path.join(ROOT, 'public', 'labs');
const MANIFEST_TS = path.join(ROOT, 'src', 'content', 'lab-manifest.ts');

/** Tool locations. Every one is overridable by env for a different machine. */
const TOOLS = {
  gcc: process.env.REA_GCC ?? 'gcc',
  gxx: process.env.REA_GXX ?? 'g++',
  strip: process.env.REA_STRIP ?? 'strip',
  zig:
    process.env.REA_ZIG ??
    'C:/Users/yairg/AppData/Local/Microsoft/WinGet/Packages/zig.zig_Microsoft.Winget.Source_8wekyb3d8bbwe/zig-x86_64-windows-0.16.0/zig.exe',
  sevenzip: process.env.REA_7Z ?? 'C:/Program Files/7-Zip/7z.exe',
  dotnet: process.env.REA_DOTNET ?? 'dotnet',
  javac: process.env.REA_JAVAC ?? 'javac',
  jar: process.env.REA_JAR ?? 'jar',
  keytool: process.env.REA_KEYTOOL ?? 'keytool',
  java: process.env.REA_JAVA ?? 'java',
  python: process.env.REA_PYTHON ?? 'python',
  androidSdk: process.env.ANDROID_SDK_ROOT ?? 'C:/Users/yairg/Android/sdk',
  buildTools: process.env.REA_BUILD_TOOLS ?? '37.0.0',
  androidPlatform: process.env.REA_ANDROID_PLATFORM ?? 'android-36',
};

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: 'pipe', ...opts });

const read = (p) => fs.readFileSync(p);

/* ---------------------------------------------------------------- verify -- */

/**
 * Format checks. Every magic value below comes from the format's own
 * specification, not from recollection:
 *   PE   - learn.microsoft.com/windows/win32/debug/pe-format ("MZ", then
 *          "PE\0\0" at the offset held at 0x3C)
 *   ELF  - System V gABI ch.4: EI_MAG0..3 = 0x7f 'E' 'L' 'F'
 *   DEX  - source.android.com dex-format: DEX_FILE_MAGIC "dex\n0??\0".
 *          The version digits VARY with --min-api (d8 emits 035 for api 21,
 *          not the 039 the doc uses as its example), so the check accepts any
 *          three-digit version rather than pinning one.
 *   PYC  - importlib.util.MAGIC_NUMBER read from the very interpreter that
 *          compiled the file, which is the only source that can be right.
 */
const verifiers = {
  PE(file) {
    const b = read(file);
    if (b.subarray(0, 2).toString('latin1') !== 'MZ') return 'no MZ signature';
    const lfanew = b.readUInt32LE(0x3c);
    if (lfanew + 4 > b.length) return 'e_lfanew points past end of file';
    if (b.subarray(lfanew, lfanew + 4).toString('latin1') !== 'PE\0\0') return 'no PE\0\0 header';
    return null;
  },
  ELF(file) {
    const b = read(file);
    const magic = [...b.subarray(0, 4)];
    const want = [0x7f, 0x45, 0x4c, 0x46];
    return magic.join() === want.join() ? null : `bad ELF magic: ${magic}`;
  },
  NET(file) {
    return verifiers.PE(file);
  },
  JAR(file) {
    const b = read(file);
    if (b.subarray(0, 2).toString('latin1') !== 'PK') return 'not a zip';
    const listing = run(TOOLS.sevenzip, ['l', file]);
    return listing.includes('.class') ? null : 'jar contains no .class entries';
  },
  APK(file) {
    const b = read(file);
    if (b.subarray(0, 2).toString('latin1') !== 'PK') return 'not a zip';
    const listing = run(TOOLS.sevenzip, ['l', file]);
    if (!listing.includes('classes.dex')) return 'apk has no classes.dex';
    if (!listing.includes('AndroidManifest.xml')) return 'apk has no AndroidManifest.xml';
    return null;
  },
  DEX(file) {
    const b = read(file);
    const s = b.subarray(0, 8).toString('latin1');
    return /^dex\n\d{3}\0$/.test(s) ? null : `bad dex magic: ${JSON.stringify(s)}`;
  },
  PYC(file) {
    const expected = run(TOOLS.python, [
      '-c',
      'import importlib.util,sys; sys.stdout.write(importlib.util.MAGIC_NUMBER.hex())',
    ]).trim();
    const got = read(file).subarray(0, 4).toString('hex');
    return got === expected ? null : `pyc magic ${got} != interpreter ${expected}`;
  },
};

/* --------------------------------------------------------------- builders -- */

/**
 * Each builder compiles one lab into `work/` and returns the list of files to
 * ship inside the zip, plus what to verify.
 *
 * Native builds pass -ffile-prefix-map and -fno-ident (both confirmed
 * accepted by the gcc 15.2.0 on this machine) so the artifact does not carry
 * this machine's absolute paths or a compiler-version string into a lesson
 * about reading strings out of a binary.
 */
const builders = {
  PE(lab, work) {
    const out = path.join(work, lab.artifactName ?? 'lab.exe');
    const compiler = lab.sources.some((s) => s.endsWith('.cpp')) ? TOOLS.gxx : TOOLS.gcc;
    run(compiler, [
      ...lab.sources.map((s) => path.join(lab.dir, s)),
      '-o', out,
      `-ffile-prefix-map=${lab.dir}=.`,
      '-fno-ident',
      ...(lab.flags ?? []),
    ]);
    if (lab.strip) run(TOOLS.strip, [out]);
    return { files: [out], verify: [['PE', out]] };
  },

  ELF(lab, work) {
    const out = path.join(work, lab.artifactName ?? 'lab');
    run(TOOLS.zig, [
      'cc', '-target', 'x86_64-linux-gnu',
      ...lab.sources.map((s) => path.join(lab.dir, s)),
      '-o', out,
      ...(lab.flags ?? []),
    ]);
    return { files: [out], verify: [['ELF', out]] };
  },

  NET(lab, work) {
    const proj = path.join(lab.dir, lab.project);
    const pub = path.join(work, 'net');
    run(TOOLS.dotnet, ['build', proj, '-c', 'Release', '-o', pub, '--nologo', '-v', 'quiet']);
    const asm = path.join(pub, lab.artifactName);
    if (!fs.existsSync(asm)) throw new Error(`dotnet produced no ${lab.artifactName}`);
    // The runtimeconfig sits next to the assembly and `dotnet <dll>` needs it,
    // so ship it too — a lab the learner cannot run is half a lab.
    const cfg = asm.replace(/\.dll$/, '.runtimeconfig.json');
    const files = fs.existsSync(cfg) ? [asm, cfg] : [asm];
    return { files, verify: [['NET', asm]] };
  },

  JAR(lab, work) {
    const classes = path.join(work, 'classes');
    fs.mkdirSync(classes, { recursive: true });
    run(TOOLS.javac, ['-d', classes, ...lab.sources.map((s) => path.join(lab.dir, s))]);
    const out = path.join(work, lab.artifactName ?? 'lab.jar');
    // `cfe` sets an entry point so the jar is runnable; `cf` when there is none.
    run(
      TOOLS.jar,
      lab.mainClass
        ? ['cfe', out, lab.mainClass, '-C', classes, '.']
        : ['cf', out, '-C', classes, '.'],
    );
    return { files: [out], verify: [['JAR', out]] };
  },

  PYC(lab, work) {
    const staged = path.join(work, 'py');
    fs.mkdirSync(staged, { recursive: true });
    for (const s of lab.sources) fs.copyFileSync(path.join(lab.dir, s), path.join(staged, s));
    run(TOOLS.python, ['-m', 'compileall', '-b', '-q', staged]);
    const out = path.join(staged, lab.sources[0].replace(/\.py$/, '.pyc'));
    if (!fs.existsSync(out)) throw new Error('compileall produced no .pyc');
    return { files: [out], verify: [['PYC', out]] };
  },

  /**
   * APK without Gradle: javac -> d8 -> aapt2 link -> add dex -> zipalign ->
   * apksigner. Verified end to end on this machine; the result is a six-entry
   * apk small enough that a lesson can walk every file in it, which a Gradle
   * build's androidx/R/multidex output would bury.
   */
  APK(lab, work) {
    const sdk = TOOLS.androidSdk;
    const bt = path.join(sdk, 'build-tools', TOOLS.buildTools);
    const androidJar = path.join(sdk, 'platforms', TOOLS.androidPlatform, 'android.jar');
    const classes = path.join(work, 'classes');
    fs.mkdirSync(classes, { recursive: true });

    run(TOOLS.javac, [
      '-source', '17', '-target', '17', '-nowarn',
      '-cp', androidJar, '-d', classes,
      ...lab.sources.map((s) => path.join(lab.dir, s)),
    ]);

    const classFiles = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.class')) classFiles.push(full);
      }
    };
    walk(classes);
    // Node refuses to spawn .bat directly, so the wrappers are bypassed and
    // their real entry points invoked. Both were read out of the shipped
    // tools themselves: d8.bat runs `-cp lib/d8.jar com.android.tools.r8.D8`,
    // and apksigner.jar declares Main-Class com.android.apksigner.ApkSignerTool.
    run(TOOLS.java, [
      '-cp', path.join(bt, 'lib', 'd8.jar'), 'com.android.tools.r8.D8',
      '--min-api', String(lab.minApi ?? 21), '--output', work, ...classFiles,
    ]);
    const dex = path.join(work, 'classes.dex');

    const base = path.join(work, 'base.apk');
    run(path.join(bt, 'aapt2.exe'), [
      'link', '-o', base, '-I', androidJar,
      '--manifest', path.join(lab.dir, 'AndroidManifest.xml'),
      '--min-sdk-version', String(lab.minApi ?? 21),
      '--target-sdk-version', String(lab.targetApi ?? 36),
    ]);
    run(TOOLS.sevenzip, ['a', '-tzip', base, dex], { cwd: work });

    const aligned = path.join(work, 'aligned.apk');
    run(path.join(bt, 'zipalign.exe'), ['-f', '-p', '4', base, aligned]);

    const ks = path.join(work, 'debug.keystore');
    run(TOOLS.keytool, [
      '-genkeypair', '-keystore', ks, '-storepass', 'android', '-keypass', 'android',
      '-alias', 'androiddebugkey', '-dname', 'CN=RE Academy Lab, O=Course, C=US',
      '-validity', '10000', '-keyalg', 'RSA', '-keysize', '2048',
    ]);

    const out = path.join(work, lab.artifactName ?? 'lab.apk');
    const apksignerJar = path.join(bt, 'lib', 'apksigner.jar');
    run(TOOLS.java, [
      '-jar', apksignerJar,
      'sign', '--ks', ks, '--ks-pass', 'pass:android', '--key-pass', 'pass:android',
      '--ks-key-alias', 'androiddebugkey', '--out', out, aligned,
    ]);
    const verdict = run(TOOLS.java, ['-jar', apksignerJar, 'verify', out]);
    if (/DOES NOT VERIFY/i.test(verdict)) throw new Error(`apksigner rejected ${out}`);

    return { files: [out], verify: [['APK', out], ['DEX', dex]] };
  },
};

/* ----------------------------------------------------------------- driver -- */

/** ZipCrypto, so 7-Zip, Info-ZIP `unzip` and Python's zipfile can all open it. */
function packageZip(files, outZip, password) {
  fs.rmSync(outZip, { force: true });
  run(TOOLS.sevenzip, ['a', '-tzip', `-p${password}`, '-mem=ZipCrypto', outZip, ...files]);
  if (!fs.existsSync(outZip)) throw new Error(`7z produced no ${outZip}`);
}

const sha256 = (file) => createHash('sha256').update(read(file)).digest('hex');

function buildLab(id) {
  const dir = path.join(SRC_DIR, id);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const lab = { ...meta, id, dir };

  const builder = builders[lab.format];
  if (!builder) throw new Error(`lab ${id}: unknown format ${lab.format}`);

  const work = path.join(dir, '.work');
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });

  const { files, verify } = builder(lab, work);

  for (const [format, file] of verify) {
    const problem = verifiers[format](file);
    if (problem) throw new Error(`lab ${id}: ${path.basename(file)} failed ${format} check — ${problem}`);
  }

  const extras = (lab.include ?? []).map((f) => path.join(dir, f));
  const outZip = path.join(OUT_DIR, lab.zip);
  packageZip([...files, ...extras], outZip, lab.password);

  // Prove the published zip really opens with the published password.
  const probe = path.join(work, 'probe');
  run(TOOLS.sevenzip, ['x', outZip, `-p${lab.password}`, `-o${probe}`, '-y']);
  const extracted = fs.readdirSync(probe);
  if (extracted.length === 0) throw new Error(`lab ${id}: zip extracted to nothing`);

  fs.rmSync(work, { recursive: true, force: true });

  return {
    zip: lab.zip,
    entry: {
      sha256: sha256(outZip),
      bytes: fs.statSync(outZip).size,
      format: lab.format,
      builtAt: new Date().toISOString(),
    },
  };
}

function writeManifest(entries) {
  const body = Object.keys(entries)
    .sort()
    .map((k) => {
      const e = entries[k];
      return `  ${JSON.stringify(k)}: {\n    sha256: '${e.sha256}',\n    bytes: ${e.bytes},\n    format: '${e.format}',\n    builtAt: '${e.builtAt}',\n  },`;
    })
    .join('\n');

  fs.writeFileSync(
    MANIFEST_TS,
    `/**
 * GENERATED FILE — written by \`npm run labs:build\` (labs/build.mjs).
 * Do not edit by hand: every value here is measured from the artifact that
 * build actually produced, so a size or hash can never drift from the file
 * the learner downloads.
 */

export interface LabArtifact {
  /** SHA-256 of the published zip, lowercase hex. */
  sha256: string;
  /** Size of the published zip in bytes. */
  bytes: number;
  /** Artifact format inside the zip. */
  format: string;
  /** ISO timestamp of the build that produced it. */
  builtAt: string;
}

/** Keyed by the filename served under /labs. */
export const LAB_MANIFEST: Record<string, LabArtifact> = {
${body}
};
`,
    'utf8',
  );
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(SRC_DIR)) {
    console.log('No labs/src — nothing to build.');
    return;
  }
  const only = process.argv[2];
  const ids = fs
    .readdirSync(SRC_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .filter((id) => !only || id === only)
    .sort();

  const entries = {};
  let failed = 0;
  for (const id of ids) {
    try {
      const { zip, entry } = buildLab(id);
      entries[zip] = entry;
      console.log(`  ok  ${id.padEnd(28)} ${entry.format.padEnd(4)} ${String(entry.bytes).padStart(8)} B  ${entry.sha256.slice(0, 16)}…`);
    } catch (err) {
      failed++;
      console.error(`  FAIL ${id}: ${err.message.split('\n')[0]}`);
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} lab(s) failed to build.`);
    process.exit(1);
  }

  // A single-lab run must not wipe the other labs out of the manifest.
  if (only) {
    const current = fs.existsSync(MANIFEST_TS) ? fs.readFileSync(MANIFEST_TS, 'utf8') : '';
    for (const m of current.matchAll(
      /"([^"]+)":\s*\{\s*sha256:\s*'([0-9a-f]+)',\s*bytes:\s*(\d+),\s*format:\s*'(\w+)',\s*builtAt:\s*'([^']+)',/g,
    )) {
      if (!entries[m[1]]) entries[m[1]] = { sha256: m[2], bytes: Number(m[3]), format: m[4], builtAt: m[5] };
    }
  }

  writeManifest(entries);
  console.log(`\n${Object.keys(entries).length} lab artifact(s) in public/labs, manifest written.`);
}

main();
