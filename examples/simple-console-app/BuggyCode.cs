using System;

namespace SimpleConsoleApp
{
    class BuggyCode
    {
        static void Main(string[] args)
        {
            // Type mismatch error
            int number = "this is a string";
            
            // Undefined method
            Console.WritLine("Hello");
            
            // Missing semicolon
            var calc = new Calculator()
            
            // Undefined variable
            result = calc.Add(10, 5);
            
            // Wrong parameter count
            calc.Add(1, 2, 3);
            
            // Incomplete code for completion testing
            Console.
        }
    }
}