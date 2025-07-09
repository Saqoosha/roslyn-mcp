#!/usr/bin/env node

/**
 * Debug rename functionality with detailed error reporting
 */

import { spawn } from 'child_process';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const CLI_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js';

console.log('🔍 DEBUGGING RENAME FUNCTIONALITY');
console.log('='.repeat(40));

let server = null;
let serverReady = false;
let responses = [];
let currentId = 1;

server = spawn('node', [CLI_PATH, PROJECT_ROOT], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'production' }
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  console.log('🔧 Server:', output.trim());
  if (output.includes('MCP server started successfully')) {
    serverReady = true;
  }
});

server.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    responses.push(response);
  } catch (error) {
    // Ignore
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

async function debugRename() {
  // Wait for server
  while (!serverReady) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Initialize
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    clientInfo: { name: 'rename-debug', version: '1.0.0' }
  });

  console.log('\n🎯 Testing simple rename on Calculator class...\n');

  const result = await sendRequest('tools/call', {
    name: 'rename',
    arguments: {
      filePath: 'Program.cs',
      line: 6,        // public class Calculator
      character: 18,  // Position on "Calculator"
      newName: 'MyCalculator'
    }
  });

  console.log('📄 FULL RENAME RESPONSE:');
  console.log(JSON.stringify(result, null, 2));

  if (result && result.result?.content?.[0]?.text) {
    console.log('\n📝 FORMATTED RESPONSE:');
    console.log(result.result.content[0].text);
  }

  server.kill();
  process.exit(0);
}

debugRename().catch(console.error);