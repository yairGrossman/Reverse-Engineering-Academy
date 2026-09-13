/*
 * m06-pe-unlock - the lab for "Dynamic Analysis".
 *
 * The accepted key is not a constant and not a decryptable blob: it is the
 * output of five thousand rounds of a linear congruential mix, formatted as
 * eight hex digits. Statically you have to read the constants and re-simulate
 * the loop; at a breakpoint you simply read the value. Both routes work, which
 * is the comparison the module makes - the debugger is not magic, it is faster.
 *
 * Everything is arithmetic on a uint32, so the answer is the same for every
 * build of this source on every compiler: no timestamps, no addresses, no
 * self-checksums. A lab whose answer moves when it is rebuilt is a lab that
 * rots.
 */
#include <stdio.h>
#include <string.h>

#define ROUNDS 5000

__attribute__((noinline))
static unsigned int mix(void) {
  unsigned int x = 0x12345678u;
  for (int i = 0; i < ROUNDS; i++) {
    x = x * 1103515245u + 12345u;
  }
  return x;
}

int main(int argc, char **argv) {
  if (argc != 2) {
    puts("usage: unlock <key>");
    return 1;
  }

  char expected[16];
  sprintf(expected, "%08X", mix());

  if (strcmp(argv[1], expected) == 0) {
    puts("unlocked");
    return 0;
  }

  puts("locked");
  return 2;
}
