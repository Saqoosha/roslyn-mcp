#!/usr/bin/env node
/**
 * Test new LSP tools: definitions, references, documentSymbols
 */

import { spawn } from 'child_process';
import { resolve, relative, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🧪 Testing new LSP tools\n');
console.log('📁 Project:', resolve(projectPath));
console.log('🔧 MCP Server:', mcpPath);
console.log('');

const server = spawn('node', [mcpPath, projectPath], {
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

console.log('📤 Initializing...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

// Handle responses
let buffer = '';
let initialized = false;
let currentTest = 1;

const tests = [
  {
    name: 'documentSymbols',
    tool: 'documentSymbols',
    args: { filePath: 'Program.cs' },
    description: 'Get file symbols'
  },
  {
    name: 'definitions (Calculator)',
    tool: 'definitions', 
    args: { filePath: 'Program.cs', line: 14, character: 26 },
    description: 'Find Calculator definition'
  },
  {
    name: 'references (Calculator)',
    tool: 'references',
    args: { filePath: 'Program.cs', line: 14, character: 26, includeDeclaration: true },
    description: 'Find Calculator references'
  }
];

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim() && line.startsWith('{')) {
      try {
        const response = JSON.parse(line);
        
        if (response.id === 1) {
          console.log('✅ Server initialized');
          
          // List tools
          const toolsRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
          };
          
          console.log('📤 Listing tools...');
          server.stdin.write(JSON.stringify(toolsRequest) + '\n');
          
        } else if (response.id === 2) {
          const tools = response.result.tools.map(t => t.name);
          console.log('📦 Available tools:', tools.join(', '));
          console.log('');
          
          // Start testing tools after a delay
          setTimeout(() => {
            runNextTest();
          }, 2000);
          
        } else if (response.id >= 10) {
          const testIndex = response.id - 10;
          const test = tests[testIndex];
          
          console.log(`\n📥 ${test.description} response:`);
          
          if (response.result && response.result.content) {
            response.result.content.forEach(content => {
              console.log('\n' + content.text);
            });
          } else if (response.error) {
            console.log('❌ Error:', response.error);
          }
          
          // Run next test
          setTimeout(() => {
            runNextTest();
          }, 1000);
        }
        
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }
});

function runNextTest() {
  if (currentTest > tests.length) {
    console.log('\n✅ All tests complete!');
    server.kill();
    process.exit(0);
    return;
  }
  
  const test = tests[currentTest - 1];
  const request = {
    jsonrpc: '2.0',
    id: 10 + currentTest - 1,
    method: 'tools/call',
    params: {
      name: test.tool,
      arguments: test.args
    }
  };
  
  console.log(`📤 Testing ${test.name}...`);
  server.stdin.write(JSON.stringify(request) + '\n');
  currentTest++;
}

server.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('ERROR') || msg.includes('WARN')) {
    console.error('🔴 Server:', msg.trim());
  }
});

// Timeout
setTimeout(() => {
  if (!initialized) {
    console.error('\n❌ Server initialization timeout');
  } else {
    console.error('\n❌ Test timeout');
  }
  server.kill();
  process.exit(1);
}, 30000);

// Handle exit
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  server.kill();
  process.exit(0);
});