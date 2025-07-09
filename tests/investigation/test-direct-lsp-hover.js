#!/usr/bin/env node

/**
 * Test direct LSP hover vs MCP hover to compare behavior
 * This will help us identify where the disconnect is happening
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const simpleProjectRoot = '/Users/hiko/Desktop/csharp-ls-client/SimpleTest';
const testFile = `${simpleProjectRoot}/Program.cs`;
const lspPath = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer';

console.log('🔍 Direct LSP vs MCP Hover Comparison');
console.log('━'.repeat(50));
console.log(`📁 Project: ${simpleProjectRoot}`);
console.log(`📄 Test File: ${testFile}`);
console.log('━'.repeat(50));

// First test: Direct LSP
console.log('\n🎯 TEST 1: Direct Roslyn LSP');
console.log('━'.repeat(30));

const lsp = spawn(lspPath, [
  '--stdio',
  '--logLevel', 'Information'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: simpleProjectRoot
});

let buffer = '';
let requestId = 0;
const startTime = Date.now();

function sendLSPMessage(method, params, id = null) {
  const message = {
    jsonrpc: '2.0',
    method,
    ...(id !== null ? { id } : {}),
    params
  };
  
  const content = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
  
  console.log(`📤 LSP: ${method}${id ? ` (id:${id})` : ''}`);
  lsp.stdin.write(header + content);
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
      handleLSPMessage(message);
    } catch (error) {
      console.error('❌ Parse error:', error);
    }
  }
});

function handleLSPMessage(message) {
  const elapsed = Date.now() - startTime;
  
  if (message.id === 1) {
    console.log(`✅ LSP initialized (${elapsed}ms)`);
    sendLSPMessage('initialized', {});
    
    // Load solution
    setTimeout(() => {
      sendLSPMessage('solution/open', {
        solution: `file://${simpleProjectRoot}/SimpleTest.sln`
      });
      
      setTimeout(() => {
        sendLSPMessage('workspace/projectInitializationComplete', {});
        
        // Open document
        setTimeout(() => {
          const fileContent = readFileSync(testFile, 'utf8');
          const uri = `file://${testFile}`;
          
          sendLSPMessage('textDocument/didOpen', {
            textDocument: {
              uri: uri,
              languageId: 'csharp',
              version: 1,
              text: fileContent
            }
          });
          
          // Test hover
          setTimeout(() => {
            console.log('\n🔍 Testing direct LSP hover...');
            sendLSPMessage('textDocument/hover', {
              textDocument: { uri: uri },
              position: { line: 8, character: 20 } // On Calculator class
            }, 99);
          }, 2000);
        }, 1000);
      }, 1000);
    }, 2000);
    
  } else if (message.id === 99) {
    console.log(`\n🔍 Direct LSP Hover Result (${elapsed}ms):`);
    console.log('━'.repeat(60));
    
    if (message.result?.contents) {
      console.log('✅ DIRECT LSP HOVER WORKING!');
      console.log(`📋 Contents:`, JSON.stringify(message.result.contents, null, 2));
    } else {
      console.log('❌ Direct LSP hover failed');
      console.log(`📊 Response:`, JSON.stringify(message, null, 2));
    }
    
    console.log('━'.repeat(60));
    
    // Now test MCP
    setTimeout(() => testMCP(), 2000);
  }
}

function testMCP() {
  console.log('\n🎯 TEST 2: MCP Wrapper');
  console.log('━'.repeat(30));
  
  lsp.kill(); // Stop direct LSP
  
  const mcp = spawn('node', [
    '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
    '--fast-start',
    '--project', simpleProjectRoot,
    '--log-level', 'debug'
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: '/Users/hiko/Desktop/csharp-ls-client',
    env: { ...process.env, PROJECT_ROOT: simpleProjectRoot }
  });
  
  // Wait for MCP readiness
  mcp.stderr.on('data', (data) => {
    const logLine = data.toString();
    
    if (logLine.includes('Background initialization completed')) {
      console.log('🎉 MCP ready - testing hover...');
      
      setTimeout(() => {
        const request = {
          jsonrpc: '2.0',
          id: 200,
          method: 'tools/call',
          params: {
            name: 'hover',
            arguments: {
              filePath: 'Program.cs',
              line: 8,
              character: 20
            }
          }
        };
        
        console.log('📤 MCP hover request...');
        mcp.stdin.write(JSON.stringify(request) + '\n');
      }, 2000);
    }
  });
  
  mcp.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        
        if (response.id === 200) {
          console.log(`\n🔍 MCP Hover Result:`);
          console.log('━'.repeat(60));
          
          const text = response.result?.content?.[0]?.text || '';
          if (text.includes('Hover Information')) {
            console.log('✅ MCP HOVER WORKING!');
          } else {
            console.log('❌ MCP hover failed');
            console.log(`📊 Response: ${text.substring(0, 200)}...`);
          }
          
          console.log('━'.repeat(60));
          
          // Final comparison
          setTimeout(() => {
            console.log('\n📊 COMPARISON COMPLETE');
            console.log('This will help identify where the MCP wrapper is failing');
            mcp.kill();
            process.exit(0);
          }, 1000);
        }
      } catch (e) {
        // Ignore non-JSON
      }
    }
  });
  
  // Timeout for MCP test
  setTimeout(() => {
    console.log('⏰ MCP test timeout');
    mcp.kill();
    process.exit(1);
  }, 45000);
}

// Initialize LSP
setTimeout(() => {
  console.log('📡 Initializing direct LSP...');
  sendLSPMessage('initialize', {
    processId: process.pid,
    rootUri: `file://${simpleProjectRoot}`,
    capabilities: {
      textDocument: {
        hover: { dynamicRegistration: false, contentFormat: ['markdown', 'plaintext'] }
      }
    },
    workspaceFolders: [{
      uri: `file://${simpleProjectRoot}`,
      name: 'SimpleTest'
    }]
  }, 1);
}, 1000);

// Error handling
lsp.on('error', (error) => {
  console.error('❌ LSP error:', error);
});

lsp.on('exit', (code, signal) => {
  console.log(`🔚 LSP exited: code ${code}, signal ${signal}`);
});

// Timeout
setTimeout(() => {
  console.log('⏰ Test timeout');
  lsp.kill();
  process.exit(1);
}, 60000);