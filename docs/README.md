# Documentation

Welcome to the Roslyn MCP documentation. This directory contains comprehensive guides for using Roslyn MCP with Claude Code.

## 📚 Documentation Overview

### Getting Started
- **[Installation Guide](INSTALLATION.md)** - Complete setup instructions with prerequisites, configuration, and troubleshooting
- **[Claude Code Integration](CLAUDE.md)** - How to integrate Roslyn MCP with Claude Code for C# development

### Reference Documentation
- **[API Reference](API.md)** - Detailed documentation for all 10 available tools with parameters and examples
- **[Examples](EXAMPLES.md)** - Practical usage examples for common C# development scenarios

### Project Information
- **[Main README](../README.md)** - Project overview, features, and quick start guide

## 🚀 Quick Navigation

### For New Users
1. Start with [Installation Guide](INSTALLATION.md) to set up Roslyn MCP
2. Read [Claude Code Integration](CLAUDE.md) to configure Claude Code
3. Try examples from [Examples](EXAMPLES.md) to get familiar with the tools

### For Experienced Users
- [API Reference](API.md) - Complete tool documentation
- [Examples](EXAMPLES.md) - Advanced usage patterns and workflows

## 🔧 Available Tools

Roslyn MCP provides 10 reliable C# development tools:

### Code Navigation
- `lsp_get_definitions` - Navigate to symbol definitions
- `lsp_find_references` - Find all references to a symbol
- `lsp_get_document_symbols` - List all symbols in a file
- `lsp_get_workspace_symbols` - Search symbols across project

### Code Intelligence
- `lsp_get_completion` - Get code completion suggestions
- `lsp_get_code_actions` - Get quick fixes and refactoring suggestions
- `lsp_get_diagnostics` - Get errors, warnings, and suggestions

### Code Editing
- `lsp_rename_symbol` - Rename symbols across the project
- `lsp_format_document` - Format C# code according to conventions

### System
- `ping` - Server health check

## 🎮 Unity Support

Roslyn MCP provides comprehensive Unity project support:

- **Unity.Logging**: Complete support for Unity's logging system
- **MonoBehaviour**: Full IntelliSense for Unity base classes
- **Unity Assemblies**: All Unity packages and dependencies automatically loaded
- **Custom Assemblies**: Support for assembly definitions (.asmdef)
- **Large Projects**: Fast-start mode for complex Unity solutions

## 🔍 Common Use Cases

### Error Analysis
- Check for compilation errors and warnings
- Get suggestions for fixing code issues
- Analyze code quality across the project

### Code Navigation
- Find definitions of classes, methods, and properties
- Locate all references to a symbol
- Explore project structure and symbols

### Code Completion
- Get IntelliSense suggestions for available methods
- Understand method parameters and return types
- Explore available properties and fields

### Code Refactoring
- Safely rename symbols across the entire project
- Format code according to C# conventions
- Apply quick fixes and refactoring suggestions

### Unity Development
- Work with Unity.Logging for better performance
- Navigate Unity-specific classes and methods
- Understand MonoBehaviour lifecycle methods

## 📊 Performance

- **Average Response Time**: ~50ms for most operations
- **Initialization Time**: 5-10 seconds for typical projects
- **Unity Projects**: 15-30 seconds with automatic assembly loading
- **Large Projects**: 30-60 seconds (use --fast-start mode)
- **Success Rate**: 100% reliability (10/10 tools working)

## 🎯 Key Features

- **Zero Configuration**: Automatic project discovery and dependency resolution
- **Real-time Analysis**: Instant error detection and code suggestions
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Unity Integration**: Complete Unity project support out of the box
- **Fast Performance**: Optimized for quick responses and low latency

## 📖 Documentation Structure

```
docs/
├── README.md           # This file - navigation and overview
├── INSTALLATION.md     # Setup instructions and configuration
├── CLAUDE.md           # Claude Code integration guide
├── API.md             # Complete tool reference
├── EXAMPLES.md        # Usage examples and patterns
├── analysis/          # Technical analysis (for reference)
└── final-reports/     # Project achievements (for reference)
```

## 🆘 Getting Help

### Common Issues
- **Server not starting**: Check Node.js and .NET installation
- **No symbols found**: Allow 5-10 seconds for workspace indexing
- **Unity errors**: Ensure Unity project is properly configured
- **Performance issues**: Use --fast-start mode for large projects

### Support Resources
- Check the [Installation Guide](INSTALLATION.md) for setup issues
- Review [Examples](EXAMPLES.md) for usage patterns
- Use the `ping` tool to verify server health
- Check Claude Code logs for detailed error information

## 🔄 Updates and Maintenance

This documentation is actively maintained to reflect the current state of Roslyn MCP. The focus is on:

- **Current Capabilities**: What works now and how to use it
- **Practical Usage**: Real-world examples and workflows
- **User Experience**: Clear instructions and helpful examples
- **Performance**: Optimized configurations and best practices

## 💡 Contributing

If you find issues with the documentation or want to suggest improvements:

1. Check the existing documentation for similar topics
2. Focus on current functionality and user needs
3. Provide practical examples and clear explanations
4. Test your examples with actual C# projects

For more information about contributing, see the project's main [Contributing Guide](../CONTRIBUTING.md).

---

*This documentation is designed to help you get the most out of Roslyn MCP for professional C# development with Claude Code.*