#!/usr/bin/env node

/**
 * Test multiple tools after FULL initialization 
 */

import { spawn } from 'child_process';

const unityProjectRoot = '/Users/hiko/Documents/everies/everies';

console.log('🎯 Testing Multiple Tools After Full Initialization');
console.log('━'.repeat(60));
console.log(`📁 Project: ${unityProjectRoot}`);
console.log('━'.repeat(60));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', unityProjectRoot,
  '--log-level', 'error'  // Reduce noise
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client',
  env: { ...process.env, PROJECT_ROOT: unityProjectRoot }
});

const startTime = Date.now();
let testQueue = [];
let currentTestId = 0;

// Test queue - will run after initialization
const tests = [
  {
    name: 'Workspace Symbols',
    id: 100,
    tool: 'workspaceSymbols',
    args: { query: 'Log' }
  },
  {
    name: 'Document Symbols', 
    id: 101,
    tool: 'documentSymbols',
    args: { filePath: 'Assets/Scripts/Runtime/Every.cs' }
  },
  {
    name: 'Definitions',
    id: 102, 
    tool: 'definitions',
    args: { filePath: 'Assets/Scripts/Runtime/Every.cs', line: 8, character: 15 }
  },
  {
    name: 'References',
    id: 103,
    tool: 'references', 
    args: { filePath: 'Assets/Scripts/Runtime/Every.cs', line: 8, character: 15 }
  },
  {
    name: 'Diagnostics',
    id: 104,
    tool: 'diagnostics',
    args: { filePath: 'Assets/Scripts/Runtime/Every.cs' }
  }
];

// Wait for background initialization
mcp.stderr.on('data', (data) => {
  const logLines = data.toString().trim().split('\n');
  
  for (const line of logLines) {
    if (line.includes('Background initialization completed')) {
      const elapsed = Date.now() - startTime;
      console.log(`🎉 [${elapsed}ms] Background initialization completed!`);
      
      // Wait additional 5 seconds then start testing
      setTimeout(() => {
        console.log('\n🧪 Starting comprehensive tool testing...\n');
        runNextTest();
      }, 5000);
    }
  }
});

function runNextTest() {
  if (currentTestId >= tests.length) {
    console.log('\n🎉 All tests completed!');
    setTimeout(() => {
      mcp.kill();
      process.exit(0);
    }, 2000);
    return;
  }
  
  const test = tests[currentTestId];
  console.log(`🔬 Testing: ${test.name}`);
  
  const request = {
    jsonrpc: '2.0',
    id: test.id,
    method: 'tools/call',
    params: {
      name: test.tool,
      arguments: test.args
    }
  };
  
  mcp.stdin.write(JSON.stringify(request) + '\n');
  
  // Move to next test after timeout
  setTimeout(() => {
    if (currentTestId < tests.length) {
      console.log(`⏰ ${test.name} timed out, moving to next test\n`);
      currentTestId++;
      runNextTest();
    }
  }, 10000); // 10 second timeout per test
}

// Handle tool responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      
      // Find matching test
      const test = tests.find(t => t.id === response.id);
      if (!test) continue;
      
      const elapsed = Date.now() - startTime;
      const text = response.result?.content?.[0]?.text || '';
      
      console.log(`📊 ${test.name} Result (${elapsed}ms):`);
      
      if (text.includes('C# Language Server Initializing')) {
        console.log('❌ LSP still not ready');
      } else if (text.includes('No') && text.includes('found')) {
        console.log('⚠️ No results found (may be normal)');
      } else if (text.includes('Error') || text.includes('Failed')) {
        console.log('❌ Tool returned error');
        console.log(`   ${text.substring(0, 100)}...`);
      } else if (text.length > 50) {
        console.log('✅ Tool returned data');
        console.log(`   Preview: ${text.substring(0, 100)}...`);
      } else {
        console.log('❓ Minimal response');
        console.log(`   Response: ${text}`);
      }
      
      console.log(''); // Empty line
      
      // Move to next test
      currentTestId++;
      setTimeout(() => runNextTest(), 1000);
      
    } catch (e) {
      // Ignore non-JSON output
    }
  }
});

// Fallback timeout
setTimeout(() => {
  console.log('\n⏰ Overall test timeout');
  mcp.kill();
  process.exit(1);
}, 180000); // 3 minute timeout

// Error handling
mcp.on('error', (error) => {
  console.error('❌ MCP server error:', error);
});

mcp.on('exit', (code, signal) => {
  const elapsed = Date.now() - startTime;
  console.log(`\n🔚 Test completed at ${elapsed}ms: code ${code}, signal ${signal}`);
});