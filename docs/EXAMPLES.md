# Usage Examples

Practical examples of using C# IntelliSense in Claude Code with Roslyn MCP.

## Getting Started

Once Roslyn MCP is configured, just chat naturally with Claude Code about your C# projects. Here are common scenarios.

## Code Analysis

### Finding and Fixing Errors

**What you say**: "Check for errors in Program.cs"

**What happens**: Claude analyzes your file and reports issues.

**Example response**:
```
Found 2 errors in Program.cs:

1. Line 15: The name 'variableName' does not exist in the current context
   - Suggestion: Check spelling or add missing using statement

2. Line 22: Missing semicolon after statement  
   - Suggestion: Add ';' at end of line
```

**Follow-up**: "What fixes are available for line 15?"

**Response**:
```
Available quick fixes for line 15:
1. Generate local variable 'variableName'
2. Generate field 'variableName'  
3. Add using statement for missing namespace
4. Did you mean 'variableName2'? (similar identifier)
```

### Code Quality Analysis

**What you say**: "Analyze this project for code quality issues"

**What happens**: Claude checks all your C# files for problems.

**Example response**:
```
Code quality analysis complete:

📁 Program.cs - 2 warnings
• Line 8: Variable 'temp' assigned but never used
• Line 15: Consider using 'var' for type inference

📁 Calculator.cs - 1 suggestion  
• Line 23: Method can be made static

📁 Models/User.cs - Clean ✅

Overall: 3 minor issues found, no critical errors.
```

## Code Navigation

### Finding Definitions

**What you say**: "Go to the definition of Calculator"

**What happens**: Claude shows where Calculator is defined.

**Example response**:
```
Calculator is defined in:
📁 /src/Calculator.cs at line 12

public class Calculator
{
    public int Add(int a, int b) => a + b;
    public int Subtract(int a, int b) => a - b;
}
```

### Finding References

**What you say**: "Find all places where Calculator is used"

**What happens**: Claude shows everywhere Calculator appears.

**Example response**:
```
Found 8 references to Calculator:

📁 Program.cs
• Line 15: var calc = new Calculator();
• Line 16: var result = calc.Add(5, 3);

📁 Tests/CalculatorTests.cs  
• Line 12: private Calculator _calculator;
• Line 18: _calculator = new Calculator();
• Line 23: Assert.AreEqual(8, _calculator.Add(5, 3));

📁 Services/MathService.cs
• Line 7: private readonly Calculator _calc;
• Line 12: public MathService(Calculator calculator)
• Line 18: return _calc.Multiply(a, b);
```

### Exploring Code Structure

**What you say**: "What classes and methods are in this file?"

**What happens**: Claude shows the file's structure.

**Example response**:
```
Structure of Calculator.cs:

📦 Calculator (class)
├── ➕ Add(int a, int b) → int
├── ➖ Subtract(int a, int b) → int  
├── ✖️ Multiply(int a, int b) → int
└── ➗ Divide(int a, int b) → double

📦 CalculatorExtensions (static class)
└── 🔢 ToPercentage(this double value) → string
```

**What you say**: "What classes are in my entire project?"

**What happens**: Claude searches across all files.

**Example response**:
```
Classes in your project:

📁 /src/Calculator.cs
• Calculator
• CalculatorExtensions

📁 /src/Models/User.cs  
• User
• UserSettings

📁 /src/Services/MathService.cs
• MathService
• IMathService (interface)

Total: 5 classes, 1 interface
```

## Code Editing

### Renaming Symbols

**What you say**: "Rename the method AddNumbers to Sum"

**What happens**: Claude renames it everywhere in your project.

**Example response**:
```
Renamed 'AddNumbers' to 'Sum' in 4 locations:

📁 Calculator.cs - Line 15: Method definition
📁 Program.cs - Line 23: Method call  
📁 Tests/CalculatorTests.cs - Line 18: Test method call
📁 Documentation.md - Line 45: Code example

All references updated successfully ✅
```

### Code Formatting

**What you say**: "Format this C# file"

**What happens**: Claude applies proper C# formatting.

**Example response**:
```
Formatted Calculator.cs:

✅ Fixed indentation (8 lines)
✅ Added proper spacing around operators  
✅ Aligned braces according to C# conventions
✅ Organized using statements

File is now properly formatted according to C# style guidelines.
```

## Code Completion

### Getting IntelliSense

**What you say**: "What methods are available on this string variable?"

**What happens**: Claude shows available string methods.

**Example response**:
```
Available methods on string:

🔤 Text Methods:
• ToUpper() → string - Convert to uppercase
• ToLower() → string - Convert to lowercase  
• Trim() → string - Remove whitespace
• Replace(string, string) → string - Replace text

🔍 Search Methods:
• Contains(string) → bool - Check if contains text
• StartsWith(string) → bool - Check if starts with text
• IndexOf(string) → int - Find position of text

📏 Information:
• Length → int - Number of characters
• IsNullOrEmpty(string) → bool - Check if null/empty

+ 50 more methods available...
```

