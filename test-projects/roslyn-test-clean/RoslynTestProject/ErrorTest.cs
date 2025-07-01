using System;

namespace RoslynTestProject
{
    public class ErrorTest
    {
        [Obsolete("This method is deprecated")]
        public void OldMethod()
        {
            Console.WriteLine("Deprecated");
        }
        
        public void TestMethod()
        {
            // This should trigger CS0029 - cannot convert int to string
            string text = 123;
            
            // This should trigger CS0219 - unused local variable  
            int unused = 42;
            
            // This should trigger CS0618 - obsolete member usage
            OldMethod();
            
            // This should trigger CS0165 - uninitialized variable
            int uninitialized;
            Console.WriteLine(uninitialized);
        }
    }
}