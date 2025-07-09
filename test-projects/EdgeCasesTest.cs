using System;
using System.Collections.Generic;
using System.Text;

namespace TestProject.EdgeCases
{
    // Unicode and special characters test
    public class UnicodeTestClass
    {
        // Unicode property names and strings
        public string 日本語 { get; set; } = "こんにちは世界"; // Japanese
        public string العربية { get; set; } = "مرحبا بالعالم"; // Arabic
        public string Русский { get; set; } = "Привет мир"; // Russian
        public string Emoji { get; set; } = "🚀 Hello 🌍 World! 🎉";
        
        // Special Unicode characters
        public string SpecialChars { get; set; } = "áéíóú àèìòù âêîôû äëïöü ñç";
        
        // Mathematical symbols
        public string MathSymbols { get; set; } = "∑∏∫√∞≠≤≥±∓∆∇∂";
        
        // Zero-width characters (edge case for parsing)
        public string ZeroWidth { get; set; } = "Test\u200BString\u200C\u200D";
    }

    // Very long identifier names (testing parser limits)
    public class VeryLongClassNameThatExceedsNormalLengthAndTestsParserLimitsWithManyCharacters
    {
        public string VeryLongPropertyNameThatExceedsNormalLengthAndTestsParserLimitsWithManyCharactersAndNumbers123456789 { get; set; }
        
        public void VeryLongMethodNameThatExceedsNormalLengthAndTestsParserLimitsWithManyCharactersAndParameters(
            int veryLongParameterNameThatTestsParserLimits1,
            string veryLongParameterNameThatTestsParserLimits2,
            double veryLongParameterNameThatTestsParserLimits3)
        {
            // Very long local variable name
            var veryLongLocalVariableNameThatTestsParserLimitsAndMemoryUsage = veryLongParameterNameThatTestsParserLimits1 * veryLongParameterNameThatTestsParserLimits3;
        }
    }

    // Deeply nested generics
    public class DeepGenericNesting<T1, T2, T3>
        where T1 : class, IComparable<T1>
        where T2 : struct, IEquatable<T2>
        where T3 : new()
    {
        public Dictionary<T1, List<Dictionary<T2, Queue<Stack<T3>>>>> ComplexNestedStructure { get; set; }
        
        public Func<T1, Func<T2, Func<T3, Task<Result<T1, T2, T3>>>>> NestedDelegates { get; set; }
    }

    public class Result<T1, T2, T3>
    {
        public T1 Value1 { get; set; }
        public T2 Value2 { get; set; }
        public T3 Value3 { get; set; }
    }

    // Class with syntax errors (intentional for testing diagnostics)
    public class SyntaxErrorsClass
    {
        // Missing semicolon (intentional error)
        public string MissingSemicolon { get; set }
        
        // Duplicate property (intentional error)
        public string DuplicateProperty { get; set; }
        public string DuplicateProperty { get; set; }
        
        // Method with syntax error
        public void MethodWithErrors()
        {
            // Missing closing brace
            if (true)
            {
                var x = 1;
            // Missing closing brace here
            
            // Undefined variable (intentional error)
            var result = undefinedVariable + 5;
            
            // Wrong return type
            return "string"; // Method is void, cannot return string
        }
        
        // Generic method with constraint error
        public T GenericMethodWithError<T>() where T : int // Error: int is not a valid constraint
        {
            return default(T);
        }
    }

    // Empty classes and interfaces
    public class EmptyClass
    {
        // Completely empty
    }

    public interface IEmptyInterface
    {
        // No members
    }

    public struct EmptyStruct
    {
        // No fields or properties
    }

    // Class with very long strings
    public class LongStringClass
    {
        public string VeryLongString = @"
            This is a very long string that spans multiple lines and contains lots of text to test
            how the language server handles very long string literals. Lorem ipsum dolor sit amet,
            consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna
            aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
            velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat
            non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut
            perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
            laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi
            architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas
            sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione
            voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit
            amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut
            labore et dolore magnam aliquam quaerat voluptatem.";
        
