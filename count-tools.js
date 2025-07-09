#!/usr/bin/env node

/**
 * Count and list all MCP tools
 */

import { spawn } from 'child_process';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const CLI_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js';

console.log('🔧 COUNTING MCP TOOLS');
console.log('='.repeat(30));

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
  const timeout = 3000;
  const start = Date.now();
  while (!response && Date.now() - start < timeout) {
    response = responses.find(r => r.id === id);
    if (!response) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  return response || { error: 'Timeout' };
}

async function countTools() {
  // Wait for server
  while (!serverReady) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Initialize
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    clientInfo: { name: 'tool-counter', version: '1.0.0' }
  });

  // List tools
  const toolsResult = await sendRequest('tools/list');
  
  if (toolsResult && toolsResult.result?.tools) {
    const tools = toolsResult.result.tools;
    console.log(`🎯 TOTAL TOOLS: ${tools.length}\n`);
    
    console.log('📋 TOOL LIST:');
    tools.forEach((tool, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${tool.name.padEnd(20)} - ${tool.description}`);
    });
    
    console.log(`\n✅ MCP server exposes ${tools.length} tools`);
  } else {
    console.log('❌ Failed to get tools list');
  }

  server.kill();
  process.exit(0);
}

countTools().catch((error) => {
  console.error('❌ Tool counting failed:', error);
  server?.kill();
  process.exit(1);
});