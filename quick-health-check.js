#!/usr/bin/env node

/**
 * Quick health check for roslyn-lsp
 */

import { spawn } from 'child_process';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const CLI_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js';

console.log('🏥 ROSLYN-LSP HEALTH CHECK');
console.log('='.repeat(40));

let server = null;
let serverReady = false;
let responses = [];
let currentId = 1;
let errors = [];
let warnings = [];

server = spawn('node', [CLI_PATH, PROJECT_ROOT], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'production' }
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  
  // Capture errors and warnings
  if (output.includes('ERROR') || output.includes('error')) {
    errors.push(output.trim());
  }
  if (output.includes('WARN') || output.includes('warn')) {
    warnings.push(output.trim());
  }
  
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

async function runHealthCheck() {
  // Wait for server
  while (!serverReady) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  await new Promise(resolve => setTimeout(resolve, 8000)); // Wait for full initialization

  // Initialize
  await sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    clientInfo: { name: 'health-check', version: '1.0.0' }
  });

  // Test key functionalities
  const tests = [
    {
      name: 'Document Symbols',
      request: () => sendRequest('tools/call', {
        name: 'documentSymbols',
        arguments: { filePath: 'Program.cs' }
      })
    },
    {
      name: 'Hover',
      request: () => sendRequest('tools/call', {
        name: 'hover',
        arguments: { filePath: 'Program.cs', line: 9, character: 21 }
      })
    },
    {
      name: 'Workspace Symbols',
      request: () => sendRequest('tools/call', {
        name: 'workspaceSymbols',
        arguments: { query: 'Program' }
      })
    },
    {
      name: 'Diagnostics',
      request: () => sendRequest('tools/call', {
        name: 'diagnostics',
        arguments: { filePath: 'Program.cs' }
      })
    }
  ];

  console.log('🧪 Running core functionality tests...\n');
  
  let successCount = 0;
  
  for (const test of tests) {
    try {
      const result = await test.request();
      const success = result && !result.error && result.result;
      
      console.log(`${success ? '✅' : '❌'} ${test.name}: ${success ? 'OK' : 'FAILED'}`);
      if (success) successCount++;
      
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }

  // Generate health report
  console.log('\n🏥 HEALTH REPORT');
  console.log('='.repeat(30));
  console.log(`✅ Tests passed: ${successCount}/${tests.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`❌ Errors: ${errors.length}`);
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Recent warnings:');
    warnings.slice(-3).forEach(w => console.log(`   ${w}`));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Recent errors:');
    errors.slice(-3).forEach(e => console.log(`   ${e}`));
  }
  
  const healthScore = (successCount / tests.length) * 100;
  console.log(`\n🎯 Health Score: ${healthScore.toFixed(1)}%`);
  
  if (healthScore >= 75) {
    console.log('🟢 Status: HEALTHY');
  } else if (healthScore >= 50) {
    console.log('🟡 Status: DEGRADED');
  } else {
    console.log('🔴 Status: UNHEALTHY');
  }

  server.kill();
  process.exit(0);
}

runHealthCheck().catch((error) => {
  console.error('❌ Health check failed:', error);
  server?.kill();
  process.exit(1);
});