# Installation Guide

Complete setup instructions for getting C# IntelliSense working in Claude Code.

## Prerequisites

Before installing, make sure you have:

- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **.NET 8.0+ SDK** - [Download .NET](https://dotnet.microsoft.com/download)
- **Claude Code** - [Get Claude Code](https://claude.ai/code)

### Verify Prerequisites

```bash
# Check Node.js version
node --version
# Should show v18.0.0 or higher

# Check .NET version
dotnet --version
# Should show 8.0.0 or higher
```

## Installation Steps

### Step 1: Get Roslyn MCP

```bash
# Clone the repository
git clone https://github.com/Saqoosha/roslyn-mcp.git
cd roslyn-mcp

# Install dependencies and build
npm install
npm run build
```

### Step 2: Test Installation

```bash
# Test the CLI works
node dist/cli.js --help

# You should see the help message with available options
```

### Step 3: Add to Claude Code

Use the simple one-command setup:

```bash
# Replace paths with your actual paths
claude mcp add roslyn-lsp -- node /absolute/path/to/roslyn-mcp/dist/cli.js /absolute/path/to/your/csharp/project
```

**Important**: Use absolute paths (full paths starting with `/` on Mac/Linux or `C:\` on Windows).

### Step 4: Restart Claude Code

After adding the MCP server, restart Claude Code to load the new configuration.

### Step 5: Test It Works

In Claude Code, try asking:
```
"Is the C# server running?"
```

You should get a response showing the server is healthy.

## Example Setups

### Console Application
```bash
# If your project structure is:
# /Users/yourname/MyApp/
#   ├── Program.cs
#   └── MyApp.csproj

claude mcp add roslyn-lsp -- node /Users/yourname/roslyn-mcp/dist/cli.js /Users/yourname/MyApp
```

### Unity Project
```bash
# If your Unity project structure is:
# /Users/yourname/MyGame/
#   ├── Assets/
#   ├── Library/
#   └── MyGame.sln

claude mcp add roslyn-lsp -- node /Users/yourname/roslyn-mcp/dist/cli.js /Users/yourname/MyGame
```

### ASP.NET Core Web API
```bash
# If your solution structure is:
# /Users/yourname/MyWebAPI/
#   ├── MyWebAPI.sln
#   ├── src/
#   └── tests/

claude mcp add roslyn-lsp -- node /Users/yourname/roslyn-mcp/dist/cli.js /Users/yourname/MyWebAPI
```

## Troubleshooting Installation

### "Command not found: claude"
Make sure Claude Code is installed and the `claude` command is available in your terminal.

### "npm install fails"
- Check your Node.js version: `node --version`
- Try deleting `node_modules` and running `npm install` again
- On Windows, you might need to run as Administrator

### "dotnet --version fails"
- Install .NET SDK from [dotnet.microsoft.com](https://dotnet.microsoft.com/download)
- Restart your terminal after installation
- On Mac, you might need to add to your PATH

### "node dist/cli.js --help shows error"
- Make sure you ran `npm run build` successfully
- Check that the `dist/` folder was created
- Try rebuilding: `npm run clean && npm run build`

### "MCP server not showing up in Claude Code"
- Check your `.mcp.json` syntax is valid
- Restart Claude Code completely
- Verify the file paths in your configuration are correct and absolute

### "C# features not working"
- Make sure your project has a `.csproj` or `.sln` file
- For Unity: open the project in Unity Editor once to generate solution files
- Large projects may take 1-2 minutes to initialize
- Try asking: "Is the C# server running?" to check status

## Manual Configuration

If you prefer to edit your `.mcp.json` file manually:

```json
{
  "mcpServers": {
    "roslyn-lsp": {
      "command": "node",
      "args": ["/absolute/path/to/roslyn-mcp/dist/cli.js", "/absolute/path/to/your/project"]
    }
  }
}
```

The `.mcp.json` file is typically located at:
- **Mac/Linux**: `~/.claude/mcp.json`
- **Windows**: `%USERPROFILE%\.claude\mcp.json`

## Updating

To update to the latest version:

```bash
cd roslyn-mcp
git pull
npm install
npm run build
```

No need to reconfigure Claude Code - just restart it to pick up the new version.

## Uninstalling

To remove Roslyn MCP from Claude Code:

```bash
claude mcp remove roslyn-lsp
```

Or manually edit your `.mcp.json` file to remove the `roslyn-lsp` entry.

## Getting Help

If you run into issues:

1. Check the [troubleshooting section](#troubleshooting-installation) above
2. Review the [Claude Code Integration Guide](CLAUDE.md)
3. Create an issue on [GitHub](https://github.com/Saqoosha/roslyn-mcp)

Include this information when reporting issues:
- Your operating system
- Node.js version (`node --version`)
- .NET version (`dotnet --version`)
- The exact error message
- Your project type (Unity, console app, etc.)