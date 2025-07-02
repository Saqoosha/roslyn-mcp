#!/usr/bin/env node
/**
 * DETAILED TEST: Workspace Symbols with Full Response Logging
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🔍 DETAILED WORKSPACE SYMBOLS TEST\n');

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
    clientInfo: { name: 'detailed-test', version: '1.0.0' }
  }
};

console.log('📤 Initializing server...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

let buffer = '';
let step = 0;

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
          setTimeout(runStep, 3000);
          
        } else {
          // Show detailed response
          console.log(`\n📥 DETAILED RESPONSE for ID ${response.id}:`);
          if (response.result && response.result.content) {
            response.result.content.forEach(content => {
              console.log(content.text);
            });
          } else if (response.error) {
            console.log('❌ Error:', response.error);
          }
          console.log('─'.repeat(80));
          
          setTimeout(runStep, 2000);
        }
        
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }
});

function runStep() {
  step++;
  
  switch(step) {
    case 1:
      console.log('\n🚀 STEP 1: Workspace search BEFORE opening documents');
      testWorkspaceSymbol('Calculator', 10);
      break;
      
    case 2:
      console.log('\n🚀 STEP 2: Open a document via hover');
      openDocument();
      break;
      
    case 3:
      console.log('\n🚀 STEP 3: Workspace search AFTER opening document');
      testWorkspaceSymbol('Calculator', 30);
      break;
      
    case 4:
      console.log('\n🚀 STEP 4: Try different searches');
      testWorkspaceSymbol('Program', 40);
      break;
      
    case 5:
      console.log('\n🚀 STEP 5: Empty query test');
      testWorkspaceSymbol('', 50);
      break;
      
    case 6:
      console.log('\n🏁 DETAILED TEST COMPLETE');
      server.kill();
      process.exit(0);
      break;
  }
}

function testWorkspaceSymbol(query, id) {
  const request = {
    jsonrpc: '2.0',
    id: id,
    method: 'tools/call',
    params: {
      name: 'workspaceSymbols',
      arguments: { query: query, maxResults: 20 }
    }
  };
  
  console.log(`📤 Workspace search for: "${query}"`);
  server.stdin.write(JSON.stringify(request) + '\n');
}

function openDocument() {
  const request = {
    jsonrpc: '2.0',
    id: 20,
    method: 'tools/call',
    params: {
      name: 'hover',
      arguments: { filePath: 'Program.cs', line: 30, character: 18 } // On Calculator class
    }
  };
  
  console.log('📂 Opening Program.cs via hover on Calculator class');
  server.stdin.write(JSON.stringify(request) + '\n');
}

server.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  if (msg.includes('ERROR')) {
    console.error('🔴 ERROR:', msg);
  }
});

// Timeout
setTimeout(() => {
  console.error('\n❌ Detailed test timeout');
  server.kill();
  process.exit(1);
}, 30000);

process.on('SIGINT', () => {
  console.log('\n🛑 Detailed test interrupted');
  server.kill();
  process.exit(0);
});