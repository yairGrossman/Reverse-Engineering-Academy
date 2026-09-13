// Lab: a .NET assembly whose key is NOT a string in the file.
//
// The first .NET lab in this module hands you its key in the constant pool,
// which `strings` finds in one command. This one stores only a table and a
// transform, so the key exists nowhere until you invert the arithmetic - the
// same idea as the native labs, expressed in IL instead of x86.
using System;

namespace ReAcademy.Lab
{
    public static class Program
    {
        private static readonly byte[] Expected =
        {
            0x7F, 0x6F, 0x65, 0x66, 0x62, 0x56, 0x70, 0x4B, 0x63, 0x5E
        };

        private static bool Check(string candidate)
        {
            if (candidate.Length != Expected.Length)
            {
                return false;
            }

            for (int i = 0; i < Expected.Length; i++)
            {
                byte mixed = (byte)((candidate[i] + (i * 5)) ^ 0x3B);
                if (mixed != Expected[i])
                {
                    return false;
                }
            }

            return true;
        }

        public static int Main(string[] args)
        {
            if (args.Length == 0)
            {
                Console.WriteLine("usage: licence <key>");
                return 1;
            }

            if (Check(args[0]))
            {
                Console.WriteLine("licence ok");
                return 0;
            }

            Console.WriteLine("licence rejected");
            return 2;
        }
    }
}
