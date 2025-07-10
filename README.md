# Roslyn MCP

**C# IntelliSense for Claude Code**

Get professional C# development tools in Claude Code - error checking, code completion, navigation, and refactoring for any C# project.

## ✨ What You Get

- **Error Detection**: Real-time syntax and logic error checking
- **Code Completion**: Smart IntelliSense with type information
- **Code Navigation**: Jump to definitions, find references
- **Refactoring**: Safe renaming across your entire project
- **Code Formatting**: Automatic C# formatting
- **Unity Support**: Full Unity project integration with MonoBehaviour, Unity.Logging, and custom assemblies

## 🚀 Quick Setup

### Prerequisites
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **.NET 8.0+** - [Download here](https://dotnet.microsoft.com/download)
- **Claude Code** - [Get it here](https://claude.ai/code)

### Installation

```bash
# 1. Clone and build
git clone https://github.com/Saqoosha/roslyn-mcp.git
cd roslyn-mcp
npm install
npm run build

# 2. Add to Claude Code (replace paths with your actual paths)
claude mcp add roslyn-lsp -- node /path/to/roslyn-mcp/dist/cli.js /path/to/your/csharp/project
```

That's it! Claude Code will now have C# superpowers.

## 💬 How to Use

Just chat with Claude Code naturally about your C# code:

```
"Check my Program.cs for errors"
"Find all places where Calculator is used"
"Rename the method AddNumbers to Sum"
"Format this C# file"
"What classes are in my project?"
"Help me fix this Unity script"
```

Claude will automatically use the right tools to help you.

## 📁 Supported Projects

Works with any C# project:
- ✅ Console applications
- ✅ Web APIs (ASP.NET Core)
- ✅ Unity projects (any version)
- ✅ Class libraries
- ✅ Solution files (.sln)
- ✅ Individual projects (.csproj)

## 🎮 Unity Features

- **MonoBehaviour**: Full IntelliSense for Unity base classes
- **Unity.Logging**: Complete support for `Log.Info()`, `Log.Warning()`, etc.
- **Custom Assemblies**: Works with assembly definitions (.asmdef)
- **Large Projects**: Handles complex Unity solutions automatically

## 🔧 Troubleshooting

**"Server not starting"**: Check Node.js and .NET installation
**"No symbols found"**: Make sure you're pointing to your project root directory
**"Unity errors"**: Ensure your Unity project has a .sln file (open once in Unity Editor)

Run this to test your setup:
```bash
node /path/to/roslyn-mcp/dist/cli.js --help
```

## 📚 Documentation

- [Detailed Installation](docs/INSTALLATION.md)
- [Advanced Configuration](docs/CLAUDE.md)
- [Usage Examples](docs/EXAMPLES.md)

## 🤝 Contributing

Contributions welcome! See [Contributing Guide](CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

*Professional C# development in Claude Code, powered by Microsoft's Roslyn*