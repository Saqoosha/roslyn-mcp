using System;
using System.Collections.Generic;
using System.Linq;

namespace TestProject
{
    public class Calculator
    {
        private int _value;
        private string unusedVariable; // Unused field warning
        
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
        public int GetCurrentValue()
        {
            return _value;
        }
        
        public int GetValue() => _value;
        
        public void TestMethod()
        {
            int unusedLocal = 42; // Unused local variable
            string text = "hello";
            int number = text; // Type error: cannot convert string to int
        }
    }
    
    class Program
    {
        static void Main(string[] args)
        {
            var calc = new Calculator(10);
            
            Console.WriteLine($"Initial value: {calc.GetValue()}");
            
            // Using obsolete method to test warnings
            Console.WriteLine($"Current value (obsolete): {calc.GetCurrentValue()}");
            
            calc.Add(5);
            Console.WriteLine($"After adding 5: {calc.GetValue()}");
            
            calc.Subtract(3);
            Console.WriteLine($"After subtracting 3: {calc.GetValue()}");
            
            var numbers = new List<int> { 1, 2, 3, 4, 5 };
            var sum = numbers.Sum();
            Console.WriteLine($"Sum of numbers: {sum}");
        }
    }
}