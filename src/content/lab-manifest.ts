/**
 * GENERATED FILE — written by `npm run labs:build` (labs/build.mjs).
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
  "m02-elf-firstlook.zip": {
    sha256: '3aa50d6b173c243acc2e6233c5c767718494d7298478a6a3296e38ee60d93535',
    bytes: 3265,
    format: 'ELF',
    builtAt: '2026-09-12T13:18:58.361Z',
  },
  "m02-pe-firstlook.zip": {
    sha256: '59982603cf6e14ce58c8ff14074d9198e7c30c0518bab085ced2ca5ed3ecd894',
    bytes: 41147,
    format: 'PE',
    builtAt: '2026-09-12T13:18:58.744Z',
  },
  "m03-pe-xorsecret.zip": {
    sha256: '9262422d8539866f1377789e447067e7b798d90f6bf9e935ba8dff96b869e45c',
    bytes: 6750,
    format: 'PE',
    builtAt: '2026-09-12T13:27:10.072Z',
  },
  "m04-elf-keygate.zip": {
    sha256: '08cb25c4e3f70d9565707d0a10005ca74c44bf78522d7a69a6419908f20e6378',
    bytes: 3302,
    format: 'ELF',
    builtAt: '2026-09-12T23:01:13.259Z',
  },
  "m04-pe-keygate.zip": {
    sha256: '22463b1b1b9363bffe5b5dcfdb9b4c07dea33b234145fa2ef0c3e5c1a6cce06b',
    bytes: 40687,
    format: 'PE',
    builtAt: '2026-09-12T23:02:46.414Z',
  },
  "m05-pe-licence.zip": {
    sha256: '6ad1500379fa31aa7453596132238c77eef6d22caa0e5d03accddc9c9dc45de4',
    bytes: 6828,
    format: 'PE',
    builtAt: '2026-09-12T23:22:56.685Z',
  },
  "m08-net-keycheck.zip": {
    sha256: '7e5b7605fbc8446727b92810d29dd7bec61166c3e394016608ddbf0214bd62de',
    bytes: 2281,
    format: 'NET',
    builtAt: '2026-09-12T13:19:00.414Z',
  },
  "m09-jar-license.zip": {
    sha256: '6612edfb0947c5e6b7e055ef5feae9ad7bd2ee809f8d87409e6f9818848f2eeb',
    bytes: 987,
    format: 'JAR',
    builtAt: '2026-09-12T13:19:01.313Z',
  },
  "m10-apk-check.zip": {
    sha256: 'b4efecb041945dda239f594b7c092891fc59fc1363d9d66f3fb4801f3c764770',
    bytes: 4660,
    format: 'APK',
    builtAt: '2026-09-12T13:20:20.751Z',
  },
  "m11-pyc-token.zip": {
    sha256: '68c43a238b80ea1035754041beaa730ac79800c4eca2a054a262189e7887246f',
    bytes: 911,
    format: 'PYC',
    builtAt: '2026-09-12T13:19:04.880Z',
  },
};
