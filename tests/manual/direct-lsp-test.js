#!/usr/bin/env node
/**
 * DIRECT LSP TEST: Bypass MCP and test LSP directly
 * This will help us understand if the issue is in our MCP layer or LSP itself
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const projectRoot = resolve('examples/simple-console-app');
const lspPath = resolve('runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer');

console.log('🔧 DIRECT LSP TEST (Bypassing MCP)\n');
console.log(`📁 Project: ${projectRoot}`);
console.log(`🚀 LSP: ${lspPath}\n`);

// Spawn LSP directly
const lsp = spawn(lspPath, [
  '--stdio',
  '--logLevel', 'Information',
  '--extensionLogDirectory', '/tmp'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: projectRoot,
});

let requestId = 0;
let buffer = '';

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
    
    if (buffer.length < messageStart + contentLength) {
      break;
    }

    const content = buffer.substring(messageStart, messageStart + contentLength);
    buffer = buffer.substring(messageStart + contentLength);

    try {
      const message = JSON.parse(content);
      console.log('📥 LSP Response:', JSON.stringify(message, null, 2));
      handleLSPResponse(message);
    } catch (error) {
      console.error('❌ Failed to parse LSP message:', error, content);
    }
  }
});

lsp.stderr.on('data', (data) => {
  console.log('🔴 LSP STDERR:', data.toString().trim());
});

function sendLSPRequest(method, params) {
  const id = ++requestId;
  const request = {
    jsonrpc: '2.0',
    id,
    method,
    params,
  };

  const message = JSON.stringify(request);
  const content = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`;
  
  console.log(`📤 LSP Request: ${method}`, params);
  lsp.stdin.write(content);
  return id;
}

function sendLSPNotification(method, params) {
  const notification = {
    jsonrpc: '2.0',
    method,
    params,
  };

  const message = JSON.stringify(notification);
  const content = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`;
  
  console.log(`📤 LSP Notification: ${method}`, params);
  lsp.stdin.write(content);
}

let initializeId, testStep = 0;

function handleLSPResponse(message) {
  if (message.id === initializeId) {
    console.log('\n✅ LSP Initialized successfully');
    console.log('🔧 Server capabilities:', JSON.stringify(message.result.capabilities, null, 2));
    
    // Send initialized notification
    sendLSPNotification('initialized', {});
    
    // Wait a bit then start testing
    setTimeout(runNextTest, 3000);
  }
}

function runNextTest() {
  testStep++;
  
  switch(testStep) {
    case 1:
      console.log('\n🔍 TEST 1: Direct workspace/symbol request');
      sendLSPRequest('workspace/symbol', { query: 'Calculator' });
      setTimeout(runNextTest, 2000);
      break;
      
    case 2:
      console.log('\n🔍 TEST 2: Empty query workspace/symbol');
      sendLSPRequest('workspace/symbol', { query: '' });
      setTimeout(runNextTest, 2000);
      break;
      
    case 3:
      console.log('\n🔍 TEST 3: Document symbols for comparison');
      sendLSPRequest('textDocument/documentSymbol', {
        textDocument: { uri: `file://${projectRoot}/Program.cs` }
      });
      setTimeout(runNextTest, 2000);
      break;
      
    case 4:
      console.log('\n🏁 DIRECT LSP TEST COMPLETE');
      lsp.kill();
      process.exit(0);
      break;
  }
}

// Initialize LSP
console.log('📤 Initializing LSP...');
initializeId = sendLSPRequest('initialize', {
  processId: process.pid,
  rootUri: `file://${projectRoot}`,
  capabilities: {
    workspace: {
      workspaceFolders: true,
      symbol: { dynamicRegistration: false },
    }
  },
  workspaceFolders: [{
    uri: `file://${projectRoot}`,
    name: 'root',
  }],
});

// Timeout
setTimeout(() => {
  console.error('\n❌ Direct LSP test timeout');
  lsp.kill();
  process.exit(1);
}, 20000);

// Handle exit
process.on('SIGINT', () => {
  console.log('\n🛑 Direct LSP test interrupted');
  lsp.kill();
  process.exit(0);
});