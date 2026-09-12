// Lab: Java bytecode. The .class inside the jar keeps names and constants,
// so a decompiler reconstructs this almost exactly.
public class License {
    private static final String SERIAL = "JV-91C4-ORCHID";

    public static boolean check(String candidate) {
        return SERIAL.equals(candidate);
    }

    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("usage: java -jar license.jar <serial>");
            return;
        }
        System.out.println(check(args[0]) ? "valid" : "invalid");
    }
}
