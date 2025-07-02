#!/usr/bin/env node
/**
 * Quick test of the ping tool to verify MCP server works
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const projectPath = process.argv[2] || '.';
const mcpPath = resolve(import.meta.url.replace('file://', ''), '../dist/cli.js');

console.log('🧪 Testing ping tool\n');

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

// Handle responses
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
          console.log('✅ Server initialized');
          
          // Test ping
          const pingRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'ping',
              arguments: {
                message: 'Hello from test script!'
              }
            }
          };
          
          console.log('📤 Testing ping...');
          server.stdin.write(JSON.stringify(pingRequest) + '\n');
          
        } else if (response.id === 2) {
          console.log('\n📥 Ping response:');
          if (response.result && response.result.content) {
            response.result.content.forEach(content => {
              console.log(content.text);
            });
          }
          
          setTimeout(() => {
            console.log('\n✅ Ping test successful!');
            server.kill();
            process.exit(0);
          }, 500);
        }
        
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }
});

server.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('ERROR') || msg.includes('WARN')) {
    console.error('🔴 Server:', msg.trim());
  }
});

// Timeout
setTimeout(() => {
  console.error('\n❌ Test timeout');
  server.kill();
  process.exit(1);
}, 10000);