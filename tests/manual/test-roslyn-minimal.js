#!/usr/bin/env node
/**
 * Minimal Roslyn LSP test
 */

import { spawn } from 'child_process';

const lsp = spawn('/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer', ['--stdio'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

console.log('🚀 LSP Process started, PID:', lsp.pid);

// Monitor all output
lsp.stdout.on('data', (data) => {
  console.log('📤 STDOUT:', data.toString());
});

lsp.stderr.on('data', (data) => {
  console.log('🔴 STDERR:', data.toString());
});

lsp.on('error', (error) => {
  console.error('❌ Process error:', error);
});

lsp.on('exit', (code, signal) => {
  console.log(`💀 Process exited with code ${code}, signal ${signal}`);
});

// Send minimal initialize after delay
setTimeout(() => {
  console.log('\n📨 Sending minimal initialize...');
  
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      processId: process.pid,
      rootUri: null,
      capabilities: {}
    }
  };
  
  const content = JSON.stringify(request);
  const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
  
  try {
    lsp.stdin.write(header + content);
    console.log('✅ Request sent');
  } catch (error) {
    console.error('❌ Failed to send:', error);
  }
}, 1000);

// Kill after 10 seconds
setTimeout(() => {
  console.log('\n⏱️ Killing process...');
  lsp.kill();
}, 10000);