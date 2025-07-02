#!/usr/bin/env node
/**
 * TEST: Workspace Symbols with Document Synchronization
 * Hypothesis: Workspace symbols only work after documents are opened
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync } from 'fs';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🔍 WORKSPACE SYMBOLS WITH DOCUMENT SYNC TEST\n');

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
    clientInfo: { name: 'workspace-docsync-test', version: '1.0.0' }
  }
};

console.log('📤 Initializing server...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

let buffer = '';
let step = 0;

// Find all C# files in the project
const projectRoot = resolve(projectPath);
const csFiles = readdirSync(projectRoot)
  .filter(file => file.endsWith('.cs'))
  .map(file => ({ name: file, path: resolve(projectRoot, file) }));

console.log('📁 Found C# files:', csFiles.map(f => f.name).join(', '));

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
          console.log('⏳ Waiting 3 seconds then opening all documents...');
          setTimeout(runStep, 3000);
          
        } else if (response.id >= 10) {
          console.log('📥 Response received for step', step);
          setTimeout(runStep, 1500);
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
      console.log('\n🚀 STEP 1: Test workspace symbols BEFORE opening documents');
      testWorkspaceSymbols('Before opening docs');
      break;
      
    case 2:
      console.log('\n🚀 STEP 2: Opening all C# documents via hover calls');
      openAllDocuments();
      break;
      
    case 3:
      console.log('\n🚀 STEP 3: Test workspace symbols AFTER opening documents');
      testWorkspaceSymbols('After opening docs');
      break;
      
    case 4:
      console.log('\n🚀 STEP 4: Test specific searches');
      testSpecificSearches();
      break;
      
    case 5:
      console.log('\n🏁 TEST COMPLETE');
      console.log('\n📊 HYPOTHESIS VERIFICATION:');
      console.log('• If workspace symbols work after opening docs but not before,');
      console.log('• Then Roslyn LSP requires document synchronization for workspace indexing');
      server.kill();
      process.exit(0);
      break;
  }
}

function testWorkspaceSymbols(label) {
  const request = {
    jsonrpc: '2.0',
    id: 10 + step,
    method: 'tools/call',
    params: {
      name: 'workspaceSymbols',
      arguments: { query: 'Calculator' }
    }
  };
  
  console.log(`📤 Testing workspace symbols (${label}): Calculator`);
  server.stdin.write(JSON.stringify(request) + '\n');
}

function openAllDocuments() {
  // Trigger document opening by calling hover on each file
  csFiles.forEach((file, index) => {
    setTimeout(() => {
      const request = {
        jsonrpc: '2.0',
        id: 100 + index,
        method: 'tools/call',
        params: {
          name: 'hover',
          arguments: { filePath: file.name, line: 0, character: 0 }
        }
      };
      
      console.log(`📂 Opening document: ${file.name}`);
      server.stdin.write(JSON.stringify(request) + '\n');
    }, index * 200);
  });
  
  // Wait for all documents to be opened
  setTimeout(() => {
    console.log('✅ All documents should now be opened');
    setTimeout(runStep, 1000);
  }, csFiles.length * 200 + 2000);
}

function testSpecificSearches() {
  const searches = ['Program', 'Main', 'Add', 'MathHelper'];
  
  searches.forEach((query, index) => {
    setTimeout(() => {
      const request = {
        jsonrpc: '2.0',
        id: 200 + index,
        method: 'tools/call',
        params: {
          name: 'workspaceSymbols',
          arguments: { query }
        }
      };
      
      console.log(`🔍 Searching for: ${query}`);
      server.stdin.write(JSON.stringify(request) + '\n');
    }, index * 1000);
  });
  
  setTimeout(runStep, searches.length * 1000 + 1000);
}

server.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  if (msg.includes('ERROR')) {
    console.error('🔴 ERROR:', msg);
  }
});

// Extended timeout
setTimeout(() => {
  console.error('\n❌ Workspace sync test timeout');
  server.kill();
  process.exit(1);
}, 60000);

process.on('SIGINT', () => {
  console.log('\n🛑 Workspace sync test interrupted');
  server.kill();
  process.exit(0);
});