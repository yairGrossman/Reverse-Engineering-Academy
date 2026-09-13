// m13-net-crackme - the .NET lab for "Patching, Keygenning, Instrumentation".
//
// Same name-and-serial idea as the PE crackme, in a managed assembly, so the
// keygen and the patch can be compared across native and .NET. The serial is
// derived from the name; keygen replicates it, or patch the branch.
using System;

namespace ReAcademy.Lab
{
    public static class Program
    {
        private static int SerialFor(string name)
        {
            int sum = 0;
            foreach (char c in name)
            {
                sum += (byte)c;
            }
            return (sum * 1337 + 7) % 100000;
        }

        public static int Main(string[] args)
        {
            if (args.Length != 2)
            {
                Console.WriteLine("usage: crackme <name> <serial>");
                return 1;
            }

            int expected = SerialFor(args[0]);
            int given = int.TryParse(args[1], out int g) ? g : -1;

            if (given == expected)
            {
                Console.WriteLine("registered");
                return 0;
            }

            Console.WriteLine("not registered");
            return 2;
        }
    }
}
