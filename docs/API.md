# API Reference

This document provides detailed information about all available Roslyn MCP tools.

## Tool Overview

Roslyn MCP provides 10 reliable C# development tools with 100% success rate:

| Tool | Category | Description |
|------|----------|-------------|
| [`lsp_get_diagnostics`](#lsp_get_diagnostics) | Code Quality | Get errors, warnings, and suggestions |
| [`lsp_get_completion`](#lsp_get_completion) | Code Intelligence | Get code completion suggestions |
| [`lsp_get_definitions`](#lsp_get_definitions) | Navigation | Navigate to symbol definitions |
| [`lsp_find_references`](#lsp_find_references) | Navigation | Find all references to a symbol |
| [`lsp_get_document_symbols`](#lsp_get_document_symbols) | Navigation | List all symbols in a file |
| [`lsp_get_workspace_symbols`](#lsp_get_workspace_symbols) | Navigation | Search symbols across project |
| [`lsp_get_code_actions`](#lsp_get_code_actions) | Code Quality | Get quick fixes and refactoring suggestions |
| [`lsp_rename_symbol`](#lsp_rename_symbol) | Editing | Rename symbols across the project |
| [`lsp_format_document`](#lsp_format_document) | Editing | Format C# code according to conventions |
| [`ping`](#ping) | System | Server health check |

## Code Quality Tools

### `lsp_get_diagnostics`

Get errors, warnings, and suggestions for a C# file.

**Usage**: "Check for errors in Program.cs"

**Parameters**:
- `file_path` (string): Path to the C# file to analyze

**Returns**:
- Array of diagnostic messages with severity levels
- Line and column information for each issue
- Suggested fixes where available

**Example Response**:
```json
[
  {
    "severity": "Error",
    "message": "The name 'variableName' does not exist in the current context",
    "line": 15,
    "column": 12,
    "code": "CS0103"
  },
  {
    "severity": "Warning",
    "message": "Variable 'temp' is assigned but never used",
    "line": 8,
    "column": 16,
    "code": "CS0219"
  }
]
```

### `lsp_get_code_actions`

Get available quick fixes and refactoring suggestions for a specific location.

**Usage**: "What fixes are available for this error?"

**Parameters**:
- `file_path` (string): Path to the C# file
- `line` (number): Line number (0-based)
- `column` (number): Column number (0-based)

**Returns**:
- Array of available code actions
- Quick fixes for errors and warnings
- Refactoring suggestions

**Example Response**:
```json
[
  {
    "title": "Generate variable 'variableName'",
    "kind": "quickfix",
    "isPreferred": true
  },
  {
    "title": "Add using statement",
    "kind": "quickfix",
    "isPreferred": false
  }
]
```

## Code Intelligence Tools

### `lsp_get_completion`

Get code completion suggestions at a specific location.

**Usage**: "What can I type here?" or "Show completion options"

**Parameters**:
- `file_path` (string): Path to the C# file
- `line` (number): Line number (0-based)
- `column` (number): Column number (0-based)

**Returns**:
- Array of completion items
- Type information and signatures
- Documentation for each suggestion

**Example Response**:
```json
[
  {
    "label": "Console.WriteLine",
    "kind": "Method",
    "detail": "void Console.WriteLine(string value)",
    "documentation": "Writes the specified string value to the standard output stream."
  },
  {
    "label": "string.Length",
    "kind": "Property",
    "detail": "int string.Length",
    "documentation": "Gets the number of characters in the current String object."
  }
]
```

## Navigation Tools

### `lsp_get_definitions`

Navigate to the definition of a symbol at a specific location.

**Usage**: "Go to definition of Calculator class"

**Parameters**:
- `file_path` (string): Path to the C# file
- `line` (number): Line number (0-based)
- `column` (number): Column number (0-based)

**Returns**:
- Array of definition locations
- File path, line, and column for each definition

**Example Response**:
```json
[
  {
    "file_path": "/project/Calculator.cs",
    "line": 10,
    "column": 18,
    "preview": "public class Calculator"
  }
]
```

### `lsp_find_references`

Find all references to a symbol at a specific location.

**Usage**: "Find all references to AddNumbers method"

**Parameters**:
- `file_path` (string): Path to the C# file
- `line` (number): Line number (0-based)
- `column` (number): Column number (0-based)

**Returns**:
- Array of reference locations
- File path, line, and column for each reference
- Context preview for each reference

**Example Response**:
```json
[
  {
    "file_path": "/project/Program.cs",
    "line": 25,
    "column": 12,
    "preview": "var result = calc.AddNumbers(5, 3);"
  },
  {
    "file_path": "/project/Tests.cs",
    "line": 15,
    "column": 20,
    "preview": "Assert.AreEqual(8, calc.AddNumbers(5, 3));"
  }
]
```

### `lsp_get_document_symbols`

List all symbols (classes, methods, properties, etc.) in a specific file.

**Usage**: "What classes and methods are in this file?"

**Parameters**:
- `file_path` (string): Path to the C# file

**Returns**:
- Hierarchical tree of symbols
- Symbol types, names, and locations

**Example Response**:
```json
[
  {
    "name": "Calculator",
    "kind": "Class",
    "line": 10,
    "column": 18,
    "children": [
      {
        "name": "AddNumbers",
        "kind": "Method",
        "line": 12,
        "column": 23,
        "detail": "public int AddNumbers(int a, int b)"
      },
      {
        "name": "SubtractNumbers",
        "kind": "Method",
        "line": 17,
        "column": 23,
        "detail": "public int SubtractNumbers(int a, int b)"
      }
    ]
  }
]
```

### `lsp_get_workspace_symbols`

Search for symbols across the entire project.

**Usage**: "Find all classes containing 'Calculator'" or "List all methods with 'Add'"

**Parameters**:
- `query` (string): Search query (can be empty to list all symbols)

**Returns**:
- Array of matching symbols across the project
- Symbol types, names, and locations

**Example Response**:
```json
[
  {
    "name": "Calculator",
    "kind": "Class",
    "file_path": "/project/Calculator.cs",
    "line": 10,
    "column": 18
  },
  {
    "name": "AdvancedCalculator",
    "kind": "Class",
    "file_path": "/project/Advanced/AdvancedCalculator.cs",
    "line": 8,
    "column": 18
  }
]
```

## Editing Tools

### `lsp_rename_symbol`

Rename a symbol across the entire project.

**Usage**: "Rename Calculator class to MathCalculator"

**Parameters**:
- `file_path` (string): Path to the C# file
- `line` (number): Line number (0-based)
- `column` (number): Column number (0-based)
- `new_name` (string): New name for the symbol

**Returns**:
- Array of file changes
- All locations where the symbol was renamed

**Example Response**:
```json
{
  "changes": [
    {
      "file_path": "/project/Calculator.cs",
      "edits": [
        {
          "line": 10,
          "column": 18,
          "old_text": "Calculator",
          "new_text": "MathCalculator"
        }
      ]
    },
    {
      "file_path": "/project/Program.cs",
      "edits": [
        {
          "line": 5,
          "column": 12,
          "old_text": "Calculator",
          "new_text": "MathCalculator"
        }
      ]
    }
  ]
}
```

### `lsp_format_document`

Format a C# file according to language conventions.

**Usage**: "Format this C# file"

**Parameters**:
- `file_path` (string): Path to the C# file to format

**Returns**:
- Formatted version of the file
- Array of formatting changes applied

**Example Response**:
```json
{
  "formatted_content": "using System;\n\nnamespace MyProject\n{\n    public class Calculator\n    {\n        public int Add(int a, int b)\n        {\n            return a + b;\n        }\n    }\n}",
  "changes": [
    {
      "line": 5,
      "description": "Added proper indentation"
    },
    {
      "line": 8,
      "description": "Fixed brace placement"
    }
  ]
}
```

## System Tools

### `ping`

Check server health and status.

**Usage**: "Is the server running?"

**Parameters**: None

**Returns**:
- Server status information
- Initialization state
- Performance metrics

**Example Response**:
```json
{
  "status": "healthy",
  "initialized": true,
  "response_time": "45ms",
  "tools_available": 10,
  "project_loaded": true
}
```

## Tool Integration with Claude Code

### Automatic Tool Selection

Claude Code automatically selects the appropriate tool based on your request:

- **Error Analysis**: "Check for errors" → `lsp_get_diagnostics`
- **Code Navigation**: "Go to definition" → `lsp_get_definitions`
- **Symbol Search**: "Find references" → `lsp_find_references`
- **Code Completion**: "What can I type here?" → `lsp_get_completion`
- **Refactoring**: "Rename this method" → `lsp_rename_symbol`
- **Code Formatting**: "Format this file" → `lsp_format_document`

### Common Usage Patterns

#### Error Detection and Fixing
```
1. "Check for errors in Program.cs" → lsp_get_diagnostics
2. "What fixes are available for line 15?" → lsp_get_code_actions
3. "Apply the suggested fix" → (Claude Code applies the fix)
```

#### Code Navigation
```
1. "Find all classes in this project" → lsp_get_workspace_symbols
2. "Show me the Calculator class definition" → lsp_get_definitions
3. "Where is AddNumbers method used?" → lsp_find_references
```

#### Code Completion and IntelliSense
```
1. "What methods are available on this object?" → lsp_get_completion
2. "Show me all Console methods" → lsp_get_completion
3. "What parameters does this method accept?" → lsp_get_completion
```

## Unity-Specific Features

### Unity.Logging Support

All tools work with Unity.Logging:

```csharp
using Unity.Logging;

public class MyScript : MonoBehaviour
{
    void Start()
    {
        Log.Info("Script started"); // ✅ Full IntelliSense support
    }
}
```

### MonoBehaviour Integration

Tools provide full support for Unity base classes:

- **Document Symbols**: Lists all MonoBehaviour methods
- **Completion**: Provides Unity lifecycle methods
- **Diagnostics**: Validates Unity-specific code patterns

### Unity Assembly Support

All tools work with Unity's assembly system:

- Custom assembly definitions (.asmdef)
- Unity package assemblies
- External Unity references

## Performance Characteristics

### Response Times

- **Document Symbols**: ~20ms
- **Diagnostics**: ~50ms
- **Completion**: ~30ms
- **Workspace Symbols**: ~100ms (after warmup)
- **References**: ~40ms
- **Rename**: ~200ms (depends on project size)

### Initialization

- **Small Projects**: 5-10 seconds
- **Unity Projects**: 15-30 seconds
- **Large Projects**: 30-60 seconds (use --fast-start)

### Memory Usage

- **Base Memory**: ~100MB
- **Per Project**: ~50-200MB (depends on project size)
- **Unity Projects**: ~300-500MB (includes Unity assemblies)

## Error Handling

### Common Error Types

- **File Not Found**: Invalid file paths
- **Syntax Errors**: Malformed C# code
- **Project Not Loaded**: Server initialization incomplete
- **Symbol Not Found**: Invalid symbol locations

### Error Response Format

```json
{
  "error": true,
  "message": "File not found: /invalid/path.cs",
  "code": "FILE_NOT_FOUND",
  "suggestion": "Ensure the file path is correct and the file exists"
}
```

## Best Practices

### Tool Selection

- Use `lsp_get_completion` instead of removed SignatureHelp
- Use `lsp_get_document_symbols` for file-level symbol exploration
- Use `lsp_get_workspace_symbols` for project-wide symbol search
- Prefer `lsp_get_diagnostics` for comprehensive error analysis

### Performance Tips

- Allow 5-10 seconds for initial workspace indexing
- Use fast-start mode for large projects
- Cache results for repeated queries
- Use specific queries for workspace symbol search

### Unity Development

- Ensure Unity project is properly configured
- Use Unity.Logging for logging functionality
- Leverage MonoBehaviour IntelliSense features
- Test with Unity-generated solution files

## Migration from Other Tools

### From OmniSharp

- `lsp_get_diagnostics` replaces OmniSharp code check
- `lsp_get_completion` replaces OmniSharp auto-completion
- `lsp_rename_symbol` replaces OmniSharp rename functionality

### From Visual Studio Code C# Extension

- All tools provide equivalent functionality
- Better Unity project support
- Consistent response formats
- Improved error handling

## Version Compatibility

- **Roslyn LSP**: 5.0.0+
- **.NET Framework**: 4.8+
- **.NET Core**: 6.0+
- **.NET**: 8.0+
- **Unity**: 2022.3+

For more information, see the [Installation Guide](INSTALLATION.md) and [Examples](EXAMPLES.md).