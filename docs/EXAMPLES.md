# Usage Examples

This guide provides practical examples of using Roslyn MCP with Claude Code for C# development.

## Getting Started

Once Roslyn MCP is configured, Claude Code will automatically use the appropriate tools based on your requests. Here are common scenarios and examples.

## Code Analysis Examples

### Error Detection and Fixing

**Scenario**: You want to check for errors in your C# code.

```
User: "Check for errors in Program.cs"

Claude Code: I'll analyze Program.cs for errors and warnings.
→ Uses: lsp_get_diagnostics

Result: Found 2 errors:
1. Line 15: The name 'variableName' does not exist in the current context
2. Line 22: Missing semicolon after statement
```

**Follow-up**: Get suggestions for fixing errors.

```
User: "What fixes are available for the error on line 15?"

Claude Code: I'll check available quick fixes for that location.
→ Uses: lsp_get_code_actions

Result: Available fixes:
1. Generate variable 'variableName'
2. Add using statement for missing namespace
3. Change to 'variableName' (similar identifier)
```

### Code Quality Analysis

**Scenario**: Comprehensive code quality check.

```
User: "Analyze this entire C# project for code quality issues"

Claude Code: I'll analyze all C# files for errors, warnings, and suggestions.
→ Uses: lsp_get_diagnostics (for multiple files)

Result: Found issues in 3 files:
- Program.cs: 2 errors, 1 warning
- Calculator.cs: 1 warning (unused variable)
- Models/User.cs: 3 suggestions (code style improvements)
```

## Code Navigation Examples

### Finding Definitions

**Scenario**: You want to understand where a class or method is defined.

```
User: "Show me the definition of the Calculator class"

Claude Code: I'll find the definition of Calculator class.
→ Uses: lsp_get_definitions

Result: Calculator class is defined in:
- File: /project/Calculator.cs
- Line: 10, Column: 18
- Preview: public class Calculator
```

### Finding References

**Scenario**: You want to see where a method is used throughout your project.

```
User: "Find all places where AddNumbers method is used"

Claude Code: I'll search for all references to AddNumbers method.
→ Uses: lsp_find_references

Result: Found 5 references:
1. Program.cs:25 - var result = calc.AddNumbers(5, 3);
2. Tests.cs:15 - Assert.AreEqual(8, calc.AddNumbers(5, 3));
3. Calculator.cs:12 - Method definition
4. Documentation.md:45 - Code example
5. Utils.cs:30 - var sum = calculator.AddNumbers(x, y);
```

### Project Structure Exploration

**Scenario**: You want to understand the overall structure of your project.

```
User: "What classes and methods are in this project?"

Claude Code: I'll show you the structure of your project.
→ Uses: lsp_get_workspace_symbols

Result: Found 15 symbols:
Classes:
- Calculator (Calculator.cs)
- AdvancedCalculator (Advanced/AdvancedCalculator.cs)
- User (Models/User.cs)
- Program (Program.cs)

Methods:
- AddNumbers, SubtractNumbers (Calculator.cs)
- ComplexCalculation (AdvancedCalculator.cs)
- Main (Program.cs)
```

### File-Level Symbol Analysis

**Scenario**: You want to see all symbols in a specific file.

```
User: "Show me all methods and properties in Calculator.cs"

Claude Code: I'll list all symbols in Calculator.cs.
→ Uses: lsp_get_document_symbols

Result: Calculator.cs contains:
- Class: Calculator
  - Property: Name (string)
  - Method: AddNumbers(int a, int b) → int
  - Method: SubtractNumbers(int a, int b) → int
  - Method: GetResult() → double
  - Private field: _lastResult
```

## Code Completion Examples

### IntelliSense and Auto-completion

**Scenario**: You want to see what methods are available on an object.

```
User: "What methods can I call on the Console object?"

Claude Code: I'll show you available methods on Console.
→ Uses: lsp_get_completion

Result: Available Console methods:
- WriteLine(string) - Writes line to output
- Write(string) - Writes text to output
- ReadLine() - Reads line from input
- Clear() - Clears the console screen
- Beep() - Makes a beep sound
```

### Method Parameter Information

**Scenario**: You want to understand method parameters.

```
User: "What parameters does String.Format accept?"

Claude Code: I'll show you the String.Format method overloads.
→ Uses: lsp_get_completion

Result: String.Format overloads:
1. Format(string format, object arg0)
2. Format(string format, object arg0, object arg1)
3. Format(string format, params object[] args)
4. Format(IFormatProvider provider, string format, params object[] args)
```

### Type-Specific Completion

**Scenario**: You want to see properties available on a custom type.

```
User: "What properties are available on the User class?"

Claude Code: I'll show you User class properties.
→ Uses: lsp_get_completion

Result: User class properties:
- Id (int) - User identifier
- Name (string) - User's full name
- Email (string) - User's email address
- CreatedAt (DateTime) - Account creation date
- IsActive (bool) - Account status
```

