/*
 * m05-pe-licence - the lab for "Static Analysis with Ghidra".
 *
 * Two gates, on purpose. Stage one is a per-character transform whose
 * constants sit in .rdata, so the key is not a string anywhere in the file and
 * strings finds nothing. Stage two is an FNV-1a hash of the same input, which
 * is there to punish a guess: a learner who reverses stage one correctly passes
 * both, and a learner who brute-forces something plausible passes neither.
 *
 * The point is volume, not cleverness. Hand-disassembling two loops plus an
 * eight-entry table is slow and error-prone; a decompiler turns it into C you
 * can read in a minute. That contrast is the lesson.
 */
#include <stdio.h>
#include <string.h>

#define KEY_LEN 8

static const unsigned char expected[KEY_LEN] = {
  0xF2, 0xEB, 0xE0, 0xE1, 0xC4, 0xDD, 0x74, 0x69
};

__attribute__((noinline))
static int stage_transform(const char *s) {
  for (int i = 0; i < KEY_LEN; i++) {
    unsigned char mixed = (unsigned char)(((unsigned char)s[i] << 1) ^ (i * 7) ^ 0x3C);
    if (mixed != expected[i]) {
      return 0;
    }
  }
  return 1;
}

__attribute__((noinline))
static unsigned int stage_hash(const char *s) {
  unsigned int h = 0x811C9DC5u;
  for (int i = 0; i < KEY_LEN; i++) {
    h = (h ^ (unsigned char)s[i]) * 0x01000193u;
  }
  return h;
}

int main(int argc, char **argv) {
  if (argc != 2) {
    puts("usage: licence <key>");
    return 1;
  }

  if (strlen(argv[1]) != KEY_LEN) {
    puts("rejected: wrong length");
    return 3;
  }

  if (!stage_transform(argv[1])) {
    puts("rejected: bad key");
    return 2;
  }

  if (stage_hash(argv[1]) != 0x9E97FE09u) {
    puts("rejected: checksum mismatch");
    return 4;
  }

  puts("licence accepted");
  return 0;
}
