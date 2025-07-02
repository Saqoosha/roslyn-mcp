using System;

namespace SimpleConsoleApp
{
    /// <summary>
    /// A simple console application for testing roslyn-mcp
    /// </summary>
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello, roslyn-mcp!");
            
            var calculator = new Calculator();
            var result = calculator.Add(10, 5);
            var difference = calculator.Subtract(10, 3);
            
            Console.WriteLine($"Addition: {result}");
            Console.WriteLine($"Subtraction: {difference}");
            
            var helper = new MathHelper();
            var doubled = helper.Double(result);
            Console.WriteLine($"Doubled: {doubled}");
        }
    }
    
    /// <summary>
    /// Basic calculator operations
    /// </summary>
    public class Calculator
    {
        /// <summary>
        /// Adds two integers
        /// </summary>
        /// <param name="a">First number</param>
        /// <param name="b">Second number</param>
        /// <returns>Sum of a and b</returns>
        public int Add(int a, int b)
        {
            return a + b;
        }
        
        /// <summary>
        /// Subtracts second number from first
        /// </summary>
        /// <param name="a">First number</param>
        /// <param name="b">Second number</param>
        /// <returns>Difference of a and b</returns>
        public int Subtract(int a, int b)
        {
            return a - b;
        }
    }
    
    /// <summary>
    /// Mathematical helper functions
    /// </summary>
    public class MathHelper
    {
        /// <summary>
        /// Doubles the input value
        /// </summary>
        /// <param name="value">Value to double</param>
        /// <returns>Double the input value</returns>
        public int Double(int value)
        {
            return value * 2;
        }
    }
}