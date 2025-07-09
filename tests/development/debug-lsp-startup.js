#!/usr/bin/env node

/**
 * Debug LSP startup issues - capture all error messages
 */

import { spawn } from 'child_process';

const unityProjectRoot = '/Users/hiko/Documents/everies/everies';
const lspPath = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer';

console.log('🔍 LSP Startup Debug');
console.log('━'.repeat(40));
console.log(`📁 Working Dir: ${unityProjectRoot}`);
console.log(`🚀 LSP Path: ${lspPath}`);
console.log('━'.repeat(40));

const lsp = spawn(lspPath, [
  '--stdio',
  '--logLevel', 'Trace',  // Maximum logging
  '--extensionLogDirectory', '/tmp/roslyn-debug'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: unityProjectRoot
});

let stderrBuffer = '';
let stdoutBuffer = '';

// Capture all stderr (errors and logs)
lsp.stderr.on('data', (data) => {
  const text = data.toString();
  stderrBuffer += text;
  
  console.log('🚨 STDERR:', text.trim());
});

// Capture all stdout
lsp.stdout.on('data', (data) => {
  const text = data.toString();
  stdoutBuffer += text;
  
  console.log('📤 STDOUT:', text.trim());
});

lsp.on('error', (error) => {
  console.error('❌ Process Error:', error);
});

lsp.on('exit', (code, signal) => {
  console.log(`\n🔚 LSP Exit: code=${code}, signal=${signal}`);
  
  if (code !== 0) {
    console.log('\n📋 Full STDERR Output:');
    console.log('━'.repeat(50));
    console.log(stderrBuffer);
    console.log('━'.repeat(50));
    
    console.log('\n📋 Full STDOUT Output:');
    console.log('━'.repeat(50));
    console.log(stdoutBuffer);
    console.log('━'.repeat(50));
  }
});

// Send a simple test after startup
setTimeout(() => {
  console.log('\n📡 Sending test message...');
  
  const message = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      processId: process.pid,
      rootUri: `file://${unityProjectRoot}`,
      capabilities: {}
    }
  });
  
  const content = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`;
  lsp.stdin.write(content);
}, 2000);

// Kill after 30 seconds
setTimeout(() => {
  console.log('\n⏰ Timeout - killing process');
  lsp.kill();
  process.exit(0);
}, 30000);