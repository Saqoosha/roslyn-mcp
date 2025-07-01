using System;

namespace RoslynTestProject
{
    public class SyntaxErrors
    {
        public void TestSemanticErrors()
        {
            // Type conversion error - should trigger CS0029
            string text = 123;
            
            // Unused variable - should trigger CS0219
            int unused = 42;
            
            // Uninitialized variable - should trigger CS0165
            int uninitialized;
            Console.WriteLine(uninitialized);
            
            // Undefined variable - should trigger CS0103
            nonExistentVariable = 42;
        }
    }
}