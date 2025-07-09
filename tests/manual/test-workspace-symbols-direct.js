#!/usr/bin/env node

/**
 * 🔍 DIRECT WORKSPACE SYMBOLS TEST
 * 
 * Test workspace/symbol directly with LSP to see if it works
 */

import { spawn } from 'child_process';
import path from 'path';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const LSP_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer';

async function testWorkspaceSymbolsDirect() {
  console.log('🔍 DIRECT WORKSPACE SYMBOLS TEST');
  console.log(`📁 Project: ${PROJECT_ROOT}\n`);
  
  const lspServer = spawn(LSP_PATH, [
    '--stdio',
    '--logLevel', 'Information', 
    '--extensionLogDirectory', '/tmp'
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: PROJECT_ROOT
  });
  
  let initialized = false;
  let initializeComplete = false;
  
  // Handle stderr
  lspServer.stderr.on('data', (data) => {
    console.log(`📊 STDERR: ${data.toString().trim()}`);
  });
  
  // Handle stdout with LSP parsing
  let buffer = '';
  lspServer.stdout.on('data', (data) => {
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
      
      const contentLength = parseInt(contentLengthMatch[1]);
      const messageStart = headerEnd + 4;
      
      if (buffer.length < messageStart + contentLength) {
        break;
      }
      
      const messageJson = buffer.substring(messageStart, messageStart + contentLength);
      buffer = buffer.substring(messageStart + contentLength);
      
      try {
        const response = JSON.parse(messageJson);
        handleLSPMessage(response);
      } catch (error) {
        console.log(`❌ Parse error: ${error.message}`);
      }
    }
  });
  
  function sendLSPMessage(message) {
    const messageJson = JSON.stringify(message);
    const lspMessage = `Content-Length: ${messageJson.length}\r\n\r\n${messageJson}`;
    lspServer.stdin.write(lspMessage);
  }
  
  function handleLSPMessage(message) {
    if (message.method === 'window/logMessage' && 
        message.params?.message?.includes('Language server initialized')) {
      initialized = true;
      console.log('🎉 LSP initialized!');
      
      // Send initialize request
      setTimeout(() => {
        sendLSPMessage({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            processId: process.pid,
            rootUri: `file://${PROJECT_ROOT}`,
            workspaceFolders: [{
              uri: `file://${PROJECT_ROOT}`,
              name: 'test-projects'
            }],
            capabilities: {
              workspace: {
                workspaceSymbol: { dynamicRegistration: false },
                workspaceFolders: true
              }
            }
          }
        });
        console.log('📤 Sent initialize request');
      }, 100);
      
    } else if (message.id === 1 && message.result) {
      initializeComplete = true;
      console.log('✅ Initialize response received');
      
      // Send initialized notification
      sendLSPMessage({
        jsonrpc: '2.0',
        method: 'initialized',
        params: {}
      });
      
      // Load solution
      const solutionPath = path.join(PROJECT_ROOT, 'csharp-ls-client.sln');
      sendLSPMessage({
        jsonrpc: '2.0',
        method: 'solution/open',
        params: {
          solution: `file://${solutionPath}`
        }
      });
      console.log('📤 Sent solution/open notification');
      
      // Wait for solution loading, then test workspace symbols
      setTimeout(() => {
        testWorkspaceSymbols();
      }, 3000);
      
    } else if (message.id >= 100) {
      // Workspace symbol responses
      console.log(`\n📍 Workspace Symbol Response (ID: ${message.id}):`);
      if (message.result) {
        console.log(`   Found ${message.result.length} symbols`);
        message.result.slice(0, 5).forEach((symbol, i) => {
          console.log(`   ${i+1}. ${symbol.name} (${symbol.kind}) - ${symbol.location?.uri?.split('/').pop()}`);
        });
      } else if (message.error) {
        console.log(`   ❌ Error: ${message.error.message}`);
      } else {
        console.log(`   ❌ No result or error in response`);
      }
    }
  }
  
  function testWorkspaceSymbols() {
    console.log('\n🔍 Testing workspace symbols...\n');
    
    const queries = [
      'Calculator',
      'Program', 
      'Add',
      'Main',
      '', // Empty query
      'C', // Single letter
      'Test'
    ];
    
    queries.forEach((query, index) => {
      setTimeout(() => {
        sendLSPMessage({
          jsonrpc: '2.0',
          id: 100 + index,
          method: 'workspace/symbol',
          params: { query }
        });
        console.log(`📤 Testing query: "${query}"`);
      }, index * 500);
    });
  }
  
  // Cleanup after tests
  setTimeout(() => {
    console.log('\n🏁 Test completed');
    lspServer.kill();
  }, 10000);
}

testWorkspaceSymbolsDirect().catch(console.error);