// Lab: a .NET assembly. Compiled to IL, not machine code — which is why a
// decompiler can hand you back something very close to this file.
using System;

namespace ReAcademy.Lab
{
    public static class Program
    {
        private const string LicenseKey = "RA-2F81-KOBOLD";

        public static int Main(string[] args)
        {
            if (args.Length == 0)
            {
                Console.WriteLine("usage: keycheck <key>");
                return 1;
            }

            bool ok = string.Equals(args[0], LicenseKey, StringComparison.Ordinal);
            Console.WriteLine(ok ? "valid" : "invalid");
            return ok ? 0 : 2;
        }
    }
}
