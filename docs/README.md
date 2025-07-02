# Roslyn MCP Documentation

This directory contains documentation for the Roslyn MCP (Model Context Protocol) server implementation.

## 📁 Structure

- **`investigations/`** - Deep dive investigations and problem resolutions
  - `WORKSPACE_SYMBOLS_INVESTIGATION.md` - Analysis of workspace symbols issue
  - `WORKSPACE_SYMBOLS_RESOLUTION.md` - Solution and verification results

## 🔧 Available Tools

The Roslyn MCP server provides the following C# language tools:

### Navigation & Analysis
- `hover` - Get type signatures and documentation
- `definitions` - Navigate to symbol definitions  
- `references` - Find all references to a symbol
- `documentSymbols` - List all symbols in a file
- `workspaceSymbols` - Search symbols across entire project

### Code Intelligence
- `completion` - Get code completion suggestions
- `signatureHelp` - Get parameter hints for method calls
- `codeActions` - Get available quick fixes and refactorings

### Code Quality
- `diagnostics` - Get errors, warnings, and suggestions
- `formatting` - Format C# code according to conventions

## 🚀 Key Features

1. **Automatic Document Synchronization** - All tools handle file opening/syncing automatically
2. **Solution/Project Loading** - Automatic discovery and loading of .sln/.csproj files
3. **Full LSP Protocol Support** - Comprehensive implementation of Language Server Protocol features
4. **Roslyn-Powered** - Uses Microsoft's official C# language server

## 🧪 Testing

See `tests/manual/` directory for comprehensive test scripts covering all functionality.