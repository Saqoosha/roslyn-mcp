#!/usr/bin/env node

/**
 * Test our MCP wrapper with Unity project 
 * Compare with direct LSP test to isolate the issue
 */

import { spawn } from 'child_process';

const unityProjectRoot = '/Users/hiko/Documents/everies/everies';
const testFile = 'Assets/Scripts/Runtime/Every.cs';

console.log('🧪 Testing MCP Wrapper with Unity Project');
console.log('━'.repeat(50));
console.log(`📁 Project: ${unityProjectRoot}`);
console.log(`📄 Test File: ${testFile}`);
console.log('━'.repeat(50));

// Test our MCP server
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
let testPhase = 'ping';

// Send MCP requests
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
  
  console.log(`📤 Testing ${toolName}...`);
  mcp.stdin.write(JSON.stringify(request) + '\n');
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const elapsed = Date.now() - startTime;
      
      if (response.id) {
        handleMCPResponse(response, elapsed);
      }
    } catch (e) {
      // Ignore non-JSON output
    }
  }
});

mcp.stderr.on('data', (data) => {
  const logLine = data.toString().trim();
  
  if (logLine.includes('Background initialization completed')) {
    console.log(`🎉 MCP server ready! Starting tests...`);
    
    // Start test sequence
    setTimeout(() => {
      testPhase = 'hover';
      sendMCPRequest(1, 'hover', {
        filePath: testFile,
        line: 8,
        character: 20
      });
    }, 2000);
    
  } else if (logLine.includes('INFO:') || logLine.includes('Loading') || logLine.includes('solution')) {
    console.log(`📝 ${logLine}`);
  } else if (logLine.includes('ERROR') || logLine.includes('error')) {
    console.error(`🚨 ${logLine}`);
  }
});

function handleMCPResponse(response, elapsed) {
  const text = response.result?.content?.[0]?.text || '';
  
  switch (testPhase) {
    case 'hover':
      console.log(`\n🔍 Hover Test (${elapsed}ms):`);
      if (text.includes('hover information') || text.includes('Hover Information')) {
        console.log('✅ HOVER WORKING through MCP!');
        console.log('📋 Extract:', text.substring(0, 150) + '...');
      } else if (text.includes('No hover information')) {
        console.log('❌ No hover information (same as before)');
      } else if (text.includes('Document is null')) {
        console.log('❌ Document sync issue confirmed in MCP wrapper');
      } else {
        console.log('❓ Unexpected response:', text.substring(0, 100) + '...');
      }
      
      // Test workspace symbols next
      testPhase = 'workspace';
      setTimeout(() => {
        sendMCPRequest(2, 'workspaceSymbols', { query: 'Every' });
      }, 1000);
      break;
      
    case 'workspace':
      console.log(`\n🔍 Workspace Symbols Test (${elapsed}ms):`);
      if (text.includes('Found') && text.includes('symbol')) {
        console.log('✅ WORKSPACE SYMBOLS WORKING!');
        console.log('📋 Extract:', text.substring(0, 150) + '...');
      } else if (text.includes('No symbols found')) {
        console.log('❌ No workspace symbols (same as before)');
      } else {
        console.log('❓ Unexpected response:', text.substring(0, 100) + '...');
      }
      
      // Test definitions next
      testPhase = 'definitions';
      setTimeout(() => {
        sendMCPRequest(3, 'definitions', {
          filePath: testFile,
          line: 8,
          character: 20
        });
      }, 1000);
      break;
      
    case 'definitions':
      console.log(`\n🔍 Definitions Test (${elapsed}ms):`);
      if (text.includes('definition') && !text.includes('No definitions')) {
        console.log('✅ DEFINITIONS WORKING!');
        console.log('📋 Extract:', text.substring(0, 150) + '...');
      } else if (text.includes('No definitions found')) {
        console.log('❌ No definitions (same as before)');
      } else {
        console.log('❓ Unexpected response:', text.substring(0, 100) + '...');
      }
      
      console.log('\n🏁 MCP wrapper test completed!');
      setTimeout(() => {
        mcp.kill();
        process.exit(0);
      }, 2000);
      break;
  }
}

// Start with ping to make sure server is ready
setTimeout(() => {
  console.log('\n📡 Starting with ping test...');
  sendMCPRequest(0, 'ping', {});
}, 1000);

// Error handling
mcp.on('error', (error) => {
  console.error('❌ MCP server error:', error);
});

mcp.on('exit', (code, signal) => {
  console.log(`\n🔚 MCP server exited: code ${code}, signal ${signal}`);
});

// Timeout
setTimeout(() => {
  console.log('\n⏰ Test timeout');
  mcp.kill();
  process.exit(1);
}, 90000);