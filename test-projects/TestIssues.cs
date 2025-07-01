using System;
using System.Collections.Generic;
using System.Linq;
using UnusedNamespace; // This will cause CS0246 - namespace doesn't exist

namespace TestProject
{
    public class TestIssues
    {
        private int unusedField = 42; // CS0169 - unused field
        private string? nullableField; // CS8618 - nullable reference not initialized
        
        [Obsolete("This method is deprecated. Use NewMethod() instead.")]
        public void OldMethod()
        {
            Console.WriteLine("This is deprecated");
        }
        
        public void TestMethod()
        {
            // CS0219 - unused local variable
            int unusedLocal = 10;
            
            // CS0029 - cannot implicitly convert
            string text = 123;
            
            // CS1002 - syntax error - missing semicolon
            int x = 5;
            
            // CS0165 - use of unassigned local variable
            int uninitialized;
            Console.WriteLine(uninitialized);
            
            // CS0103 - name doesn't exist in current context
            NonExistentMethod();
            
            // CS0019 - operator cannot be applied
            bool result = "hello" + 5 > 10;
            
            // CS8602 - possible null reference
            string? nullableString = null;
            int length = nullableString.Length;
            
            // CS0162 - unreachable code
            return;
            Console.WriteLine("This will never execute");
        }
        
        // CS0111 - duplicate method definition
        public void TestMethod()
        {
            Console.WriteLine("Duplicate method");
        }
        
        // CS0161 - not all code paths return a value
        public int MethodWithoutReturn()
        {
            if (DateTime.Now.Year > 2023)
            {
                return 42;
            }
            // Missing return statement for else case
        }
        
        // CS8618 - nullable reference type issue
        public string RequiredProperty { get; set; }
    }
    
    // CS0246 - type not found
    public class InvalidBaseClass : NonExistentClass
    {
        
    }
}