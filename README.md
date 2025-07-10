# Roslyn MCP

**C# IntelliSense for Claude Code**

Get professional C# development tools in Claude Code - error checking, code completion, navigation, and refactoring for any C# project.

## ✨ What You Get

- **Error Detection**: Real-time syntax and logic error checking
- **Code Completion**: Smart IntelliSense with type information
- **Code Navigation**: Jump to definitions, find references
- **Refactoring**: Safe renaming across your entire project
- **Code Formatting**: Automatic C# formatting
- **Unity Support**: Full Unity project integration with MonoBehaviour and custom assemblies

## 📊 Feature Comparison

How Roslyn MCP compares to other C# development tools:

| Feature | Description | Roslyn LSP | VS Code C# Extension | Roslyn MCP | Notes |
|---------|-------------|------------|---------------------|------------|-------|
| **Core Language Features** |
| **Error Detection** | Syntax and semantic errors | ✅ | ✅ | ✅ | Real-time diagnostics |
| **Code Completion** | IntelliSense with type info | ✅ | ✅ | ✅ | Context-aware suggestions |
| **Go to Definition** | Navigate to symbol definitions | ✅ | ✅ | ✅ | Cross-file navigation |
| **Find References** | Find all symbol usages | ✅ | ✅ | ✅ | Project-wide search |
| **Document Symbols** | List symbols in current file | ✅ | ✅ | ✅ | Classes, methods, properties |
| **Workspace Symbols** | Search symbols across project | ✅ | ✅ | ✅ | Global symbol search |
| **Code Actions** | Quick fixes and refactoring | ✅ | ✅ | ✅ | Smart suggestions |
| **Symbol Rename** | Safe rename across project | ✅ | ✅ | ✅ | Update all references |
| **Code Formatting** | Auto-format according to style | ✅ | ✅ | ✅ | C# conventions |
| **Advanced Features** |
| **Signature Help** | Parameter hints while typing | ✅ | ✅ | ❌ | Removed for Unity compatibility |
| **Hover Information** | Type info on mouse hover | ✅ | ✅ | ❌ | Not needed in chat interface |
| **Document Highlight** | Symbol highlighting | ✅ | ✅ | ❌ | Chat interface doesn't need |
| **Go to Implementation** | Navigate to implementations | ✅ | ✅ | ⚠️ | Via definitions workaround |
| **Go to Declaration** | Navigate to declarations | ✅ | ✅ | ⚠️ | Via definitions workaround |
| **Call Hierarchy** | Method call relationships | ✅ | ✅ | ⚠️ | Via references workaround |
| **Inheritance Hierarchy** | Class inheritance tree | ✅ | ✅ | ⚠️ | Via manual navigation |
| **Semantic Tokens** | Advanced syntax highlighting | ✅ | ✅ | ❌ | Not applicable to chat |
| **Code Folding** | Collapse code sections | ✅ | ✅ | ❌ | Not applicable to chat |
| **Refactoring & Code Gen** |
| **Extract Method** | Extract code into method | ✅ | ✅ | ⚠️ | Via code actions |
| **Extract Interface** | Extract interface from class | ✅ | ✅ | ⚠️ | Via code actions |
| **Move Type** | Move type to new file | ✅ | ✅ | ⚠️ | Via code actions |
| **Generate Code** | Auto-generate boilerplate | ✅ | ✅ | ⚠️ | Via code actions |
| **Override Completion** | Generate override methods | ✅ | ✅ | ⚠️ | Via completion |
| **Project System** |
| **Solution Support** | Multi-project solutions | ✅ | ✅ | ✅ | Full solution loading |
| **NuGet Integration** | Package dependencies | ✅ | ✅ | ✅ | Automatic resolution |
| **MSBuild Integration** | Build system support | ✅ | ✅ | ✅ | Project file parsing |
| **Assembly Loading** | Runtime assembly discovery | ✅ | ✅ | ✅ | Automatic assembly loading |
| **Unity Integration** |
| **MonoBehaviour Support** | Unity base class IntelliSense | ⚠️ | ✅ | ✅ | Full Unity project support |
| **Unity Packages** | Unity package system | ⚠️ | ✅ | ✅ | All Unity packages loaded |
| **Unity Assemblies** | Unity package assemblies | ⚠️ | ✅ | ✅ | All Unity packages loaded |
| **Custom Assemblies** | Assembly definition support | ⚠️ | ✅ | ✅ | .asmdef file support |
| **Unity Messages** | Unity callback recognition | ⚠️ | ✅ | ✅ | Start, Update, OnCollision, etc. |
| **Unique Features** |
| **Natural Language** | Chat-based interaction | ❌ | ❌ | ✅ | **Unique to Roslyn MCP** |
| **Claude Code Integration** | Native MCP protocol | ❌ | ❌ | ✅ | **Unique to Roslyn MCP** |
| **Conversational Debugging** | Error explanations via chat | ❌ | ❌ | ✅ | **Unique to Roslyn MCP** |
| **Context-Aware Help** | Smart suggestions in chat | ❌ | ❌ | ✅ | **Unique to Roslyn MCP** |

**Legend**: ✅ Full Support | ⚡ Enhanced | ⚠️ Limited | ❌ Not Available

### 🎯 Roslyn MCP Advantages

- **Natural Language Interface**: Just ask "check my code for errors" instead of learning hotkeys
- **Chat-Driven Development**: Get explanations and suggestions in conversational format  
- **Claude Code Integration**: Native support for Claude's conversational AI interface
- **Unity-Optimized**: Specifically tested and optimized for complex Unity projects
- **Zero UI Complexity**: No need to learn IDE shortcuts or menu systems

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
- **Unity Packages**: Complete support for all Unity packages and APIs
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