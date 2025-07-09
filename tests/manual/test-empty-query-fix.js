#!/usr/bin/env node
/**
 * Test the empty query fix for workspace symbols
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🧪 EMPTY QUERY FIX TEST\n');
console.log('📁 Project:', resolve(projectPath));
console.log('');

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
    clientInfo: { name: 'empty-query-test', version: '1.0.0' }
  }
};

console.log('📤 Initializing server...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

let buffer = '';

// Handle responses
server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim() && line.startsWith('{')) {
      try {
        const response = JSON.parse(line);
        
        if (response.id === 1) {
          console.log('✅ Server initialized');
          console.log('⏳ Waiting for solution loading...\n');
          
          // Wait for solution loading
          setTimeout(() => {
            console.log('🚀 Testing empty query...\n');
            
            // Test empty query
            const emptyQueryRequest = {
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: 'workspaceSymbols',
                arguments: {
                  query: ''
                }
              }
            };
            
            server.stdin.write(JSON.stringify(emptyQueryRequest) + '\n');
          }, 8000);
          
        } else if (response.id === 2) {
          console.log('📥 Empty Query Response:\n');
          
          if (response.result && response.result.content) {
            const content = response.result.content[0]?.text || '';
            console.log(content);
            
            if (content.includes('Empty Query Limitation')) {
              console.log('\n✅ Fix verified! Helpful message displayed for empty query.');
            }
          }
          
          // Now test a working query
          setTimeout(() => {
            console.log('\n🔍 Testing single letter query "C"...\n');
            
            const letterQueryRequest = {
              jsonrpc: '2.0',
              id: 3,
              method: 'tools/call',
              params: {
                name: 'workspaceSymbols',
                arguments: {
                  query: 'C'
                }
              }
            };
            
            server.stdin.write(JSON.stringify(letterQueryRequest) + '\n');
          }, 1000);
        
        } else if (response.id === 3) {
          console.log('📥 Single Letter Query Response:\n');
          
          if (response.result && response.result.content) {
            const content = response.result.content[0]?.text || '';
            
            const match = content.match(/Found (\d+) symbols?/);
            if (match) {
              const count = parseInt(match[1]);
              console.log(`✅ Found ${count} symbols with query "C"`);
              
              // Extract symbol names
              const symbolMatches = content.matchAll(/• \*\*(.+?)\*\*/g);
              for (const symbolMatch of symbolMatches) {
                console.log(`   - ${symbolMatch[1]}`);
              }
            }
          }
          
          console.log('\n🎉 Test complete!');
          setTimeout(() => {
            server.kill();
            process.exit(0);
          }, 1000);
        }
        
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
});

// Monitor stderr
server.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  
  if (msg.includes('Solution/project loading completed')) {
    console.log('✅ Solution loaded!');
  }
});

// Timeout protection
setTimeout(() => {
  console.error('\n❌ Test timeout');
  server.kill();
  process.exit(1);
}, 30000);

process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  server.kill();
  process.exit(0);
});