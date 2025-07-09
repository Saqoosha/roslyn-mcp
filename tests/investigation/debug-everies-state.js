#!/usr/bin/env node

/**
 * Debug everies project internal state with full logging
 */

import { spawn } from 'child_process';
import fs from 'fs';

const projectRoot = '/Users/hiko/Documents/everies/everies';
const logFile = '/tmp/roslyn-mcp-debug.log';

console.log('🔍 Debugging Everies Project Internal State');
console.log('━'.repeat(60));
console.log(`📁 Project: ${projectRoot}`);
console.log(`📋 Log file: ${logFile}`);
console.log('━'.repeat(60));

// Clear previous log
if (fs.existsSync(logFile)) {
  fs.unlinkSync(logFile);
}

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', projectRoot,
  '--log-level', 'debug'  // FULL DEBUG LOGGING
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client'
});

let logData = '';
const startTime = Date.now();
let backgroundComplete = false;

// Capture ALL stderr (debug logs)
mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  logData += logText;
  
  // Write to log file immediately
  fs.appendFileSync(logFile, logText);
  
  // Check for key events
  if (logText.includes('Background initialization completed')) {
    backgroundComplete = true;
    console.log('✅ Background initialization completed');
    
    // Wait then test multiple scenarios
    setTimeout(() => {
      console.log('\n🧪 Testing multiple scenarios...');
      runTestSequence();
    }, 5000);
  }
});

function runTestSequence() {
  const tests = [
    // 1. Test hover with MainController.cs (from test report)
    {
      id: 300,
      name: 'hover-maincontroller',
      request: {
        jsonrpc: '2.0',
        id: 300,
        method: 'tools/call',
        params: {
          name: 'hover',
          arguments: {
            filePath: 'Assets/Scripts/Runtime/MainController.cs',
            line: 50,
            character: 15
          }
        }
      }
    },
    // 2. Test hover with Every.cs (from test report)
    {
      id: 301,
      name: 'hover-every',
      request: {
        jsonrpc: '2.0',
        id: 301,
        method: 'tools/call',
        params: {
          name: 'hover',
          arguments: {
            filePath: 'Assets/Scripts/Runtime/Every.cs',
            line: 100,
            character: 20
          }
        }
      }
    },
    // 3. Test definitions
    {
      id: 302,
      name: 'definitions',
      request: {
        jsonrpc: '2.0',
        id: 302,
        method: 'tools/call',
        params: {
          name: 'definitions',
          arguments: {
            filePath: 'Assets/Scripts/Runtime/MainController.cs',
            line: 337,
            character: 15
          }
        }
      }
    },
    // 4. Test workspace symbols
    {
      id: 303,
      name: 'workspace-symbols',
      request: {
        jsonrpc: '2.0',
        id: 303,
        method: 'tools/call',
        params: {
          name: 'workspaceSymbols',
          arguments: {
            query: 'MainController'
          }
        }
      }
    },
    // 5. Test document symbols (this works)
    {
      id: 304,
      name: 'document-symbols',
      request: {
        jsonrpc: '2.0',
        id: 304,
        method: 'tools/call',
        params: {
          name: 'documentSymbols',
          arguments: {
            filePath: 'Assets/Scripts/Runtime/MainController.cs'
          }
        }
      }
    }
  ];
  
  // Send all tests with 2-second intervals
  tests.forEach((test, index) => {
    setTimeout(() => {
      console.log(`📤 Sending ${test.name} test...`);
      mcp.stdin.write(JSON.stringify(test.request) + '\n');
    }, index * 2000);
  });
  
  // Close after all tests
  setTimeout(() => {
    console.log('\n📊 All tests sent. Analyzing results...');
    setTimeout(() => {
      mcp.kill();
    }, 5000);
  }, tests.length * 2000 + 10000);
}

// Handle responses with detailed analysis
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const elapsed = Date.now() - startTime;
      
      if (response.id >= 300) {
        const testName = ['hover-maincontroller', 'hover-every', 'definitions', 'workspace-symbols', 'document-symbols'][response.id - 300];
        const text = response.result?.content?.[0]?.text || 'No content';
        
        console.log(`\n📊 ${testName.toUpperCase()} Result (${elapsed}ms):`);
        console.log('═'.repeat(50));
        
        if (text.includes('No hover information') || text.includes('No definitions') || text.includes('No symbols found')) {
          console.log('❌ FAILED: No results found');
          console.log(`💡 Response: ${text.substring(0, 150)}...`);
        } else if (text.includes('C# Language Server Initializing')) {
          console.log('⚠️ WARNING: LSP still not ready');
        } else if (text.length > 100) {
          console.log('✅ SUCCESS: Got results');
          console.log(`📋 Preview: ${text.substring(0, 200)}...`);
        } else {
          console.log('❓ UNCLEAR: Minimal response');
          console.log(`📋 Full: ${text}`);
        }
      }
    } catch (e) {
      // Ignore non-JSON
    }
  }
});

// Error handling
mcp.on('error', (error) => {
  console.error('❌ MCP Error:', error);
  fs.appendFileSync(logFile, `ERROR: ${error}\n`);
});

mcp.on('exit', (code, signal) => {
  const elapsed = Date.now() - startTime;
  console.log(`\n🔚 Debug session completed (${elapsed}ms)`);
  console.log(`📋 Full debug log saved to: ${logFile}`);
  
  // Show log file size
  const stats = fs.statSync(logFile);
  console.log(`📊 Log file size: ${(stats.size / 1024).toFixed(1)}KB`);
  
  console.log('\n🔍 Key areas to investigate in the log:');
  console.log('• LSP initialization messages');
  console.log('• Document open/sync operations');
  console.log('• Workspace symbol indexing');
  console.log('• Project loading completion');
  console.log('• Error messages during hover/definitions');
});

// Timeout safety
setTimeout(() => {
  console.log('\n⏰ Debug session timeout');
  mcp.kill();
}, 180000); // 3 minutes