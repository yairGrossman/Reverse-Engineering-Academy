/*
 * Lab: the secret is not in the file as text.
 * A one-byte XOR is the simplest possible obfuscation, and it is enough to
 * defeat `strings` completely — which is the entire point of the exercise.
 */
#include <stdio.h>
#include <string.h>

static const unsigned char ENC[] = { 0x4F, 0x4E, 0x55, 0x5C, 0x48, 0x4F, 0x5E, 0x55 };
static const unsigned char K = 0x3B;

int main(int argc, char **argv) {
    char buf[sizeof(ENC) + 1];
    size_t i;

    for (i = 0; i < sizeof(ENC); i++) {
        buf[i] = (char)(ENC[i] ^ K);
    }
    buf[sizeof(ENC)] = 0;

    if (argc < 2) {
        printf("usage: %s <word>\n", argv[0]);
        return 1;
    }
    if (strcmp(argv[1], buf) == 0) {
        printf("correct\n");
        return 0;
    }
    printf("wrong\n");
    return 2;
}
