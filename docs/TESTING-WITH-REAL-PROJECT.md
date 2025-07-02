# Testing roslyn-mcp with Real C# Projects

## 🚀 Quick Start

### 1. Download Roslyn LSP Binaries

Since `runtime/` is gitignored, you need to download the Roslyn LSP binaries first:

```bash
# Option 1: Download from NuGet
mkdir -p runtime/roslyn-lsp
cd runtime/roslyn-lsp
curl -L https://www.nuget.org/api/v2/package/Microsoft.CodeAnalysis.LanguageServer.osx-arm64/5.0.0-3.24307.3 -o roslyn-lsp.nupkg
unzip roslyn-lsp.nupkg
cd ../..

# Option 2: Copy from existing location (if you have it)
cp -r /path/to/roslyn-lsp runtime/
```

### 2. Create MCP Configuration

Create `.mcp.json` in your C# project directory:

```json
{
  "mcpServers": {
    "roslyn-mcp": {
      "command": "node",
      "args": ["/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js"],
      "env": {
        "PROJECT_ROOT": "${PWD}",
        "DOTNET_ROOT": "/opt/homebrew/share/dotnet"
      }
    }
  }
}
```

### 3. Test with Claude Code

Open Claude Code in your C# project directory:

```bash
cd /path/to/your/csharp/project
claude
```

## 🧪 Manual Testing

### Test MCP Server Directly

```bash
# In roslyn-mcp directory
npm run build

# Start server with your project
node dist/cli.js /path/to/your/csharp/project
```

### Test Individual Tools

Create a test script `test-with-project.js`:

```javascript
#!/usr/bin/env node
import { spawn } from 'child_process';
import { resolve } from 'path';

const projectPath = process.argv[2] || '.';
const mcpPath = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js';

console.log(`Testing with project: ${projectPath}\n`);

const server = spawn('node', [mcpPath, projectPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PROJECT_ROOT: resolve(projectPath)
  }
});

// Initialize
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }
}) + '\n');

// Handle responses
let buffer = '';
server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim() && line.startsWith('{')) {
      try {
        const response = JSON.parse(line);
        console.log('Response:', JSON.stringify(response, null, 2));
        
        if (response.id === 1) {
          // Test hover after initialization
          setTimeout(() => {
            server.stdin.write(JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: 'hover',
                arguments: {
                  filePath: 'Program.cs',  // Adjust to your file
                  line: 5,
                  character: 20
                }
              }
            }) + '\n');
          }, 2000);
        }
      } catch (e) {}
    }
  }
});

server.stderr.on('data', (data) => {
  console.error('Server log:', data.toString());
});

// Cleanup
setTimeout(() => {
  server.kill();
  process.exit(0);
}, 10000);
```

## 📋 Example Test Cases

### 1. Simple Console App

```csharp
// Program.cs
using System;

namespace TestApp
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello World!");
            var calculator = new Calculator();
            var result = calculator.Add(5, 3);
            Console.WriteLine($"Result: {result}");
        }
    }
    
    public class Calculator
    {
        public int Add(int a, int b) => a + b;
        public int Subtract(int a, int b) => a - b;
    }
}
```

Test hover on:
- `Calculator` class (line 10, character 32)
- `Add` method (line 11, character 24)
- `Console` class (line 9, character 12)

### 2. ASP.NET Core Project

```csharp
// Controllers/WeatherController.cs
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("[controller]")]
public class WeatherController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { Temperature = 25, Summary = "Warm" });
    }
}
```

Test hover on:
- `ControllerBase` (line 5, character 33)
- `IActionResult` (line 8, character 11)
- `HttpGet` attribute (line 7, character 5)

## 🔍 Expected Results

### Successful Hover Response

```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "🔍 **Hover Information**\n\n📍 Location: `Program.cs:10:32`\n\n```csharp\npublic class Calculator\n```\n\nA simple calculator class."
      }
    ]
  }
}
```

### Common Issues

1. **"Document is null" Error**
   - The file needs to be opened first in LSP
   - This will be fixed in Phase 2 with document synchronization

2. **"File not found" Error**
   - Check the `filePath` is relative to project root
   - Ensure the file exists in the project

3. **LSP Process Fails to Start**
   - Verify Roslyn LSP binaries are in `runtime/roslyn-lsp/`
   - Check file permissions: `chmod +x runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer`

## 🛠️ Advanced Testing

### Enable Debug Logging

```bash
node dist/cli.js --log-level debug /path/to/project
```

### Test Multiple Tools (Phase 2+)

```javascript
// After Phase 2 implementation
const tools = ['hover', 'definition', 'references', 'documentSymbols'];
for (const tool of tools) {
  // Test each tool
}
```

## 📝 Notes

- Current implementation (Phase 1) only supports hover tool
- Document management will be added in Phase 2
- Full LSP capabilities will be available in Phase 3-4