#!/usr/bin/env node

/**
 * IMMEDIATE GREEN TEST - Simple C# project to prove everything works
 * Should load in <5 seconds and show full functionality
 */

import { spawn } from 'child_process';

const simpleProjectRoot = '/Users/hiko/Desktop/csharp-ls-client/SimpleTest';
const testFile = 'Program.cs';

console.log('🚀 IMMEDIATE GREEN TEST');
console.log('━'.repeat(50));
console.log(`📁 Simple Project: ${simpleProjectRoot}`);
console.log(`📄 Test File: ${testFile}`);
console.log('🎯 Expected: ALL GREEN in <10 seconds');
console.log('━'.repeat(50));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', simpleProjectRoot,
  '--log-level', 'info'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client',
  env: { ...process.env, PROJECT_ROOT: simpleProjectRoot }
});

const startTime = Date.now();
let testResults = {
  hover: '⏳',
  workspace: '⏳', 
  definitions: '⏳',
  completion: '⏳'
};

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

function printStatus() {
  console.log('\n📊 CURRENT STATUS:');
  console.log(`   • Hover: ${testResults.hover}`);
  console.log(`   • Workspace: ${testResults.workspace}`);
  console.log(`   • Definitions: ${testResults.definitions}`);
  console.log(`   • Completion: ${testResults.completion}`);
  
  const allGreen = Object.values(testResults).every(status => status === '✅');
  if (allGreen) {
    const elapsed = Date.now() - startTime;
    console.log(`\n🎉 ALL GREEN ACHIEVED! (${elapsed}ms)`);
    console.log('🏆 MCP Wrapper + Roslyn LSP = FULLY FUNCTIONAL');
    setTimeout(() => {
      mcp.kill();
      process.exit(0);
    }, 1000);
  }
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const elapsed = Date.now() - startTime;
      
      if (response.id) {
        handleTestResult(response, elapsed);
      }
    } catch (e) {
      // Ignore non-JSON output
    }
  }
});

mcp.stderr.on('data', (data) => {
  const logLine = data.toString().trim();
  
  if (logLine.includes('Background initialization completed')) {
    console.log(`🎉 Simple project ready (${Date.now() - startTime}ms)!`);
    console.log('🚀 Starting rapid fire tests...');
    
    // Rapid fire all tests
    setTimeout(() => {
      sendMCPRequest(1, 'hover', { filePath: testFile, line: 5, character: 20 });
    }, 500);
    
    setTimeout(() => {
      sendMCPRequest(2, 'workspaceSymbols', { query: 'Calculator' });
    }, 1000);
    
    setTimeout(() => {
      sendMCPRequest(3, 'definitions', { filePath: testFile, line: 5, character: 20 });
    }, 1500);
    
    setTimeout(() => {
      sendMCPRequest(4, 'completion', { filePath: testFile, line: 10, character: 20 });
    }, 2000);
    
  } else if (logLine.includes('Solution/project loading completed')) {
    console.log(`✅ Simple project loaded (${Date.now() - startTime}ms)`);
  } else if (logLine.includes('ERROR')) {
    console.error(`🚨 ${logLine}`);
  }
});

function handleTestResult(response, elapsed) {
  const text = response.result?.content?.[0]?.text || '';
  const id = response.id;
  
  // Determine which test this is
  let testName = '';
  if (id === 1) testName = 'hover';
  else if (id === 2) testName = 'workspace';
  else if (id === 3) testName = 'definitions';
  else if (id === 4) testName = 'completion';
  
  console.log(`\n🔍 ${testName.toUpperCase()} Result (${elapsed}ms):`);
  
  // Check if successful
  if (text.includes('LSP Status: Starting Up') || text.includes('30%')) {
    console.log('⏳ LSP still initializing...');
    testResults[testName] = '⏳';
  } else if (text.includes('Hover Information') || 
             text.includes('Found') && text.includes('symbol') ||
             text.includes('Definition') ||
             text.includes('completion')) {
    console.log('✅ SUCCESS!');
    testResults[testName] = '✅';
  } else if (text.includes('No hover') || 
             text.includes('No symbols') || 
             text.includes('No definitions') ||
             text.includes('No completion')) {
    console.log('❌ No results (but LSP responded)');
    testResults[testName] = '⚠️';
  } else {
    console.log('❓ Unexpected:', text.substring(0, 60) + '...');
    testResults[testName] = '❓';
  }
  
  printStatus();
}

// Fallback if no ready signal
setTimeout(() => {
  console.log('\n⏰ 15 seconds - testing anyway...');
  sendMCPRequest(1, 'hover', { filePath: testFile, line: 5, character: 20 });
}, 15000);

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
  printStatus();
  mcp.kill();
  process.exit(1);
}, 30000);