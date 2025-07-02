#!/usr/bin/env node
/**
 * Simple test for workspace symbols with detailed logging
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🧪 Simple Workspace Symbols Test\n');

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
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }
};

console.log('📤 Initializing...');
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
        
        if (response.id === 1) {
          console.log('✅ Server initialized, waiting 5 seconds for indexing...');
          
          setTimeout(() => {
            console.log('📤 Testing workspace symbol search...');
            
            // Test with empty query first
            const request = {
              jsonrpc: '2.0',
              id: 10,
              method: 'tools/call',
              params: {
                name: 'workspaceSymbols',
                arguments: { query: '' }  // Empty query might return all symbols
              }
            };
            
            server.stdin.write(JSON.stringify(request) + '\n');
          }, 5000);
          
        } else if (response.id === 10) {
          console.log('\n📥 Empty query response:');
          if (response.result && response.result.content) {
            response.result.content.forEach(content => {
              console.log('\n' + content.text);
            });
          } else if (response.error) {
            console.log('❌ Error:', response.error);
          }
          
          // Now try with "Calc"
          setTimeout(() => {
            console.log('\n📤 Testing with "Calc"...');
            const request2 = {
              jsonrpc: '2.0',
              id: 11,
              method: 'tools/call',
              params: {
                name: 'workspaceSymbols',
                arguments: { query: 'Calc' }
              }
            };
            server.stdin.write(JSON.stringify(request2) + '\n');
          }, 1000);
          
        } else if (response.id === 11) {
          console.log('\n📥 "Calc" query response:');
          if (response.result && response.result.content) {
            response.result.content.forEach(content => {
              console.log('\n' + content.text);
            });
          } else if (response.error) {
            console.log('❌ Error:', response.error);
          }
          
          console.log('\n✅ Test complete!');
          server.kill();
          process.exit(0);
        }
        
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }
});

server.stderr.on('data', (data) => {
  const msg = data.toString();
  console.error('🔴 Server stderr:', msg.trim());
});

// Timeout
setTimeout(() => {
  console.error('\n❌ Test timeout');
  server.kill();
  process.exit(1);
}, 15000);

// Handle exit
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  server.kill();
  process.exit(0);
});