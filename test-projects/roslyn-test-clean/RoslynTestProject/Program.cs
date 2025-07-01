using System;
using System.Collections.Generic;
using System.Linq;

namespace RoslynTestProject
{
    public class Calculator
    {
        private int _value;
        private string unusedField; // CS0169: Unused field
        
        public Calculator(int initialValue)
        {
            _value = initialValue;
        }
        
        public int Add(int number)
        {
            _value += number;
            return _value;
        }
        
        public int Subtract(int number)
        {
            _value -= number;
            return _value;
        }
        
        [Obsolete("This method is deprecated. Use GetValue() instead.")]
        public int GetCurrentValue() // CS0618: Obsolete method
        {
            return _value;
        }
        
        public int GetValue() => _value;
        
        public void TestMethod()
        {
            int unusedLocal = 42; // CS0219: Unused local variable
            string text = "hello";
            int number = text; // CS0029: Cannot convert string to int
        }
    }
    
    class Program
    {
        static void Main(string[] args)
        {
            var calc = new Calculator(10);
            
            Console.WriteLine($"Initial value: {calc.GetValue()}");
            
            // Using obsolete method to trigger CS0618
            Console.WriteLine($"Current value (obsolete): {calc.GetCurrentValue()}");
            
            calc.Add(5);
            Console.WriteLine($"After adding 5: {calc.GetValue()}");
            
            calc.Subtract(3);
            Console.WriteLine($"After subtracting 3: {calc.GetValue()}");
        }
    }
}
