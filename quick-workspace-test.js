#!/usr/bin/env node

import { spawn } from 'child_process';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const CLI_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js';

let server = null;
let responses = [];
let currentId = 1;
let serverReady = false;

console.log('🔍 Quick workspace symbols isolation test...');

server = spawn('node', [CLI_PATH, PROJECT_ROOT], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'production' }
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  console.log('Server log:', output.trim());
  if (output.includes('MCP server started successfully')) {
    serverReady = true;
  }
});

server.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    responses.push(response);
  } catch (error) {
    // Ignore JSON parse errors
  }
});

async function sendRequest(method, params = {}) {
  const id = currentId++;
  const request = { jsonrpc: '2.0', method, params, id };
  server.stdin.write(JSON.stringify(request) + '\n');
  
  let response = null;
  const timeout = 5000;
  const start = Date.now();
  while (!response && Date.now() - start < timeout) {
    response = responses.find(r => r.id === id);
    if (!response) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  return response || { error: 'Timeout' };
}

async function runTest() {
  // Wait for server
  console.log('Waiting for server...');
  while (!serverReady) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('Server ready, waiting 10 seconds for indexing...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Initialize
  console.log('Initializing...');
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    clientInfo: { name: 'quick-test', version: '1.0.0' }
  });

  // Test workspace symbols
  console.log('Testing workspace symbols...');
  const result = await sendRequest('tools/call', {
    name: 'workspaceSymbols',
    arguments: { query: 'Calculator', maxResults: 25 }
  });

  console.log('Workspace symbols result:', JSON.stringify(result, null, 2));

  server.kill();
  process.exit(0);
}

runTest().catch(console.error);