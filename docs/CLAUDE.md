# Claude Code Integration Guide

This guide explains how to integrate Roslyn MCP with Claude Code for professional C# development.

## Quick Setup

Add to your Claude Code MCP configuration (`.mcp.json`):

```json
{
  "mcpServers": {
    "roslyn-lsp": {
      "command": "node",
      "args": ["/path/to/roslyn-mcp/dist/cli.js", "/path/to/your/csharp/project"],
      "env": {
        "PROJECT_ROOT": "/path/to/your/csharp/project"
      }
    }
  }
}
```

## Available Tools

Roslyn MCP provides 10 reliable C# development tools:

### Code Navigation
- **`lsp_get_definitions`** - Navigate to symbol definitions
- **`lsp_find_references`** - Find all references to a symbol
- **`lsp_get_document_symbols`** - List all symbols in a file
- **`lsp_get_workspace_symbols`** - Search symbols across entire project

### Code Intelligence
- **`lsp_get_completion`** - Get code completion suggestions with type information
- **`lsp_get_code_actions`** - Get quick fixes and refactoring suggestions
- **`lsp_get_diagnostics`** - Get errors, warnings, and suggestions

### Code Editing
- **`lsp_rename_symbol`** - Rename symbols across the project
- **`lsp_format_document`** - Format C# code according to conventions

### System
- **`ping`** - Server health check

## Usage Examples

Once configured, Claude Code will automatically use these tools when you ask for C# development assistance:

```
"Check for errors in Program.cs"
→ Uses lsp_get_diagnostics

"Find all references to Calculator class"
→ Uses lsp_find_references

"Rename method AddNumbers to Sum"
→ Uses lsp_rename_symbol

"Format this C# file"
→ Uses lsp_format_document

"What classes are in this project?"
→ Uses lsp_get_workspace_symbols

"Show me completion options for this method"
→ Uses lsp_get_completion
```

## Unity Project Support

Roslyn MCP provides comprehensive Unity project support:

### Configuration for Unity
```json
{
  "mcpServers": {
    "roslyn-lsp": {
      "command": "node",
      "args": [
        "/path/to/roslyn-mcp/dist/cli.js",
        "--fast-start",
        "/path/to/your/unity/project"
      ],
      "env": {
        "PROJECT_ROOT": "/path/to/your/unity/project"
      }
    }
  }
}
```

### Unity Features
- **Unity.Logging**: Complete support for `Log.Info()`, `Log.Warning()`, etc.
- **Unity Assemblies**: All Unity packages and dependencies automatically loaded
- **MonoBehaviour**: Full IntelliSense for Unity base classes
- **Custom Assemblies**: Support for assembly definitions (.asmdef)
- **Large Projects**: Fast-start mode for complex Unity solutions

## Large Project Configuration

For complex projects that may take longer to initialize:

```json
{
  "mcpServers": {
    "roslyn-lsp": {
      "command": "node",
      "args": [
        "/path/to/roslyn-mcp/dist/cli.js",
        "--fast-start",
        "--timeout", "180000",
        "/path/to/your/project"
      ]
    }
  }
}
```

**Fast-Start Mode Benefits:**
- Immediate tool availability during initialization
- Background loading of complex solutions
- Progressive enhancement as features become ready
- No timeout issues with large codebases

## System Requirements

- **Node.js 18+** and **npm**
- **.NET 8.0+** SDK
- **Claude Code** (Claude.ai/code)

## Environment Variables

- **`PROJECT_ROOT`**: Path to your C# project or solution
- **`DOTNET_ROOT`**: Path to .NET installation (optional, auto-detected)

## Architecture

The system consists of three main components:

1. **Roslyn LSP Server**: Microsoft's official C# language server
2. **MCP Bridge**: Translates between LSP and MCP protocols
3. **Claude Code Integration**: Exposes tools via MCP protocol

## Common Workflows

### Code Analysis
```
"Analyze this C# file for issues"
→ Uses lsp_get_diagnostics + lsp_get_code_actions
```

### Code Navigation
```
"Show me all methods in this class"
→ Uses lsp_get_document_symbols

"Find where this method is called"
→ Uses lsp_find_references
```

### Code Refactoring
```
"Rename this variable throughout the project"
→ Uses lsp_rename_symbol

"Format this file and fix code style"
→ Uses lsp_format_document
```

### Unity Development
```
"Check Unity.Logging usage in this script"
→ Uses lsp_get_diagnostics with Unity context

"Find all MonoBehaviour classes"
→ Uses lsp_get_workspace_symbols
```

## Performance

- **Average Response Time**: ~50ms for most operations
- **Initialization Time**: 5-10 seconds for typical projects
- **Large Projects**: 30-40 seconds with fast-start mode
- **Success Rate**: 100% reliability (10/10 tools working)

## Troubleshooting

### Common Issues

**Server not starting**: Check Node.js and .NET installation
**No symbols found**: Allow 5-10 seconds for workspace indexing
**Unity errors**: Ensure Unity project is properly configured

### Getting Help

- Check server logs for detailed error information
- Use `ping` tool to verify server health
- Refer to the [Troubleshooting Guide](TROUBLESHOOTING.md) for common issues

## Next Steps

- [Installation Guide](INSTALLATION.md) - Complete setup instructions
- [API Reference](API.md) - Detailed tool documentation
- [Examples](EXAMPLES.md) - More usage examples and patterns