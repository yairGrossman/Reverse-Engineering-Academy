/*
 * m07-pe-headers / m07-elf-headers - the pair for "PE and ELF File Formats".
 *
 * Deliberately dull behaviour: the lab is about the container, not the code.
 * One marker string in read-only data gives the learner something to locate by
 * header arithmetic (RVA or virtual address in, file offset out), and one
 * printed hint keeps the program honest about what it does.
 *
 * Both artifacts are built from THIS one file, so every difference between them
 * is a difference between the two formats.
 */
#include <stdio.h>
#include <string.h>

static const char marker[] = "REA-HEADERS-LAB-M07";

int main(int argc, char **argv) {
  if (argc == 2 && strcmp(argv[1], "--marker") == 0) {
    puts(marker);
    return 0;
  }
  puts("headers lab: run with --marker");
  return 1;
}
