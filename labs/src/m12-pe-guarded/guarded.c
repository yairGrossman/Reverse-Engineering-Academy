/*
 * m12-pe-guarded - the lab for "Obfuscation, Packing, Anti-Analysis".
 *
 * Two defences a beginner meets constantly, both DETECTION exercises rather
 * than anything exotic:
 *   1. An anti-debug check: IsDebuggerPresent gates the real path. Under a
 *      naive debugger it prints "debugger detected" and refuses; the analysis
 *      lesson is to see the API in the imports and bypass the check.
 *   2. String obfuscation: the flag is XOR-encoded in .data and decoded at
 *      runtime, so `strings` shows ciphertext, not the flag.
 *
 * The module then packs this same binary with UPX so the learner can measure
 * what packing does to sections, entropy and imports, and unpack it.
 */
#include <windows.h>
#include <stdio.h>
#include <string.h>

/* "FLAG{unpack_me}" XORed byte-by-byte with 0x5A. */
static unsigned char enc[] = {
  0x1C, 0x16, 0x1B, 0x1D, 0x21, 0x2F, 0x34, 0x2A, 0x3B, 0x39, 0x31, 0x05, 0x37, 0x3F, 0x27
};

int main(void) {
  if (IsDebuggerPresent()) {
    puts("debugger detected");
    return 3;
  }

  char flag[sizeof(enc) + 1];
  for (size_t i = 0; i < sizeof(enc); i++) {
    flag[i] = (char)(enc[i] ^ 0x5A);
  }
  flag[sizeof(enc)] = '\0';

  puts("no debugger; here is the flag:");
  puts(flag);
  return 0;
}
