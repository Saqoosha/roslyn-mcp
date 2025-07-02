#!/usr/bin/env node
/**
 * COMPREHENSIVE TEST: Workspace Solution Detection and Indexing
 * Tests if adding .sln file fixes workspace symbol search
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🔬 COMPREHENSIVE WORKSPACE SOLUTION DETECTION TEST\n');
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
    clientInfo: { name: 'solution-detection-test', version: '1.0.0' }
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
          console.log('⏳ Waiting 15 seconds for solution loading and indexing...');
          setTimeout(runStep, 15000);
          
        } else if (response.id >= 10) {
          console.log(`\n📥 RESPONSE for Step ${step}:`);
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
      console.log('\n🔍 STEP 1: Test workspace symbols after solution loading');
      testWorkspaceSymbol('Calculator', 10);
      break;
      
    case 2:
      console.log('\n🔍 STEP 2: Test with empty query (should show all symbols)');
      testWorkspaceSymbol('', 20);
      break;
      
    case 3:
      console.log('\n🔍 STEP 3: Test multiple specific searches');
      testWorkspaceSymbol('Program', 30);
      break;
      
    case 4:
      testWorkspaceSymbol('Main', 40);
      break;
      
    case 5:
      testWorkspaceSymbol('Add', 50);
      break;
      
    case 6:
      testWorkspaceSymbol('MathHelper', 60);
      break;
      
    case 7:
      console.log('\n🔍 STEP 7: Test document symbols for comparison');
      testDocumentSymbols(70);
      break;
      
    case 8:
      console.log('\n🏁 COMPREHENSIVE SOLUTION DETECTION TEST COMPLETE');
      console.log('\n📊 ANALYSIS:');
      console.log('• If workspace symbols now work after adding .sln file:');
      console.log('  → Solution file was the missing piece');
      console.log('• If still empty:');
      console.log('  → There may be additional MSBuild or indexing issues');
      console.log('• Compare with document symbols (should always work)');
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
      arguments: { query: query, maxResults: 50 }
    }
  };
  
  console.log(`📤 Workspace search: "${query}"`);
  server.stdin.write(JSON.stringify(request) + '\n');
}

function testDocumentSymbols(id) {
  const request = {
    jsonrpc: '2.0',
    id: id,
    method: 'tools/call',
    params: {
      name: 'documentSymbols',
      arguments: { filePath: 'Program.cs' }
    }
  };
  
  console.log('📤 Document symbols for comparison');
  server.stdin.write(JSON.stringify(request) + '\n');
}

server.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  console.log('🔴 LSP STDERR:', msg);
});

// Extended timeout for solution loading
setTimeout(() => {
  console.error('\n❌ Solution detection test timeout');
  server.kill();
  process.exit(1);
}, 45000);

process.on('SIGINT', () => {
  console.log('\n🛑 Solution detection test interrupted');
  server.kill();
  process.exit(0);
});