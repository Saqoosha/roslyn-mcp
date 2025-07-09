#!/usr/bin/env node

/**
 * Debug document synchronization in our MCP implementation
 * Check if didOpen is properly called and tracked
 */

import { spawn } from 'child_process';

const unityProjectRoot = '/Users/hiko/Documents/everies/everies';
const testFile = 'Assets/Scripts/Runtime/Every.cs';

console.log('🔍 Debugging Document Synchronization');
console.log('━'.repeat(50));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', unityProjectRoot,
  '--log-level', 'debug'  // Enable debug logging
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client',
  env: { ...process.env, PROJECT_ROOT: unityProjectRoot }
});

const startTime = Date.now();
let serverReady = false;

function sendMCPRequest(id, toolName, args) {
  const request = {
    jsonrpc: '2.0',
    id: id,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  };
  
  console.log(`📤 Testing ${toolName} with debug logging...`);
  mcp.stdin.write(JSON.stringify(request) + '\n');
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const elapsed = Date.now() - startTime;
      
      if (response.id === 1) {
        console.log(`\n🔍 Hover Debug Result (${elapsed}ms):`);
        const text = response.result?.content?.[0]?.text || '';
        
        if (text.includes('Document is null')) {
          console.log('❌ CONFIRMED: Document is null - didOpen failed');
        } else if (text.includes('No hover information')) {
          console.log('❌ Document opened but no hover data (different issue)');
        } else if (text.includes('hover')) {
          console.log('✅ SUCCESS: Hover working!');
        } else {
          console.log('❓ Unexpected response:', text.substring(0, 100));
        }
        
        console.log('\n📋 Full response:');
        console.log(JSON.stringify(response, null, 2));
        
        // Exit after first test
        setTimeout(() => {
          mcp.kill();
          process.exit(0);
        }, 2000);
      }
    } catch (e) {
      // Ignore non-JSON output
    }
  }
});

// Capture ALL stderr for debugging
mcp.stderr.on('data', (data) => {
  const logLines = data.toString().trim().split('\n');
  
  for (const line of logLines) {
    // Look for document-related operations
    if (line.includes('textDocument/didOpen') || 
        line.includes('openDocument') || 
        line.includes('isDocumentOpen') ||
        line.includes('Document already open') ||
        line.includes('Opened document')) {
      console.log(`📄 DOC: ${line}`);
    } else if (line.includes('Background initialization completed')) {
      console.log(`🎉 Server ready - waiting 10 seconds then testing...`);
      serverReady = true;
      
      // Wait longer for full initialization
      setTimeout(() => {
        sendMCPRequest(1, 'hover', {
          filePath: testFile,
          line: 8,
          character: 20
        });
      }, 10000);
    } else if (line.includes('DEBUG:') || line.includes('debug')) {
      console.log(`🐛 ${line}`);
    } else if (line.includes('ERROR') || line.includes('error')) {
      console.error(`🚨 ${line}`);
    } else if (line.includes('WARN') || line.includes('warn')) {
      console.log(`⚠️  ${line}`);
    }
  }
});

// Manual trigger if server doesn't signal ready
setTimeout(() => {
  if (!serverReady) {
    console.log('\n⏰ 30 seconds passed - testing anyway...');
    sendMCPRequest(1, 'hover', {
      filePath: testFile,
      line: 8,
      character: 20
    });
  }
}, 30000);

// Error handling
mcp.on('error', (error) => {
  console.error('❌ MCP server error:', error);
});

mcp.on('exit', (code, signal) => {
  console.log(`\n🔚 MCP server exited: code ${code}, signal ${signal}`);
});

// Final timeout
setTimeout(() => {
  console.log('\n⏰ Final timeout');
  mcp.kill();
  process.exit(1);
}, 60000);