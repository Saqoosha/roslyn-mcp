using System;

namespace TestProject
{
    public class SimpleTest
    {
        private int fieldVariable = 5;
        
        public void TestMethod()
        {
            var localVar = 10;
            int explicitInt = 20;
            
            Console.WriteLine($"Field: {fieldVariable}");
            Console.WriteLine($"Local: {localVar}");
            Console.WriteLine($"Explicit: {explicitInt}");
        }
    }
}