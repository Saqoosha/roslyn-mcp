using System;

namespace TestNamespace
{
    public class Calculator
    {
        /// <summary>
        /// Adds two integers and returns the result.
        /// </summary>
        /// <param name="a">First integer</param>
        /// <param name="b">Second integer</param>
        /// <returns>Sum of a and b</returns>
        public int Add(int a, int b)
        {
            return a + b;
        }

        /// <summary>
        /// Multiplies two numbers.
        /// </summary>
        public double Multiply(double x, double y)
        {
            return x * y;
        }
    }

    class Program
    {
        static void Main(string[] args)
        {
            var calculator = new Calculator();
            int result = calculator.Add(5, 3);
            Console.WriteLine($"Result: {result}");
        }
    }
}