#!/usr/bin/env node

/**
 * 🔧 SIMPLE LSP STARTUP TEST
 * 
 * Just test if we can start LSP and get basic response
 */

import { spawn } from 'child_process';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const LSP_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer';

async function simpleLSPTest() {
  console.log('🔧 SIMPLE LSP STARTUP TEST');
  console.log(`📁 Project: ${PROJECT_ROOT}`);
  console.log(`🚀 LSP: ${LSP_PATH}\n`);
  
  const lspServer = spawn(LSP_PATH, [
    '--stdio',
    '--logLevel', 'Information', 
    '--extensionLogDirectory', '/tmp'
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: PROJECT_ROOT
  });
  
  let initialized = false;
  
  // Handle stderr (logs) 
  lspServer.stderr.on('data', (data) => {
    const output = data.toString();
    console.log(`📊 LSP STDERR: ${output.trim()}`);
  });
  
  // Handle stdout (responses)
  let buffer = '';
  lspServer.stdout.on('data', (data) => {
    buffer += data.toString();
    console.log(`📥 LSP STDOUT: ${data.toString()}`);
    
    // Try to parse any complete messages
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
        console.log('✅ Got LSP response:', JSON.stringify(response, null, 2));
        
        // Check if this is the initialization log message
        if (response.method === 'window/logMessage' && 
            response.params?.message?.includes('Language server initialized')) {
          initialized = true;
          console.log('🎉 LSP initialized! Sending test request...');
          
          // Send initialize request
          setTimeout(() => {
            const initRequest = {
              jsonrpc: '2.0',
              id: 1,
              method: 'initialize',
              params: {
                processId: process.pid,
                rootUri: `file://${PROJECT_ROOT}`,
                capabilities: {
                  workspace: {
                    symbol: { dynamicRegistration: false }
                  }
                }
              }
            };
            
            const requestJson = JSON.stringify(initRequest);
            const message = `Content-Length: ${requestJson.length}\r\n\r\n${requestJson}`;
            lspServer.stdin.write(message);
            
            console.log('📤 Sent initialize request');
          }, 500);
        }
      } catch (error) {
        console.log('❌ Failed to parse response:', error.message);
      }
    }
  });
  
  // Handle errors
  lspServer.on('error', (error) => {
    console.log(`❌ LSP Error: ${error.message}`);
  });
  
  lspServer.on('exit', (code, signal) => {
    console.log(`🏁 LSP exited with code ${code}, signal ${signal}`);
  });
  
  // Wait and cleanup
  setTimeout(() => {
    if (!initialized) {
      console.log('❌ LSP failed to initialize within 10 seconds');
    }
    lspServer.kill();
  }, 10000);
}

simpleLSPTest().catch(console.error);