#!/usr/bin/env node

/**
 * Test when Unity project initialization actually completes
 */

import { spawn } from 'child_process';

const everiesProjectRoot = '/Users/hiko/Documents/everies/everies';
console.log('🧪 Testing Unity project initialization completion timing...\n');

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

const startTime = Date.now();
let initializationComplete = false;

server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      if (response.result?.content?.[0]?.text) {
        const text = response.result.content[0].text;
        if (!text.includes('Starting LSP client') && !text.includes('30%')) {
          const elapsed = Date.now() - startTime;
          console.log(`✅ LSP seems ready at ${elapsed}ms: ${text.substring(0, 80)}...`);
          
          // Test diagnostics now
          setTimeout(() => {
            server.stdin.write(JSON.stringify({
              "jsonrpc": "2.0", 
              "id": 99, 
              "method": "tools/call", 
              "params": { 
                "name": "diagnostics", 
                "arguments": { 
                  "filePath": "Assets/Scripts/Runtime/Every.cs" 
                } 
              }
            }) + '\n');
          }, 1000);
        }
      }
    } catch (e) {
      // Ignore non-JSON output
    }
  }
});

server.stderr.on('data', (data) => {
  const logLine = data.toString().trim();
  const elapsed = Date.now() - startTime;
  
  if (logLine.includes('Background initialization completed')) {
    console.log(`🎉 Background initialization completed at ${elapsed}ms!`);
    initializationComplete = true;
    
    // Wait a bit then test diagnostics
    setTimeout(() => {
      console.log('📡 Testing diagnostics after completion...');
      server.stdin.write(JSON.stringify({
        "jsonrpc": "2.0", 
        "id": 100, 
        "method": "tools/call", 
        "params": { 
          "name": "diagnostics", 
          "arguments": { 
            "filePath": "Assets/Scripts/Runtime/Every.cs" 
          } 
        }
      }) + '\n');
    }, 2000);
  } else if (logLine.includes('INFO:')) {
    console.log(`📝 [${Math.floor(elapsed/1000)}s] ${logLine}`);
  }
});

// Send initial ping to start the server
setTimeout(() => {
  console.log('📡 Starting server with ping...');
  server.stdin.write(JSON.stringify({
    "jsonrpc": "2.0", 
    "id": 1, 
    "method": "tools/call", 
    "params": { 
      "name": "ping", 
      "arguments": {} 
    }
  }) + '\n');
}, 1000);

// Keep testing ping every 10 seconds to see when it's ready
const pingInterval = setInterval(() => {
  if (!initializationComplete) {
    const elapsed = Date.now() - startTime;
    console.log(`📡 [${Math.floor(elapsed/1000)}s] Checking server status...`);
    server.stdin.write(JSON.stringify({
      "jsonrpc": "2.0", 
      "id": 2, 
      "method": "tools/call", 
      "params": { 
        "name": "ping", 
        "arguments": {} 
      }
    }) + '\n');
  }
}, 10000);

// Cleanup after 60 seconds
setTimeout(() => {
  clearInterval(pingInterval);
  if (initializationComplete) {
    console.log('\n✅ Unity project initialization test completed successfully');
  } else {
    console.log('\n⏳ Unity project still initializing after 60 seconds');
  }
  server.kill();
  process.exit(0);
}, 60000);

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});