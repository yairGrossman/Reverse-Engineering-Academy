/*
 * Lab: first look at a compiled binary.
 * Everything interesting here is in plain sight — the point of the lab is
 * that a compiler keeps string literals verbatim in the data section.
 */
#include <stdio.h>
#include <string.h>

static const char BANNER[] = "RE Academy :: module 02 :: first look";

int main(int argc, char **argv) {
    if (argc < 2) {
        printf("%s\nusage: %s <passphrase>\n", BANNER, argv[0]);
        return 1;
    }
    if (strcmp(argv[1], "sandstone") == 0) {
        printf("access granted\n");
        return 0;
    }
    printf("access denied\n");
    return 2;
}