        // String with escape sequences
        public string EscapeSequences = "Line 1\nLine 2\tTabbed\r\nWindows Line End\0Null\x41Hex\\Backslash\"Quote";
        
        // Raw string literal (C# 11 feature)
        public string RawString = """
            This is a raw string literal that can contain "quotes" without escaping
            and can span multiple lines while preserving formatting.
            Special characters like \ and " don't need escaping here.
            """;
    }

    // Class with many attributes
    [Serializable]
    [Obsolete("This class is deprecated")]
    [CLSCompliant(true)]
    [System.ComponentModel.Description("A test class with many attributes")]
    public class AttributeHeavyClass
    {
        [Obsolete("Use NewProperty instead")]
        [System.ComponentModel.DefaultValue(42)]
        public int OldProperty { get; set; }
        
        [Required]
        [Range(1, 100)]
        [Display(Name = "New Property", Description = "This is the new property")]
        public int NewProperty { get; set; }
        
        [Conditional("DEBUG")]
        [MethodImpl(MethodImplOptions.NoInlining)]
        public void DebugOnlyMethod()
        {
            Console.WriteLine("Debug mode");
        }
    }

    // Preprocessor directives
    #define TESTING
    #define DEBUG_MODE

    public class PreprocessorTest
    {
        #if TESTING
        public string TestOnlyProperty { get; set; }
        #endif
        
        #if DEBUG_MODE && !RELEASE
        public void DebugMethod()
        {
            #warning This is a warning message
            Console.WriteLine("Debug mode active");
        }
        #else
        public void ReleaseMethod()
        {
            Console.WriteLine("Release mode active");
        }
        #endif
        
        #region Complex Region
        
        #if TESTING
        // Nested preprocessor directives
        #define NESTED_DEFINE
        
        #if NESTED_DEFINE
        public void NestedPreprocessorMethod() { }
        #endif
        
        #undef NESTED_DEFINE
        #endif
        
        #endregion
    }

    // Class with compiler directives
    #pragma warning disable CS0168 // Variable declared but never used
    public class CompilerDirectivesTest
    {
        public void UnusedVariableMethod()
        {
            int unusedVariable; // This should not generate warning
        }
    }
    #pragma warning restore CS0168

    // Nullable reference types (C# 8+)
    #nullable enable
    public class NullableTest
    {
        public string? NullableString { get; set; }
        public string NonNullableString { get; set; } = string.Empty;
        
        public string? ProcessString(string? input)
        {
            return input?.ToUpper();
        }
        
        public void NullabilityWarnings()
        {
            string? nullable = null;
            string nonNullable = nullable; // Should generate nullability warning
            
            Console.WriteLine(nullable.Length); // Should generate null reference warning
        }
    }
    #nullable disable

    // Platform-specific code
    public class PlatformSpecificCode
    {
        [DllImport("kernel32.dll")]
        public static extern IntPtr GetCurrentProcess();
        
        #if WINDOWS
        [DllImport("user32.dll")]
        public static extern int MessageBox(IntPtr hWnd, string text, string caption, uint type);
        #endif
        
        #if LINUX
        [DllImport("libc.so.6")]
        public static extern int getpid();
        #endif
    }

    // Async and unsafe code mixing
    public unsafe class UnsafeAsyncTest
    {
        public async Task<int> UnsafeAsyncMethod()
        {
            await Task.Delay(100);
            
            fixed (char* ptr = "Hello")
            {
                return ptr[0];
            }
        }
        
        public async Task<IntPtr> GetPointerAsync()
        {
            await Task.Yield();
            
            int value = 42;
            return new IntPtr(&value);
        }
    }
}

// Global using statements (C# 10 feature)
global using GlobalAlias = System.Collections.Generic.Dictionary<string, object>;

// File-scoped namespace (C# 10 feature)
namespace FileScoped;

public class FileScopedClass
{
    public GlobalAlias Properties { get; set; } = new();
}