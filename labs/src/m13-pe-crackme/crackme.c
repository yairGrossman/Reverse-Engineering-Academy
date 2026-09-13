/*
 * m13-pe-crackme - the PE lab for "Patching, Keygenning, Instrumentation".
 *
 * A name-and-serial check: the serial is DERIVED from the name, so the same
 * binary supports both attacks the module teaches. Keygen = replicate the
 * derivation and emit the serial for any name. Patch = flip the comparison so
 * any serial is accepted. The derivation is a small invertible-per-name
 * function, deterministic, so the answer never changes between builds.
 *
 *   serial(name) = ((sum of name bytes) * 1337 + 7) mod 100000, printed %05u
 */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

__attribute__((noinline))
static unsigned int serial_for(const char *name) {
  unsigned int sum = 0;
  for (const char *p = name; *p; p++) {
    sum += (unsigned char)*p;
  }
  return (sum * 1337u + 7u) % 100000u;
}

int main(int argc, char **argv) {
  if (argc != 3) {
    puts("usage: crackme <name> <serial>");
    return 1;
  }

  unsigned int expected = serial_for(argv[1]);
  unsigned int given = (unsigned int)strtoul(argv[2], NULL, 10);

  if (given == expected) {
    puts("registered");
    return 0;
  }

  puts("not registered");
  return 2;
}
