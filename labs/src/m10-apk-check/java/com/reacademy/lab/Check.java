package com.reacademy.lab;

/**
 * Lab: Android bytecode. Compiled to dex, but jadx reconstructs Java from it,
 * so the constants below survive the trip.
 */
public class Check {
    private static final int KEY = 0x5A;
    private static final int TARGET = 0x7B;

    public static boolean verify(String code) {
        if (code == null || code.length() != 6) {
            return false;
        }
        int sum = 0;
        for (char c : code.toCharArray()) {
            sum += (c ^ KEY);
        }
        return sum == TARGET;
    }
}
