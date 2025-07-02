#!/usr/bin/env node
/**
 * Test diagnostics tool - Real-time error and warning detection
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🧪 Testing Diagnostics Tool\n');
console.log('📁 Project:', resolve(projectPath));
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

// Test cases for diagnostics
const tests = [
  {
    name: 'Clean file diagnostics',
    args: { filePath: 'Program.cs' },
    description: 'Check diagnostics for error-free file'
  },
  {
    name: 'Diagnostics without suggestions',
    args: { filePath: 'Program.cs', includeSuggestions: false },
    description: 'Check only errors and warnings'
  }
];

let buffer = '';
let currentTest = 0;

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
          
          // List tools first
          server.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
          }) + '\n');
          
        } else if (response.id === 2) {
          const tools = response.result.tools.map(t => t.name);
          console.log('📦 Available tools:', tools.join(', '));
          
          if (tools.includes('diagnostics')) {
            console.log('✅ Diagnostics tool found!\n');
            // Wait longer for LSP to process and analyze the document
            setTimeout(runNextTest, 3000);
          } else {
            console.log('❌ Diagnostics tool not found');
            process.exit(1);
          }
          
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
          
          setTimeout(runNextTest, 1000);
        }
        
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }
});

function runNextTest() {
  if (currentTest >= tests.length) {
    console.log('\n✅ All diagnostics tests complete!');
    server.kill();
    process.exit(0);
    return;
  }
  
  const test = tests[currentTest];
  const request = {
    jsonrpc: '2.0',
    id: 10 + currentTest,
    method: 'tools/call',
    params: {
      name: 'diagnostics',
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
  console.error('\n❌ Test timeout');
  server.kill();
  process.exit(1);
}, 25000);

// Handle exit
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  server.kill();
  process.exit(0);
});