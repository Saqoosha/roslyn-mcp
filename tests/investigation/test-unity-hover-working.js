#!/usr/bin/env node

/**
 * Test hover with Unity project where we know everything else works
 * This will confirm if hover works when all conditions are met
 */

import { spawn } from 'child_process';

const unityProjectRoot = '/Users/hiko/Documents/everies/everies';
const testFile = 'Assets/Scripts/Runtime/Every.cs';

console.log('🎯 Unity Hover Test - Waiting for FULL initialization');
console.log('━'.repeat(50));
console.log(`📁 Project: ${unityProjectRoot}`);
console.log(`📄 Test File: ${testFile}`);
console.log('⏳ Will wait for 100% completion before testing');
console.log('━'.repeat(50));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', unityProjectRoot,
  '--log-level', 'info'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client',
  env: { ...process.env, PROJECT_ROOT: unityProjectRoot }
});

const startTime = Date.now();
let fullInitComplete = false;

function sendHoverRequest() {
  const request = {
    jsonrpc: '2.0',
    id: 300,
    method: 'tools/call',
    params: {
      name: 'hover',
      arguments: {
        filePath: testFile,
        line: 8,
        character: 15  // Position on a known symbol
      }
    }
  };
  
  console.log(`📤 Testing hover after FULL initialization...`);
  mcp.stdin.write(JSON.stringify(request) + '\n');
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      
      if (response.id === 300) {
        const elapsed = Date.now() - startTime;
        const text = response.result?.content?.[0]?.text || '';
        
        console.log(`\n🔍 Unity Hover Result (${elapsed}ms):`);
        console.log('━'.repeat(60));
        
        if (text.includes('Hover Information')) {
          console.log('🎉 UNITY HOVER WORKING!');
          console.log('✅ This proves hover can work with proper initialization');
          console.log(`📋 Content preview: ${text.substring(0, 150)}...`);
        } else if (text.includes('No hover information')) {
          console.log('❌ Even Unity project shows no hover info');
          console.log('🔍 This suggests a deeper implementation issue');
        } else if (text.includes('LSP Status')) {
          console.log('⏳ LSP still not ready - need to wait longer');
          console.log(`📊 Status: ${text.substring(0, 100)}...`);
          
          // Try again in 10 seconds
          setTimeout(() => {
            console.log('\n🔄 Retrying hover after additional wait...');
            sendHoverRequest();
          }, 10000);
        } else {
          console.log('❓ Unexpected response:', text.substring(0, 100));
        }
        
        console.log('━'.repeat(60));
        
        if (!text.includes('LSP Status')) {
          // Exit if we got a definitive result
          setTimeout(() => {
            mcp.kill();
            process.exit(0);
          }, 2000);
        }
      }
    } catch (e) {
      // Ignore non-JSON output
    }
  }
});

// Monitor stderr for readiness signals
mcp.stderr.on('data', (data) => {
  const logLines = data.toString().trim().split('\n');
  
  for (const line of logLines) {
    const elapsed = Date.now() - startTime;
    
    if (line.includes('Background initialization completed')) {
      console.log(`🎉 [${elapsed}ms] Background init completed`);
    } else if (line.includes('Successfully completed load of') && line.includes('.cs')) {
      console.log(`📄 [${elapsed}ms] File loading: ${line.split('Successfully completed load of ')[1]}`);
      
      // Check if our test file was loaded
      if (line.includes('Every.cs')) {
        console.log(`✅ [${elapsed}ms] Our test file (Every.cs) is loaded!`);
        fullInitComplete = true;
        
        // Wait a bit more then test
        setTimeout(() => {
          console.log('\n🎯 Every.cs loaded - testing hover...');
          sendHoverRequest();
        }, 3000);
      }
    } else if (line.includes('ERROR') || line.includes('error')) {
      console.log(`🚨 [${elapsed}ms] ${line}`);
    }
  }
});

// Fallback test after 2 minutes if full init doesn't trigger
setTimeout(() => {
  if (!fullInitComplete) {
    console.log('\n⏰ 2 minutes passed - testing anyway...');
    sendHoverRequest();
  }
}, 120000);

// Error handling
mcp.on('error', (error) => {
  console.error('❌ MCP server error:', error);
});

mcp.on('exit', (code, signal) => {
  const elapsed = Date.now() - startTime;
  console.log(`\n🔚 MCP server exited at ${elapsed}ms: code ${code}, signal ${signal}`);
});

// Final timeout
setTimeout(() => {
  console.log('\n⏰ Final timeout after 3 minutes');
  mcp.kill();
  process.exit(1);
}, 180000);