#!/usr/bin/env node

/**
 * Test Unity.Logging diagnostics with new recursive discovery
 */

import { spawn } from 'child_process';

const everiesProjectRoot = '/Users/hiko/Documents/everies/everies';
console.log('🧪 Testing Unity.Logging diagnostics with recursive discovery...\n');

const server = spawn('node', [
  'roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', everiesProjectRoot,
  '--log-level', 'info'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client',
  env: { ...process.env, PROJECT_ROOT: everiesProjectRoot }
});

let serverReady = false;
const startTime = Date.now();

// Test sequence
const tests = [
  { 
    name: 'Server Initialization', 
    request: { "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": { "capabilities": {} } }
  },
  { 
    name: 'Wait for Background Init', 
    delay: 8000 // Wait 8 seconds for background initialization to complete
  },
  { 
    name: 'Unity.Logging Diagnostics Test', 
    request: { 
      "jsonrpc": "2.0", 
      "id": 2, 
      "method": "tools/call", 
      "params": { 
        "name": "diagnostics", 
        "arguments": { 
          "filePath": "Assets/Scripts/Runtime/Every.cs" 
        } 
      } 
    }
  },
  { 
    name: 'Unity Workspace Symbols Test', 
    request: { 
      "jsonrpc": "2.0", 
      "id": 3, 
      "method": "tools/call", 
      "params": { 
        "name": "workspaceSymbols", 
        "arguments": { 
          "query": "Log",
          "maxResults": 10
        } 
      } 
    }
  },
  { 
    name: 'MonoBehaviour Test', 
    request: { 
      "jsonrpc": "2.0", 
      "id": 4, 
      "method": "tools/call", 
      "params": { 
        "name": "workspaceSymbols", 
        "arguments": { 
          "query": "MonoBehaviour",
          "maxResults": 5
        } 
      } 
    }
  }
];

let currentTest = 0;
let responses = [];

server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const elapsed = Date.now() - startTime;
      
      if (response.id) {
        const test = tests[response.id - 1];
        console.log(`✅ ${test?.name || 'Test'} completed in ${elapsed}ms`);
        
        if (response.result?.content?.[0]?.text) {
          const text = response.result.content[0].text;
          
          // Check for specific Unity.Logging results
          if (text.includes('The name \'Log\' does not exist')) {
            console.log(`   ❌ Unity.Logging still not resolved`);
          } else if (text.includes('CS0103') && text.includes('Log')) {
            console.log(`   ❌ Unity.Logging errors persist`);
          } else if (text.includes('Found') && text.includes('symbols')) {
            console.log(`   ✅ Symbol search working`);
          } else if (text.includes('No symbols found') && text.includes('Log')) {
            console.log(`   ⚠️  Log symbols not found in workspace`);
          } else if (text.includes('MonoBehaviour')) {
            console.log(`   ✅ Found Unity MonoBehaviour symbols!`);
          } else {
            console.log(`   📊 Response: ${text.substring(0, 100)}...`);
          }
        }
        
        responses.push({ test: test?.name, elapsed, response });
      }
    } catch (e) {
      // Ignore non-JSON output
    }
  }
});

server.stderr.on('data', (data) => {
  const logLine = data.toString().trim();
  if (logLine.includes('Unity.Logging') || logLine.includes('MonoBehaviour') || 
      logLine.includes('Solution files:') || logLine.includes('Found') && logLine.includes('project')) {
    console.log('📝', logLine);
  }
});

// Send tests with delays
setTimeout(() => {
  console.log('📡 Sending initialization request...');
  server.stdin.write(JSON.stringify(tests[0].request) + '\n');
}, 100);

setTimeout(() => {
  console.log('⏳ Waiting for background initialization...');
}, 1000);

setTimeout(() => {
  console.log('📡 Testing Unity.Logging diagnostics...');
  server.stdin.write(JSON.stringify(tests[2].request) + '\n');
}, 9000);

setTimeout(() => {
  console.log('📡 Testing Unity workspace symbols (Log)...');
  server.stdin.write(JSON.stringify(tests[3].request) + '\n');
}, 10000);

setTimeout(() => {
  console.log('📡 Testing Unity workspace symbols (MonoBehaviour)...');
  server.stdin.write(JSON.stringify(tests[4].request) + '\n');
}, 11000);

// Cleanup after 20 seconds
setTimeout(() => {
  console.log('\n📊 Test Summary:');
  responses.forEach(r => {
    console.log(`   ${r.test}: ${r.elapsed}ms`);
  });
  
  console.log('\n✅ Unity.Logging diagnostic test completed');
  server.kill();
  process.exit(0);
}, 20000);

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});