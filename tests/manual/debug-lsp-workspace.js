#!/usr/bin/env node
/**
 * DEBUG: Direct LSP communication test
 * Check what the LSP server actually returns for workspace/symbol
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🐛 DEBUG: Direct LSP Communication Test\n');

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
    clientInfo: { name: 'lsp-debug', version: '1.0.0' }
  }
};

console.log('📤 Initializing server...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim() && line.startsWith('{')) {
      try {
        const response = JSON.parse(line);
        console.log('📥 Response:', JSON.stringify(response, null, 2));
        
        if (response.id === 1) {
          console.log('\n✅ Server initialized');
          console.log('⏳ Waiting 8 seconds then testing document symbols first...');
          
          // Test document symbols first (known to work)
          setTimeout(() => {
            console.log('\n📤 Testing Document Symbols (should work)...');
            const docSymbolsRequest = {
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: 'documentSymbols',
                arguments: { filePath: 'Program.cs' }
              }
            };
            server.stdin.write(JSON.stringify(docSymbolsRequest) + '\n');
          }, 8000);
          
        } else if (response.id === 2) {
          console.log('\n✅ Document symbols response received');
          console.log('📤 Now testing Workspace Symbols...');
          
          // Now test workspace symbols
          setTimeout(() => {
            const workspaceRequest = {
              jsonrpc: '2.0',
              id: 3,
              method: 'tools/call',
              params: {
                name: 'workspaceSymbols',
                arguments: { query: 'Calculator' }
              }
            };
            server.stdin.write(JSON.stringify(workspaceRequest) + '\n');
          }, 2000);
          
        } else if (response.id === 3) {
          console.log('\n🔍 Workspace symbols response received');
          console.log('🏁 DEBUG TEST COMPLETE');
          server.kill();
          process.exit(0);
        }
        
      } catch (e) {
        console.log('🔴 Non-JSON line:', line);
      }
    }
  }
});

server.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  console.log('🔴 LSP STDERR:', msg);
});

setTimeout(() => {
  console.error('\n❌ Debug timeout');
  server.kill();
  process.exit(1);
}, 30000);

process.on('SIGINT', () => {
  console.log('\n🛑 Debug interrupted');
  server.kill();
  process.exit(0);
});