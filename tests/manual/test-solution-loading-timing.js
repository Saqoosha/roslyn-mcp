#!/usr/bin/env node
/**
 * TEST: Solution Loading Timing and Workspace Symbols
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectPath = resolve(__dirname, 'examples/simple-console-app');
const solutionFile = resolve(projectPath, 'SimpleConsoleApp.sln');
const lspPath = resolve(__dirname, 'runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer');

console.log('🕒 SOLUTION LOADING TIMING TEST\n');
console.log('📁 Project:', projectPath);
console.log('📄 Solution:', solutionFile);
console.log('');

const lsp = spawn(lspPath, ['--stdio', '--logLevel', 'Information'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: projectPath,
});

let buffer = '';
let requestId = 0;

// Track timing
const timings = {
  start: Date.now(),
  initialized: null,
  solutionOpened: null,
  firstWorkspaceSymbol: null,
};

function sendLSPMessage(message) {
  const content = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
  lsp.stdin.write(header + content);
  console.log(`[${Date.now() - timings.start}ms] 📤 ${message.method || `response ${message.id}`}`);
}

// Initialize
console.log('📤 Sending initialize...');
sendLSPMessage({
  jsonrpc: '2.0',
  id: ++requestId,
  method: 'initialize',
  params: {
    processId: process.pid,
    rootUri: `file://${projectPath}`,
    capabilities: {
      workspace: {
        workspaceFolders: true,
        symbol: { dynamicRegistration: false },
      },
    },
    workspaceFolders: [{
      uri: `file://${projectPath}`,
      name: 'simple-console-app',
    }],
  },
});

// State tracking
let initializeId = requestId;
let solutionLoaded = false;
let testPhase = 0;

// Schedule tests
function scheduleTests() {
  // Test 1: Immediately after initialized
  setTimeout(() => {
    console.log('\n📍 TEST 1: Immediately after initialized');
    sendLSPMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'workspace/symbol',
      params: { query: 'Calculator' }
    });
  }, 100);

  // Test 2: After sending solution/open
  setTimeout(() => {
    console.log('\n📍 TEST 2: After solution/open notification');
    sendLSPMessage({
      jsonrpc: '2.0',
      method: 'solution/open',
      params: { solution: `file://${solutionFile}` }
    });
    
    // Wait a bit then test
    setTimeout(() => {
      sendLSPMessage({
        jsonrpc: '2.0',
        id: ++requestId,
        method: 'workspace/symbol',
        params: { query: 'Calculator' }
      });
    }, 1000);
  }, 2000);

  // Test 3: After longer wait
  setTimeout(() => {
    console.log('\n📍 TEST 3: After 10 seconds');
    sendLSPMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'workspace/symbol',
      params: { query: 'Calculator' }
    });
  }, 10000);

  // Test 4: Final test
  setTimeout(() => {
    console.log('\n📍 TEST 4: Final test after 20 seconds');
    sendLSPMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'workspace/symbol',
      params: { query: '' }
    });
  }, 20000);
}

// Handle responses
lsp.stdout.on('data', (data) => {
  buffer += data.toString();
  
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;

    const headers = buffer.substring(0, headerEnd);
    const contentLengthMatch = headers.match(/Content-Length: (\d+)/i);
    
    if (!contentLengthMatch) {
      buffer = buffer.substring(headerEnd + 4);
      continue;
    }

    const contentLength = parseInt(contentLengthMatch[1], 10);
    const messageStart = headerEnd + 4;
    
    if (buffer.length < messageStart + contentLength) break;

    const content = buffer.substring(messageStart, messageStart + contentLength);
    buffer = buffer.substring(messageStart + contentLength);

    try {
      const message = JSON.parse(content);
      
      if (message.id === initializeId) {
        timings.initialized = Date.now();
        console.log(`[${timings.initialized - timings.start}ms] ✅ Initialized`);
        
        sendLSPMessage({
          jsonrpc: '2.0',
          method: 'initialized',
          params: {},
        });
        
        scheduleTests();
      } else if (message.id && message.result !== undefined) {
        console.log(`[${Date.now() - timings.start}ms] 📥 Response:`, 
          Array.isArray(message.result) ? 
            `${message.result.length} symbols found` : 
            JSON.stringify(message.result));
            
        if (message.result.length > 0) {
          console.log('🎉 WORKSPACE SYMBOLS WORKING!');
          message.result.forEach(s => 
            console.log(`   - ${s.name} (${s.kind}) in ${s.containerName || 'global'}`));
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
});

// Monitor stderr for solution loading
lsp.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('solution/open') || msg.includes('Loading') || 
      msg.includes('completed') || msg.includes('.sln') || msg.includes('.csproj')) {
    console.log(`[${Date.now() - timings.start}ms] 🔍 LSP:`, msg.trim().substring(0, 150));
  }
});

// Timeout
setTimeout(() => {
  console.log('\n⏱️ Test complete');
  lsp.kill();
  process.exit(0);
}, 30000);