#!/usr/bin/env node

/**
 * Direct Roslyn LSP test with actual Unity solution
 * Testing: /Users/hiko/Documents/everies/everies/everies.sln
 * 11 projects: Runtime + Editor assemblies + 3rd party packages
 */

import { spawn } from 'child_process';

const unityProjectRoot = '/Users/hiko/Documents/everies/everies';
const solutionFile = `${unityProjectRoot}/everies.sln`;
const testFile = `${unityProjectRoot}/Assets/Scripts/Runtime/Every.cs`;

console.log('🎯 Direct Roslyn LSP Test with Unity Solution');
console.log('━'.repeat(60));
console.log(`📁 Project: ${unityProjectRoot}`);
console.log(`📋 Solution: ${solutionFile}`);
console.log(`📄 Test File: ${testFile}`);
console.log('━'.repeat(60));

// Start Roslyn LSP directly
const lspPath = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer';

console.log(`🚀 Starting Roslyn LSP: ${lspPath}`);
const lsp = spawn(lspPath, [
  '--stdio',
  '--logLevel', 'Information',
  '--extensionLogDirectory', '/tmp/roslyn-lsp-logs'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: unityProjectRoot
});

const startTime = Date.now();
let initialized = false;
let buffer = '';
let requestId = 0;

// Message helpers
function sendMessage(method, params, id = null) {
  const message = {
    jsonrpc: '2.0',
    method,
    ...(id !== null ? { id } : {}),
    params
  };
  
  const content = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
  
  console.log(`📤 Sending: ${method}${id ? ` (id:${id})` : ''}`);
  lsp.stdin.write(header + content);
}

function sendRequest(method, params) {
  const id = ++requestId;
  sendMessage(method, params, id);
  return id;
}

// Handle LSP responses
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
      handleMessage(message);
    } catch (error) {
      console.error('❌ Parse error:', error);
    }
  }
});

// Handle stderr (important for diagnostics)
lsp.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  for (const line of lines) {
    if (line.includes('ERROR') || line.includes('WARN') || line.includes('Fatal') || line.includes('Exception')) {
      console.error(`🚨 LSP Error: ${line}`);
    } else if (line.includes('Loading') || line.includes('project') || line.includes('solution')) {
      console.log(`📝 LSP Log: ${line}`);
    }
  }
});

// Message handler
function handleMessage(message) {
  const elapsed = Date.now() - startTime;
  
  if (message.method) {
    // Notification
    if (message.method === 'window/logMessage') {
      const level = ['', 'ERROR', 'WARN', 'INFO', 'LOG'][message.params?.type || 0];
      console.log(`📋 LSP ${level}: ${message.params?.message || ''}`);
    }
    return;
  }
  
  // Response
  if (message.id === 1) {
    // Initialize response
    console.log(`✅ Initialize completed (${elapsed}ms)`);
    console.log(`🎯 Server capabilities:`, Object.keys(message.result?.capabilities || {}));
    
    // Send initialized notification
    sendMessage('initialized', {});
    initialized = true;
    
    // Start testing sequence
    setTimeout(() => testSequence(), 2000);
    
  } else if (message.id === 2) {
    // Hover test
    console.log(`\n🔍 Hover Test Result (${elapsed}ms):`);
    if (message.result?.contents) {
      console.log(`✅ Hover working: ${JSON.stringify(message.result.contents).substring(0, 100)}...`);
    } else {
      console.log(`❌ No hover information available`);
      console.log(`📊 Full response:`, JSON.stringify(message, null, 2));
    }
    
    // Test workspace symbols
    setTimeout(() => {
      console.log('\n🔍 Testing workspace symbols...');
      sendRequest('workspace/symbol', { query: 'Every' });
    }, 1000);
    
  } else if (message.id === 3) {
    // Workspace symbols test
    console.log(`\n🔍 Workspace Symbols Test Result (${elapsed}ms):`);
    if (message.result && message.result.length > 0) {
      console.log(`✅ Found ${message.result.length} symbols for "Every"`);
      message.result.slice(0, 3).forEach(symbol => {
        console.log(`   📍 ${symbol.name} (${symbol.kind}): ${symbol.location?.uri || 'no location'}`);
      });
    } else {
      console.log(`❌ No workspace symbols found for "Every"`);
      console.log(`📊 Full response:`, JSON.stringify(message, null, 2));
    }
    
    // Test go-to-definition
    setTimeout(() => {
      console.log('\n🔍 Testing go-to-definition...');
      sendRequest('textDocument/definition', {
        textDocument: { uri: `file://${testFile}` },
        position: { line: 10, character: 15 } // Arbitrary position
      });
    }, 1000);
    
  } else if (message.id === 4) {
    // Definition test
    console.log(`\n🔍 Go-to-Definition Test Result (${elapsed}ms):`);
    if (message.result && message.result.length > 0) {
      console.log(`✅ Found ${message.result.length} definitions`);
      message.result.slice(0, 2).forEach(def => {
        console.log(`   📍 ${def.uri}:${def.range?.start?.line || '?'}`);
      });
    } else {
      console.log(`❌ No definitions found`);
      console.log(`📊 Full response:`, JSON.stringify(message, null, 2));
    }
    
    // Finish test
    setTimeout(() => {
      console.log('\n🏁 Test completed');
      lsp.kill();
      process.exit(0);
    }, 2000);
  }
}

// Test sequence
async function testSequence() {
  console.log('\n🧪 Starting test sequence...');
  
  // Wait a bit for solution loading
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Test hover
  console.log('\n🔍 Testing hover information...');
  sendRequest('textDocument/hover', {
    textDocument: { uri: `file://${testFile}` },
    position: { line: 5, character: 10 } // Arbitrary position
  });
}

// Initialize LSP
setTimeout(() => {
  console.log('\n📡 Initializing Roslyn LSP...');
  sendRequest('initialize', {
    processId: process.pid,
    rootUri: `file://${unityProjectRoot}`,
    capabilities: {
      textDocument: {
        hover: { dynamicRegistration: false, contentFormat: ['markdown', 'plaintext'] },
        definition: { dynamicRegistration: false },
        documentSymbol: { dynamicRegistration: false }
      },
      workspace: {
        symbol: { dynamicRegistration: false },
        workspaceFolders: true
      }
    },
    workspaceFolders: [{
      uri: `file://${unityProjectRoot}`,
      name: 'everies'
    }]
  });
}, 1000);

// Error handling
lsp.on('error', (error) => {
  console.error('❌ LSP Process error:', error);
});

lsp.on('exit', (code, signal) => {
  const elapsed = Date.now() - startTime;
  console.log(`\n🔚 LSP exited after ${elapsed}ms with code ${code}, signal ${signal}`);
});

// Timeout
setTimeout(() => {
  console.log('\n⏰ Test timeout after 60 seconds');
  lsp.kill();
  process.exit(1);
}, 60000);