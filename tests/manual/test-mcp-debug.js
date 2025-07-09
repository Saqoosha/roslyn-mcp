#!/usr/bin/env node
/**
 * Debug MCP server startup issues
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🔍 MCP SERVER DEBUG TEST\n');
console.log('📁 Project:', resolve(projectPath));
console.log('🚀 MCP Path:', mcpPath);
console.log('🌍 Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PROJECT_ROOT: resolve(projectPath)
});
console.log('');

const server = spawn('node', [mcpPath, projectPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PROJECT_ROOT: resolve(projectPath),
    DEBUG: '*' // Enable debug logging
  }
});

console.log('✅ MCP process spawned, PID:', server.pid);

// Monitor all output
server.stdout.on('data', (data) => {
  console.log('📤 STDOUT:', data.toString().trim());
});

server.stderr.on('data', (data) => {
  console.log('🔴 STDERR:', data.toString().trim());
});

server.on('error', (error) => {
  console.error('❌ Process error:', error);
});

server.on('exit', (code, signal) => {
  console.log(`💀 Process exited with code ${code}, signal ${signal}`);
});

// Try sending initialize after a delay
setTimeout(() => {
  console.log('\n📨 Sending initialize request...');
  
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'debug-test', version: '1.0.0' }
    }
  };
  
  try {
    server.stdin.write(JSON.stringify(initRequest) + '\n');
    console.log('✅ Request sent');
  } catch (error) {
    console.error('❌ Failed to send request:', error);
  }
}, 2000);

// Simple ping test after longer delay
setTimeout(() => {
  console.log('\n📨 Sending tools/call ping...');
  
  const pingRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'ping',
      arguments: {}
    }
  };
  
  try {
    server.stdin.write(JSON.stringify(pingRequest) + '\n');
  } catch (error) {
    console.error('❌ Failed to send ping:', error);
  }
}, 5000);

// Timeout
setTimeout(() => {
  console.log('\n⏱️ Test complete, killing process...');
  server.kill();
  process.exit(0);
}, 10000);