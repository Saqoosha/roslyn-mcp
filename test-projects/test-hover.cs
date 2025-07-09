using System;

namespace TestProject
{
    public class Calculator
    {
        public int Add(int a, int b)
        {
            return a + b;
        }
        
        public static void Main()
        {
            var calc = new Calculator();
            var result = calc.Add(5, 3);
            Console.WriteLine(result);
        }
    }
}