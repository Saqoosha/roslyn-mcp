#!/usr/bin/env node
/**
 * Test formatting tool - Code beautification
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🧪 Testing Document Formatting Tool\n');
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

// Test cases for formatting
const tests = [
  {
    name: 'Default formatting',
    args: { filePath: 'Program.cs' },
    description: 'Format with default settings'
  },
  {
    name: 'Custom tab settings',
    args: { 
      filePath: 'Program.cs', 
      tabSize: 2, 
      insertSpaces: true,
      trimTrailingWhitespace: true,
      insertFinalNewline: true
    },
    description: 'Format with 2-space tabs'
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
          
          if (tools.includes('formatting')) {
            console.log('✅ Formatting tool found!\n');
            setTimeout(runNextTest, 2000);
          } else {
            console.log('❌ Formatting tool not found');
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
    console.log('\n✅ All formatting tests complete!');
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
      name: 'formatting',
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
}, 20000);

// Handle exit
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  server.kill();
  process.exit(0);
});