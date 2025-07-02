#!/usr/bin/env node
/**
 * Test completion tool - IntelliSense functionality
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🧪 Testing Code Completion (IntelliSense)\n');
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

// Test cases for completion
const tests = [
  {
    name: 'Console.* completion',
    args: { filePath: 'Program.cs', line: 12, character: 12 }, // After "Console"
    description: 'Complete Console class members'
  },
  {
    name: 'calculator.* completion', 
    args: { filePath: 'Program.cs', line: 15, character: 35 }, // After "calculator."
    description: 'Complete Calculator instance members'
  },
  {
    name: 'System.* completion',
    args: { filePath: 'Program.cs', line: 0, character: 7 }, // After "using S"
    description: 'Complete System namespace'
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
          
          if (tools.includes('completion')) {
            console.log('✅ Completion tool found!\n');
            setTimeout(runNextTest, 2000);
          } else {
            console.log('❌ Completion tool not found');
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
    console.log('\n✅ All completion tests complete!');
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
      name: 'completion',
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