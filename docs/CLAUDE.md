# Claude Code Integration Guide

This guide shows how to set up C# IntelliSense in Claude Code using Roslyn MCP.

## Quick Setup

Add Roslyn MCP to your Claude Code configuration:

```bash
claude mcp add roslyn-lsp -- node /path/to/roslyn-mcp/dist/cli.js /path/to/your/csharp/project
```

Or manually edit your `.mcp.json` file:

```json
{
  "mcpServers": {
    "roslyn-lsp": {
      "command": "node",
      "args": ["/path/to/roslyn-mcp/dist/cli.js", "/path/to/your/csharp/project"]
    }
  }
}
```

## What You Can Do

Once configured, chat naturally with Claude Code about your C# projects:

### Code Analysis
```
"Check this file for errors"
"What warnings do I have in Program.cs?"
"Are there any issues with my code?"
```

### Code Navigation
```
"Show me all methods in this class"
"Find where Calculator is used"
"Go to the definition of AddNumbers"
"What classes are in my project?"
```

### Code Editing
```
"Rename this variable to 'totalAmount'"
"Format this C# file"
"Fix the indentation in my code"
```

### Code Completion
```
"What methods are available on this object?"
"Show me all Console methods"
"What can I call on this string?"
```

### Unity Development
```
"Check this MonoBehaviour script"
"Find all Debug.Log usage"
"What Unity classes are available?"
"Help me fix this Unity script error"
```

## Project Types

Works with any C# project structure:

- **Console Apps**: Point to folder with `.csproj`
- **Web APIs**: Point to solution root with `.sln`
- **Unity Projects**: Point to Unity project root (same level as Assets folder)
- **Class Libraries**: Any folder with C# files and project file

## Troubleshooting

### Common Issues

**"No C# features available"**
- Restart Claude Code after configuration
- Check that your project path is correct
- Verify Node.js and .NET are installed

**"Server not responding"**
- Make sure the path to `cli.js` is correct
- Test with: `node /path/to/cli.js --help`
- Check Claude Code logs for errors

**"Unity project not working"**
- Ensure your Unity project has a `.sln` file
- Open Unity Editor once to generate solution files
- Point to the Unity project root (where Assets/ folder is)

**"Symbols not found"**
- Large projects may take 1-2 minutes to initialize
- Check that you're pointing to the project root, not a subfolder
- For Unity: make sure you have Library/ folder (project was opened in Unity)

### Testing Your Setup

1. Check CLI works:
```bash
node /path/to/roslyn-mcp/dist/cli.js --help
```

2. Test with Claude Code:
```
"Is the C# server running?"
```

3. Try a simple request:
```
"Check my Program.cs for any errors"
```

## Advanced Configuration

### Custom Timeout (for large projects)
```json
{
  "mcpServers": {
    "roslyn-lsp": {
      "command": "node",
      "args": [
        "/path/to/roslyn-mcp/dist/cli.js",
        "--timeout", "180000",
        "/path/to/your/project"
      ]
    }
  }
}
```

### Multiple Projects
You can configure multiple C# projects:

```json
{
  "mcpServers": {
    "roslyn-lsp-main": {
      "command": "node",
      "args": ["/path/to/roslyn-mcp/dist/cli.js", "/path/to/main/project"]
    },
    "roslyn-lsp-unity": {
      "command": "node",
      "args": ["/path/to/roslyn-mcp/dist/cli.js", "/path/to/unity/project"]
    }
  }
}
```

## Performance Notes

- **Small projects**: Ready in 5-10 seconds
- **Unity projects**: May take 1-3 minutes for full initialization
- **Large solutions**: Background loading continues while basic features work
- **Subsequent uses**: Faster startup due to caching

## Getting Help

- [Installation Guide](INSTALLATION.md) - Complete setup instructions
- [Examples](EXAMPLES.md) - More usage examples
- [API Reference](API.md) - Technical details for advanced users

For issues, check the [GitHub repository](https://github.com/Saqoosha/roslyn-mcp) or create an issue.