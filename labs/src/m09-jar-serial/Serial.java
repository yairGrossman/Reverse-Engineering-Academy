// Lab: a Java jar whose serial is NOT stored as a string.
//
// The first jar in this module keeps its serial in the constant pool, where a
// decompiler prints it directly. This one keeps only a byte table and a
// transform, so you must read the bytecode (or the decompiled loop) and invert
// it - the same idea as the native and .NET labs, in JVM bytecode.
public class Serial {
    private static final int[] EXPECTED = {
        98, 92, 72, 98, 55, 116, 26, 38, 11, 123, 125
    };

    public static boolean check(String candidate) {
        if (candidate.length() != EXPECTED.length) {
            return false;
        }
        for (int i = 0; i < EXPECTED.length; i++) {
            int mixed = ((candidate.charAt(i) ^ (i * 3 + 0x11)) + 7) & 0xFF;
            if (mixed != EXPECTED[i]) {
                return false;
            }
        }
        return true;
    }

    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("usage: java -jar serial.jar <serial>");
            return;
        }
        System.out.println(check(args[0]) ? "serial ok" : "serial bad");
        System.exit(check(args[0]) ? 0 : 2);
    }
}