## Code Refactoring Examples

### Symbol Renaming

**Scenario**: You want to rename a method across your entire project.

```
User: "Rename the AddNumbers method to CalculateSum throughout the project"

Claude Code: I'll rename AddNumbers to CalculateSum across all files.
→ Uses: lsp_rename_symbol

Result: Renamed in 8 locations:
- Calculator.cs:12 - Method definition
- Calculator.cs:15 - Method documentation
- Program.cs:25 - Method call
- Tests.cs:15 - Test method call
- Tests.cs:18 - Another test call
- Utils.cs:30 - Utility method call
- README.md:45 - Documentation example
- Comments.cs:8 - Code comment reference
```

### Class Renaming

**Scenario**: You want to rename a class and update all references.

```
User: "Rename Calculator class to MathCalculator"

Claude Code: I'll rename Calculator to MathCalculator throughout the project.
→ Uses: lsp_rename_symbol

Result: Updated 12 files:
- Calculator.cs → MathCalculator.cs (file renamed)
- Program.cs - Variable declarations updated
- Tests.cs - Test class references updated
- Factory.cs - Factory method updated
- All using statements updated
- All instantiation calls updated
```

### Code Formatting

**Scenario**: You want to format your C# code according to conventions.

```
User: "Format this C# file according to standard conventions"

Claude Code: I'll format the code according to C# conventions.
→ Uses: lsp_format_document

Result: Applied formatting changes:
- Fixed indentation (8 lines)
- Corrected brace placement (4 locations)
- Adjusted spacing around operators (12 locations)
- Aligned method parameters (3 methods)
- Standardized using statement order
```

## Unity Development Examples

### Unity.Logging Usage

**Scenario**: You're working with Unity.Logging in your Unity project.

```
User: "Check if my Unity.Logging usage is correct"

Claude Code: I'll analyze your Unity.Logging usage.
→ Uses: lsp_get_diagnostics

Result: Unity.Logging analysis:
✅ Log.Info() calls are properly formatted
✅ All required using statements present
✅ Log levels are appropriate
⚠️ Consider using structured logging for better performance
```

### MonoBehaviour Development

**Scenario**: You're creating a Unity script with MonoBehaviour.

```
User: "What Unity lifecycle methods are available for MonoBehaviour?"

Claude Code: I'll show you available MonoBehaviour methods.
→ Uses: lsp_get_completion

Result: MonoBehaviour lifecycle methods:
- Start() - Called before first frame update
- Update() - Called once per frame
- FixedUpdate() - Called at fixed intervals
- LateUpdate() - Called after all Update calls
- OnEnable() - Called when object becomes active
- OnDisable() - Called when object becomes inactive
- OnDestroy() - Called when object is destroyed
```

### Unity Assembly References

**Scenario**: You want to find Unity-specific classes and methods.

```
User: "Find all classes related to Unity physics"

Claude Code: I'll search for Unity physics-related classes.
→ Uses: lsp_get_workspace_symbols

Result: Unity physics classes found:
- Rigidbody (UnityEngine.Physics)
- Collider (UnityEngine.Physics)
- Joint (UnityEngine.Physics)
- PhysicsMaterial (UnityEngine.Physics)
- RaycastHit (UnityEngine.Physics)
- Custom: PlayerPhysics (Scripts/PlayerPhysics.cs)
```

## Complex Workflow Examples

### Debugging Workflow

**Scenario**: You have a bug and want to systematically debug it.

```
1. User: "Check for errors in PlayerController.cs"
   → Uses: lsp_get_diagnostics
   Result: Found null reference warning on line 45

2. User: "Show me the code around line 45"
   → Uses: lsp_get_document_symbols
   Result: Line 45 is in Update() method

3. User: "Find all references to the variable causing the null reference"
   → Uses: lsp_find_references
   Result: Variable 'playerInput' used in 6 locations

4. User: "What methods initialize playerInput?"
   → Uses: lsp_get_workspace_symbols
   Result: InitializeInput() method in same class

5. User: "Check if InitializeInput is called before Update"
   → Uses: lsp_find_references
   Result: InitializeInput() called in Start() method
```

### Refactoring Workflow

**Scenario**: You want to refactor a large class into smaller components.

```
1. User: "Show me all methods in GameManager.cs"
   → Uses: lsp_get_document_symbols
   Result: 25 methods found, class is quite large

2. User: "Find methods related to UI management"
   → Uses: lsp_get_workspace_symbols (query: "UI")
   Result: 8 UI-related methods found

3. User: "Show me all references to UpdateUI method"
   → Uses: lsp_find_references
   Result: Called from 12 different locations

4. User: "Rename UpdateUI to RefreshUserInterface"
   → Uses: lsp_rename_symbol
   Result: Updated all 12 references

5. User: "Format the refactored code"
   → Uses: lsp_format_document
   Result: Code formatted according to conventions
```

