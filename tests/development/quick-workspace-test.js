#!/usr/bin/env node

/**
 * Quick test of workspace symbols after Microsoft-compatible implementation
 */

import { spawn } from 'child_process';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('⚡ QUICK WORKSPACE SYMBOLS TEST');
console.log('━'.repeat(50));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', projectRoot,
  '--log-level', 'error'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client'
});

let initComplete = false;

mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  
  if (logText.includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Init complete');
    
    // Test workspace symbols after a reasonable delay
    setTimeout(() => {
      console.log('\n🔍 Testing workspace symbols...');
      testWorkspaceSymbols();
    }, 10000);
  }
});

function testWorkspaceSymbols() {
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'workspaceSymbols',
      arguments: { query: 'Every' }
    }
  };
  
  mcp.stdin.write(JSON.stringify(request) + '\n');
  
  setTimeout(() => {
    console.log('\n📊 Test completed');
    mcp.kill();
  }, 10000);
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      
      if (response.id === 1) {
        const text = response.result?.content?.[0]?.text || '';
        
        if (text.includes('Found') && text.includes('symbol')) {
          const match = text.match(/Found (\\d+) symbol/);
          const count = match ? match[1] : '?';
          console.log(`✅ SUCCESS: Found ${count} symbols for "Every"`);
        } else if (text.includes('No symbols found')) {
          console.log('❌ STILL FAILING: No symbols found');
        } else {
          console.log('❓ UNKNOWN RESPONSE:', text.substring(0, 100));
        }
      }
    } catch (e) {
      // Ignore non-JSON
    }
  }
});

mcp.on('exit', () => {
  console.log('🔚 Test done');
});

// 60 second timeout
setTimeout(() => {
  console.log('⏰ Timeout');
  mcp.kill();
}, 60000);