**What you say**: "Show me all Console methods"

**What happens**: Claude shows Console class methods.

**Example response**:
```
Console class methods:

📝 Output:
• WriteLine(string) - Write line to console
• Write(string) - Write text without newline
• Clear() - Clear console screen

⌨️ Input:  
• ReadLine() → string - Read user input
• ReadKey() → ConsoleKeyInfo - Read single key

🎨 Formatting:
• ForegroundColor - Set text color
• BackgroundColor - Set background color
• ResetColor() - Reset to default colors
```

## Unity Development

### Unity-Specific Help

**What you say**: "Check this MonoBehaviour script for issues"

**What happens**: Claude analyzes your Unity script.

**Example response**:
```
Unity script analysis for PlayerController.cs:

✅ Inheritance: Properly inherits from MonoBehaviour
✅ Unity Messages: Start() and Update() methods found
⚠️ Performance: Update() called every frame - consider optimization

Suggestions:
• Line 23: Cache GetComponent<Rigidbody>() in Start()
• Line 31: Use CompareTag() instead of == for tag comparison
• Line 45: Consider using Unity Events for jump action

Unity best practices compliance: 85% ✅
```

**What you say**: "What Unity.Logging methods can I use?"

**What happens**: Claude shows Unity logging options.

**Example response**:
```
Unity.Logging methods available:

📊 Log Levels:
• Log.Info(string message) - General information
• Log.Warning(string message) - Warning messages  
• Log.Error(string message) - Error messages
• Log.Debug(string message) - Debug information

🏷️ With Categories:
• Log.Info("Player", "Health changed to {0}", health)
• Log.Warning("AI", "Pathfinding failed for {0}", target)

💡 Best Practice: Use structured logging with categories for better debugging.
```

### Unity Project Analysis

**What you say**: "What Unity classes are available in my project?"

**What happens**: Claude searches for Unity-related classes.

**Example response**:
```
Unity classes in your project:

🎮 MonoBehaviour Scripts:
• PlayerController - Controls player movement
• EnemyAI - AI behavior system
• GameManager - Game state management

📦 ScriptableObjects:  
• WeaponData - Weapon configuration
• LevelSettings - Level-specific settings

🔧 Editor Scripts:
• CustomPropertyDrawer - Custom inspector UI
• BuildPostProcessor - Build automation

Total: 6 Unity scripts found
```

## Advanced Scenarios

### Complex Refactoring

**What you say**: "Help me refactor this method to be more readable"

**What happens**: Claude analyzes and suggests improvements.

**Example response**:
```
Refactoring suggestions for CalculateScore():

Current issues:
• Method too long (45 lines, recommend < 20)
• Multiple responsibilities (calculation + validation + logging)
• Nested if statements (depth 4, recommend < 3)

Suggested refactoring:
1. Extract validation into ValidateInput()
2. Extract calculation into ComputeBaseScore()  
3. Extract logging into LogScoreCalculation()
4. Use early returns to reduce nesting

Would you like me to show the refactored code?
```

### Cross-File Analysis

**What you say**: "Find all methods that use the User class"

**What happens**: Claude searches across your entire solution.

**Example response**:
```
Methods using User class across solution:

📁 UserService.cs:
• CreateUser(string name, string email) → User
• GetUser(int id) → User
• UpdateUser(User user) → bool
• DeleteUser(int id) → bool

📁 AuthenticationController.cs:
• Login(string email, string password) → User
• Register(UserRegistrationModel model) → User

📁 UserRepository.cs:
• SaveUser(User user) → void
• FindByEmail(string email) → User

Found 8 methods across 3 files using User class.
```

## Tips for Better Results

### Be Specific
- ❌ "Check my code" 
- ✅ "Check Program.cs for syntax errors"

### Use Natural Language
- ❌ "Run lsp_get_diagnostics on file X"
- ✅ "Find errors in file X"

### Ask Follow-up Questions
- "Why is this error happening?"
- "How can I fix this warning?"
- "What's the best practice here?"

### Reference Files Clearly
- "Check the Calculator class in Calculator.cs"
- "Find all usages of the Login method"
- "Show me the structure of my Models folder"

## Getting Help

If something isn't working as expected:

1. **Check server status**: "Is the C# server running?"
2. **Verify file paths**: Make sure you're referencing the correct file names
3. **Wait for initialization**: Large projects may take 1-2 minutes to fully load
4. **Ask for clarification**: "I'm not seeing IntelliSense, what should I check?"

For setup issues, see the [Installation Guide](INSTALLATION.md) or [Troubleshooting Guide](CLAUDE.md#troubleshooting).