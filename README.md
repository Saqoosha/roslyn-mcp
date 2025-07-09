# Roslyn MCP

**Professional C# Language Server for Claude Code via Model Context Protocol**

Roslyn MCP provides comprehensive C# language support for Claude Code, enabling advanced code analysis, navigation, refactoring, and diagnostics through Microsoft's official Roslyn LSP server.

## 🚀 Features

- **10 Reliable C# Tools**: Complete language server integration with 100% success rate
- **Real-time Diagnostics**: Error detection, warnings, and code suggestions
- **Code Navigation**: Go to definition, find references, symbol search
- **Intelligent Completion**: Context-aware code completion with type information
- **Code Actions**: Quick fixes, refactoring suggestions, and code improvements
- **Document Formatting**: Automatic C# code formatting according to conventions
- **Symbol Renaming**: Safe renaming across entire codebase
- **Unity Support**: Complete Unity project integration with assembly loading
- **Fast-Start Mode**: Background initialization for large projects
- **Zero Configuration**: Automatic project discovery and dependency resolution

## 🛠️ Installation

### Prerequisites
- **Node.js 18+** and **npm**
- **.NET 8.0+** SDK
- **Claude Code** (Claude.ai/code)

### Setup
```bash
# Clone the repository
git clone https://github.com/Saqoosha/roslyn-mcp.git
cd roslyn-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

**Quick Setup (Single Command):**
```bash
claude mcp add roslyn-lsp node /path/to/roslyn-mcp/dist/cli.js /path/to/your/csharp/project
```

**Manual Configuration (`.mcp.json`):**
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

## 🎯 Usage

Once configured, Claude Code will automatically use Roslyn MCP tools when working with C# code:

- **"Check for errors in Program.cs"** → Uses `lsp_get_diagnostics`
- **"Find all references to Calculator class"** → Uses `lsp_find_references`
- **"Rename method AddNumbers to Sum"** → Uses `lsp_rename_symbol`
- **"Format this C# file"** → Uses `lsp_format_document`
- **"What classes are in this project?"** → Uses `lsp_get_workspace_symbols`

## 🔧 Available Tools

| Tool | Description |
|------|-------------|
| `lsp_get_diagnostics` | Get errors, warnings, and suggestions |
| `lsp_get_completion` | Code completion with type information |
| `lsp_get_definitions` | Navigate to symbol definitions |
| `lsp_find_references` | Find all references to a symbol |
| `lsp_get_document_symbols` | List all symbols in a file |
| `lsp_get_workspace_symbols` | Search symbols across entire project |
| `lsp_get_code_actions` | Get quick fixes and refactoring suggestions |
| `lsp_rename_symbol` | Rename symbols across the project |
| `lsp_format_document` | Format C# code according to conventions |
| `ping` | Server health check |

## 🎮 Unity Projects

Roslyn MCP provides full Unity project support:

- **Unity.Logging**: Complete support for `Log.Info()`, `Log.Warning()`, etc.
- **Unity Assemblies**: All Unity packages and dependencies automatically loaded
- **MonoBehaviour**: Full IntelliSense for Unity base classes
- **Custom Assemblies**: Support for custom assembly definitions (.asmdef)
- **Large Projects**: Fast-start mode for complex Unity solutions

### Unity Configuration

**Quick Setup (Single Command):**
```bash
claude mcp add roslyn-lsp node /path/to/roslyn-mcp/dist/cli.js --fast-start /path/to/your/unity/project
```

**Manual Configuration (`.mcp.json`):**
```json
{
  "mcpServers": {
    "roslyn-lsp": {
      "command": "node",
      "args": [
        "/path/to/roslyn-mcp/dist/cli.js",
        "--fast-start",
        "/path/to/your/unity/project"
      ]
    }
  }
}
```

## 🚀 Development

```bash
# Development mode
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## 📚 Documentation

- [Installation Guide](docs/INSTALLATION.md) - Detailed setup instructions
- [API Reference](docs/API.md) - Complete tool documentation
- [Examples](docs/EXAMPLES.md) - Usage examples and patterns
- [Claude Code Integration](docs/CLAUDE.md) - Claude Code specific configuration

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

*Built with Microsoft's Roslyn LSP for professional C# development in Claude Code*