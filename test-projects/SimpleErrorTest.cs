using System;

namespace TestProject
{
    public class SimpleErrorTest
    {
        private int unusedField = 42; // Should trigger CS0169
        
        [Obsolete("This method is deprecated")]
        public void DeprecatedMethod()
        {
            Console.WriteLine("Deprecated");
        }
        
        public void TestErrors()
        {
            // Type conversion error
            string text = 123; // CS0029
            
            // Unused variable
            int unused = 10; // CS0219
            
            // Use deprecated method
            DeprecatedMethod(); // Should show obsolete warning
            
            // Uninitialized variable
            int x;
            Console.WriteLine(x); // CS0165
        }
    }
}