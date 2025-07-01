using System;
using System.Collections.Generic;
using System.Linq;

namespace RoslynTestProject
{
    public class LiveDemoTest
    {
        private readonly int _unused = 42;
        
        [Obsolete("This method is old, use NewMethod instead")]
        public void OldApiMethod()
        {
            Console.WriteLine("Deprecated functionality");
        }
        
        public void NewMethod()
        {
            Console.WriteLine("New functionality");
        }
        
        public void TestVariousIssues()
        {
            // Fixed syntax issues
            int broken = 5;
            
            // Fixed string
            string message = "Hello World";
            
            // This should work after fixing syntax
            Console.WriteLine("Testing diagnostics");
        }
        
        public void SemanticIssues()
        {
            // Calling obsolete method - should show warning
            OldApiMethod();
            
            // Type conversion issue
            string text = 123;
            
            // Unused variable
            int unused = 42;
            
            // Uninitialized variable
            int uninitialized;
            Console.WriteLine(uninitialized);
        }
    }
}