#!/usr/bin/env node
/**
 * Test roslyn-mcp with an actual C# project
 * Usage: node test-with-project.js /path/to/csharp/project [file.cs] [line] [character]
 */

import { spawn } from 'child_process';
import { resolve, relative, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || '.';
const testFile = process.argv[3] || 'Program.cs';
const testLine = process.argv[4] ? parseInt(process.argv[4], 10) : 0;
const testCharacter = process.argv[5] ? parseInt(process.argv[5], 10) : 0;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🧪 Testing roslyn-mcp with real project\n');
console.log('📁 Project:', resolve(projectPath));
console.log('📄 File:', testFile);
console.log('📍 Position:', `${testLine}:${testCharacter}`);
console.log('🔧 MCP Server:', mcpPath);
console.log('');

// Verify project exists
if (!existsSync(projectPath)) {
  console.error('❌ Project path does not exist:', projectPath);
  process.exit(1);
}

// Verify file exists
const filePath = resolve(projectPath, testFile);
if (!existsSync(filePath)) {
  console.error('❌ File does not exist:', filePath);
  console.log('\n💡 Available C# files:');
  
  // List C# files
  const { execSync } = await import('child_process');
  try {
    const files = execSync(`find "${projectPath}" -name "*.cs" -type f | head -20`, { encoding: 'utf8' });
    console.log(files);
  } catch (e) {}
  
  process.exit(1);
}

// Start MCP server
console.log('🚀 Starting MCP server...\n');

const server = spawn('node', [mcpPath, projectPath, '--log-level', 'info'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PROJECT_ROOT: resolve(projectPath)
  }
});

// Initialize
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }
};

console.log('📤 Sending initialize request...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

// Handle responses
let buffer = '';
let initialized = false;

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim() && line.startsWith('{')) {
      try {
        const response = JSON.parse(line);
        
        if (response.id === 1) {
          console.log('✅ Server initialized\n');
          initialized = true;
          
          // List tools
          const toolsRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
          };
          
          console.log('📤 Listing available tools...');
          server.stdin.write(JSON.stringify(toolsRequest) + '\n');
          
        } else if (response.id === 2) {
          console.log('📦 Available tools:', response.result.tools.map(t => t.name).join(', '));
          console.log('');
          
          // Test hover after a delay for LSP to initialize
          setTimeout(() => {
            const relativeFile = relative(projectPath, filePath);
            const hoverRequest = {
              jsonrpc: '2.0',
              id: 3,
              method: 'tools/call',
              params: {
                name: 'hover',
                arguments: {
                  filePath: relativeFile,
                  line: testLine,
                  character: testCharacter
                }
              }
            };
            
            console.log(`📤 Testing hover on ${relativeFile}:${testLine}:${testCharacter}...`);
            server.stdin.write(JSON.stringify(hoverRequest) + '\n');
          }, 3000);
          
        } else if (response.id === 3) {
          console.log('\n📥 Hover response:');
          
          if (response.result && response.result.content) {
            response.result.content.forEach(content => {
              console.log('\n' + content.text);
            });
          } else if (response.error) {
            console.log('❌ Error:', response.error);
          }
          
          // Test complete
          setTimeout(() => {
            console.log('\n✅ Test complete!');
            server.kill();
            process.exit(0);
          }, 500);
        }
        
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }
});

// Handle server logs
server.stderr.on('data', (data) => {
  const msg = data.toString();
  // Only show errors and warnings
  if (msg.includes('ERROR') || msg.includes('WARN')) {
    console.error('🔴 Server:', msg.trim());
  }
});

// Handle errors
server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Timeout
setTimeout(() => {
  if (!initialized) {
    console.error('\n❌ Server initialization timeout');
  } else {
    console.error('\n❌ Test timeout - LSP may be slow to respond');
    console.log('\n💡 Tips:');
    console.log('- Ensure the C# project builds successfully');
    console.log('- Try with a simpler file or position');
    console.log('- Check server logs with --log-level debug');
  }
  server.kill();
  process.exit(1);
}, 15000);

// Handle exit
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  server.kill();
  process.exit(0);
});