### Unity Project Setup

**Scenario**: You're setting up a new Unity project with proper logging.

```
1. User: "What Unity.Logging methods are available?"
   → Uses: lsp_get_completion
   Result: Log.Info, Log.Warning, Log.Error, Log.Debug

2. User: "Check if Unity.Logging is properly configured"
   → Uses: lsp_get_diagnostics
   Result: Missing using Unity.Logging; statement

3. User: "Show me examples of proper Unity.Logging usage"
   → Uses: lsp_get_workspace_symbols
   Result: Found 3 files with proper logging patterns

4. User: "Find all Debug.Log calls that should be replaced"
   → Uses: lsp_find_references
   Result: 15 Debug.Log calls found for replacement
```

## Performance Optimization Examples

### Code Performance Analysis

**Scenario**: You want to optimize your code performance.

```
User: "Find all methods that might have performance issues"

Claude Code: I'll analyze your code for potential performance issues.
→ Uses: lsp_get_diagnostics + lsp_get_code_actions

Result: Performance suggestions:
- Use StringBuilder instead of string concatenation (3 locations)
- Consider caching expensive calculations (2 methods)
- Optimize LINQ queries (4 locations)
- Use object pooling for frequently created objects (1 class)
```

### Memory Usage Optimization

**Scenario**: You want to reduce memory allocations.

```
User: "Find places where we create unnecessary objects"

Claude Code: I'll look for potential memory optimization opportunities.
→ Uses: lsp_get_diagnostics + lsp_get_workspace_symbols

Result: Memory optimization opportunities:
- Frequent List<T> allocations in GameLoop.cs
- String concatenation in Logger.cs
- Unnecessary boxing in ConfigManager.cs
- Consider using struct instead of class for Point2D
```

## Testing Examples

### Test Coverage Analysis

**Scenario**: You want to ensure your code is properly tested.

```
User: "Find all public methods that might need unit tests"

Claude Code: I'll find public methods and check for corresponding tests.
→ Uses: lsp_get_workspace_symbols + lsp_find_references

Result: Methods potentially needing tests:
- Calculator.AddNumbers (has tests)
- Calculator.SubtractNumbers (has tests)
- ValidationHelper.IsValidEmail (no tests found)
- DataProcessor.ProcessData (no tests found)
```

### Test Method Generation

**Scenario**: You want to understand how to test a specific method.

```
User: "How should I test the ValidateInput method?"

Claude Code: I'll analyze the ValidateInput method structure.
→ Uses: lsp_get_document_symbols + lsp_get_definitions

Result: ValidateInput method analysis:
- Parameters: string input, ValidationRules rules
- Returns: bool
- Throws: ArgumentNullException, ValidationException
- Suggest testing: null input, empty input, valid input, invalid input
```

## Integration Examples

### API Integration

**Scenario**: You're integrating with external APIs.

```
User: "Find all HTTP client usage in the project"

Claude Code: I'll search for HTTP client related code.
→ Uses: lsp_get_workspace_symbols + lsp_find_references

Result: HTTP client usage found:
- ApiClient.cs - Main HTTP client wrapper
- UserService.cs - User API calls
- DataSyncService.cs - Data synchronization
- All using proper async/await patterns
```

### Database Integration

**Scenario**: You want to review database access patterns.

```
User: "Check database connection usage for potential issues"

Claude Code: I'll analyze database connection patterns.
→ Uses: lsp_get_diagnostics + lsp_get_workspace_symbols

Result: Database analysis:
✅ All connections properly disposed
✅ Using parameterized queries
⚠️ Consider connection pooling in DataAccess.cs
⚠️ Add retry logic for transient failures
```

## Tips for Effective Usage

### Best Practices

1. **Start with Diagnostics**: Always check for errors first
2. **Use Workspace Symbols**: Great for exploring unknown codebases
3. **Combine Tools**: Use multiple tools for complex analysis
4. **Format Regularly**: Keep code clean with regular formatting
5. **Test Renames**: Use find references before renaming symbols

### Common Patterns

- **Error → Fix**: `lsp_get_diagnostics` → `lsp_get_code_actions`
- **Explore → Navigate**: `lsp_get_workspace_symbols` → `lsp_get_definitions`
- **Understand → Refactor**: `lsp_find_references` → `lsp_rename_symbol`
- **Code → Complete**: `lsp_get_completion` → `lsp_format_document`

### Unity-Specific Tips

- Use Unity.Logging instead of Debug.Log for better performance
- Leverage MonoBehaviour lifecycle methods for proper initialization
- Use workspace symbols to find Unity-specific classes and methods
- Check diagnostics regularly during Unity development

For more detailed information about each tool, see the [API Reference](API.md).
For installation and setup, see the [Installation Guide](INSTALLATION.md).
For Claude Code integration, see the [Claude Code Guide](CLAUDE.md).