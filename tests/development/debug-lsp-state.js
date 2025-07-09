#!/usr/bin/env node

/**
 * Debug LSP state - check if process is running or exiting
 */

import { spawn } from 'child_process';

const simpleProjectRoot = '/Users/hiko/Desktop/csharp-ls-client/SimpleTest';

console.log('🔍 LSP State Debug');
console.log('━'.repeat(40));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', simpleProjectRoot,
  '--log-level', 'debug'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client',
  env: { ...process.env, PROJECT_ROOT: simpleProjectRoot }
});

const startTime = Date.now();

function sendStatusRequest() {
  const request = {
    jsonrpc: '2.0',
    id: 99,
    method: 'tools/call',
    params: {
      name: 'ping',
      arguments: {}
    }
  };
  
  console.log(`📤 Requesting status...`);
  mcp.stdin.write(JSON.stringify(request) + '\n');
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      
      if (response.id === 99) {
        const elapsed = Date.now() - startTime;
        const text = response.result?.content?.[0]?.text || '';
        
        console.log(`\n📊 Status at ${elapsed}ms:`);
        console.log(text);
        
        // Check for LSP running status
        if (text.includes('Ready for C# development') || text.includes('100%')) {
          console.log('🎉 LSP IS RUNNING!');
          
          // Now test actual functionality
          setTimeout(() => {
            const hoverRequest = {
              jsonrpc: '2.0',
              id: 100,
              method: 'tools/call',
              params: {
                name: 'hover',
                arguments: {
                  filePath: 'Program.cs',
                  line: 5,
                  character: 20
                }
              }
            };
            
            console.log('📤 Testing hover with running LSP...');
            mcp.stdin.write(JSON.stringify(hoverRequest) + '\n');
          }, 1000);
        }
      } else if (response.id === 100) {
        const elapsed = Date.now() - startTime;
        const text = response.result?.content?.[0]?.text || '';
        
        console.log(`\n🔍 Hover result at ${elapsed}ms:`);
        if (text.includes('Hover Information')) {
          console.log('🎉 HOVER WORKING! Full green achieved!');
        } else {
          console.log('❌ Hover issue:', text.substring(0, 100));
        }
        
        // Exit after successful test
        setTimeout(() => {
          mcp.kill();
          process.exit(0);
        }, 1000);
      }
    } catch (e) {
      // Ignore non-JSON output
    }
  }
});

// Monitor stderr for LSP process events
mcp.stderr.on('data', (data) => {
  const logLines = data.toString().trim().split('\n');
  
  for (const line of logLines) {
    const elapsed = Date.now() - startTime;
    
    if (line.includes('LSP process started')) {
      console.log(`✅ [${elapsed}ms] LSP process started`);
    } else if (line.includes('isRunning = true')) {
      console.log(`✅ [${elapsed}ms] isRunning set to TRUE`);
    } else if (line.includes('LSP process exited') || line.includes('isRunning = false')) {
      console.log(`❌ [${elapsed}ms] LSP process EXITED or isRunning=false`);
      console.log(`   Details: ${line}`);
    } else if (line.includes('Roslyn LSP client started successfully')) {
      console.log(`🎉 [${elapsed}ms] LSP FULLY READY! Requesting status...`);
      setTimeout(() => sendStatusRequest(), 500);
    } else if (line.includes('Background initialization completed')) {
      console.log(`🎉 [${elapsed}ms] Background init completed`);
      setTimeout(() => sendStatusRequest(), 500);
    } else if (line.includes('ERROR') || line.includes('error')) {
      console.log(`🚨 [${elapsed}ms] ${line}`);
    } else if (line.includes('DEBUG') && (line.includes('Running') || line.includes('ready'))) {
      console.log(`🔧 [${elapsed}ms] ${line}`);
    }
  }
});

// Send first status request after startup
setTimeout(() => {
  console.log('\n📡 Sending initial status request...');
  sendStatusRequest();
}, 5000);

// Send periodic status requests
const statusInterval = setInterval(() => {
  sendStatusRequest();
}, 10000);

// Error handling
mcp.on('error', (error) => {
  console.error('❌ MCP server error:', error);
});

mcp.on('exit', (code, signal) => {
  const elapsed = Date.now() - startTime;
  console.log(`\n🔚 MCP server exited at ${elapsed}ms: code ${code}, signal ${signal}`);
  clearInterval(statusInterval);
});

// Final timeout
setTimeout(() => {
  console.log('\n⏰ Final timeout - checking final status');
  sendStatusRequest();
  setTimeout(() => {
    clearInterval(statusInterval);
    mcp.kill();
    process.exit(1);
  }, 2000);
}, 45000);