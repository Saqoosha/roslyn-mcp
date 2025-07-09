#!/usr/bin/env node

/**
 * Proper LSP sequence test - following correct document lifecycle
 * 1. Initialize LSP
 * 2. Load solution/projects
 * 3. Open documents with didOpen
 * 4. THEN query hover/definitions
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const unityProjectRoot = '/Users/hiko/Documents/everies/everies';
const testFile = `${unityProjectRoot}/Assets/Scripts/Runtime/Every.cs`;
const lspPath = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer';

console.log('🔧 Proper LSP Sequence Test');
console.log('━'.repeat(50));
console.log(`📁 Project: ${unityProjectRoot}`);
console.log(`📄 Test File: ${testFile}`);
console.log('━'.repeat(50));

const lsp = spawn(lspPath, [
  '--stdio',
  '--logLevel', 'Information'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: unityProjectRoot
});

let buffer = '';
let requestId = 0;
const startTime = Date.now();

function sendMessage(method, params, id = null) {
  const message = {
    jsonrpc: '2.0',
    method,
    ...(id !== null ? { id } : {}),
    params
  };
  
  const content = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
  
  console.log(`📤 ${method}${id ? ` (id:${id})` : ''}`);
  lsp.stdin.write(header + content);
}

function sendRequest(method, params) {
  const id = ++requestId;
  sendMessage(method, params, id);
  return id;
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
      handleMessage(message);
    } catch (error) {
      console.error('❌ Parse error:', error);
    }
  }
});

// Handle stderr
lsp.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  for (const line of lines) {
    if (line.includes('solution/open') || line.includes('project/open') || line.includes('Loading')) {
      console.log(`📝 ${line}`);
    } else if (line.includes('ERROR')) {
      console.error(`🚨 ${line}`);
    }
  }
});

let phase = 'init';

function handleMessage(message) {
  const elapsed = Date.now() - startTime;
  
  if (message.method) {
    // Notifications
    if (message.method === 'window/logMessage') {
      const msg = message.params?.message || '';
      if (msg.includes('solution') || msg.includes('project') || msg.includes('Loading')) {
        console.log(`📋 LSP: ${msg}`);
      }
    }
    return;
  }
  
  // Responses
  if (message.id === 1 && phase === 'init') {
    console.log(`✅ Initialized (${elapsed}ms)`);
    sendMessage('initialized', {});
    
    phase = 'load_solution';
    console.log('\n🔄 Step 2: Loading solution/projects...');
    
    // Load solution (like our MCP implementation does)
    setTimeout(() => {
      sendMessage('solution/open', {
        solution: `file://${unityProjectRoot}/everies.sln`
      });
      
      // Wait for solution loading
      setTimeout(() => {
        sendMessage('workspace/projectInitializationComplete', {});
        
        phase = 'open_document';
        console.log('\n🔄 Step 3: Opening document...');
        
        // Wait and then open document
        setTimeout(() => openDocument(), 3000);
      }, 2000);
    }, 1000);
    
  } else if (phase === 'test_hover' && message.id === 2) {
    console.log(`\n🔍 Hover Test Result (${elapsed}ms):`);
    if (message.result?.contents) {
      console.log(`✅ HOVER WORKING!`);
      console.log(`📋 Contents: ${JSON.stringify(message.result.contents).substring(0, 150)}...`);
    } else if (message.error) {
      console.log(`❌ Hover error: ${message.error.message}`);
    } else {
      console.log(`❌ No hover information`);
    }
    
    // Test workspace symbols
    phase = 'test_workspace';
    setTimeout(() => {
      console.log('\n🔍 Testing workspace symbols...');
      sendRequest('workspace/symbol', { query: 'Every' });
    }, 1000);
    
  } else if (phase === 'test_workspace' && message.id === 3) {
    console.log(`\n🔍 Workspace Symbols (${elapsed}ms):`);
    if (message.result && message.result.length > 0) {
      console.log(`✅ Found ${message.result.length} symbols!`);
      message.result.slice(0, 3).forEach(symbol => {
        console.log(`   📍 ${symbol.name} (${symbol.kind})`);
      });
    } else {
      console.log(`❌ Still no workspace symbols`);
    }
    
    // Test definition
    phase = 'test_definition';
    setTimeout(() => {
      console.log('\n🔍 Testing go-to-definition...');
      sendRequest('textDocument/definition', {
        textDocument: { uri: `file://${testFile}` },
        position: { line: 8, character: 20 }
      });
    }, 1000);
    
  } else if (phase === 'test_definition' && message.id === 4) {
    console.log(`\n🔍 Definition Test (${elapsed}ms):`);
    if (message.result && message.result.length > 0) {
      console.log(`✅ DEFINITION WORKING!`);
      message.result.slice(0, 2).forEach(def => {
        console.log(`   📍 ${def.uri}:${def.range?.start?.line || '?'}`);
      });
    } else {
      console.log(`❌ Still no definitions`);
    }
    
    console.log('\n🏁 Proper sequence test completed!');
    setTimeout(() => {
      lsp.kill();
      process.exit(0);
    }, 2000);
  }
}

function openDocument() {
  try {
    const fileContent = readFileSync(testFile, 'utf8');
    const uri = `file://${testFile}`;
    
    console.log(`📄 Opening: ${uri}`);
    sendMessage('textDocument/didOpen', {
      textDocument: {
        uri: uri,
        languageId: 'csharp',
        version: 1,
        text: fileContent
      }
    });
    
    phase = 'test_hover';
    console.log('\n🔄 Step 4: Testing hover after document open...');
    
    // Wait for document processing, then test hover
    setTimeout(() => {
      console.log('\n🔍 Testing hover (with opened document)...');
      sendRequest('textDocument/hover', {
        textDocument: { uri: uri },
        position: { line: 8, character: 20 }
      });
    }, 2000);
    
  } catch (error) {
    console.error(`❌ Failed to read file: ${error.message}`);
  }
}

// Start sequence
setTimeout(() => {
  console.log('\n🔄 Step 1: Initializing LSP...');
  sendRequest('initialize', {
    processId: process.pid,
    rootUri: `file://${unityProjectRoot}`,
    capabilities: {
      textDocument: {
        hover: { dynamicRegistration: false, contentFormat: ['markdown', 'plaintext'] },
        definition: { dynamicRegistration: false },
        synchronization: { dynamicRegistration: false }
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

lsp.on('error', (error) => {
  console.error('❌ LSP error:', error);
});

lsp.on('exit', (code, signal) => {
  console.log(`\n🔚 LSP exited: code ${code}, signal ${signal}`);
});

// Timeout
setTimeout(() => {
  console.log('\n⏰ Test timeout');
  lsp.kill();
  process.exit(1);
}, 90000);