/*
 * m04-elf-keygate — the lab for "x86-64 Assembly You Actually Need".
 *
 * The accepted number is never stored anywhere in the file. It only exists
 * as three immediate operands inside transform(), so the learner has to read
 * the disassembly and invert the arithmetic. `strings` finds nothing useful
 * (module 2's technique) and there is no encoded blob to brute-force
 * (module 3's technique).
 *
 * transform() is noinline on purpose: inlined, the argument registers the
 * module teaches would never appear in the disassembly.
 */
#include <stdio.h>
#include <stdlib.h>

__attribute__((noinline))
static long transform(long seed, long salt) {
  long x = seed * 6;
  x += salt;
  return x ^ 0x5F;
}

int main(int argc, char **argv) {
  if (argc != 2) {
    puts("usage: keygate <number>");
    return 1;
  }

  long seed = strtol(argv[1], NULL, 10);

  if (transform(seed, 0x2A) == 0x1337) {
    puts("correct");
    return 0;
  }

  puts("wrong");
  return 2;
}
