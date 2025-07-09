#!/usr/bin/env node

/**
 * Test MCP wrapper with proper timing - wait for Unity project fully loaded
 */

import { spawn } from 'child_process';

const unityProjectRoot = '/Users/hiko/Documents/everies/everies';
const testFile = 'Assets/Scripts/Runtime/Every.cs';

console.log('⏰ Testing MCP with Proper Timing');
console.log('━'.repeat(50));
console.log(`📁 Project: ${unityProjectRoot}`);
console.log(`📄 Test File: ${testFile}`);
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
let testPhase = 'waiting';
let projectLoadingComplete = false;
let fileLoadingComplete = false;

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

function checkReadiness() {
  if (projectLoadingComplete && fileLoadingComplete && testPhase === 'waiting') {
    console.log('\n🎯 Both project and file loading complete - starting tests!');
    testPhase = 'hover';
    sendMCPRequest(1, 'hover', {
      filePath: testFile,
      line: 8,
      character: 20
    });
  }
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const elapsed = Date.now() - startTime;
      
      if (response.id && testPhase !== 'waiting') {
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
    console.log(`🎉 MCP server ready!`);
  } else if (logLine.includes('Solution/project loading completed')) {
    const elapsed = Date.now() - startTime;
    console.log(`✅ Project loading completed (${elapsed}ms)`);
    projectLoadingComplete = true;
    checkReadiness();
  } else if (logLine.includes('Successfully completed load of') && logLine.includes('Every.cs')) {
    const elapsed = Date.now() - startTime;
    console.log(`✅ Every.cs file loaded (${elapsed}ms)`);
    fileLoadingComplete = true;
    checkReadiness();
  } else if (logLine.includes('unresolved dependencies')) {
    console.log(`⚠️  Dependencies issue: ${logLine}`);
  } else if (logLine.includes('INFO:') && (logLine.includes('Loading') || logLine.includes('solution'))) {
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
      if (text.includes('Hover Information') || (text.includes('hover') && !text.includes('No hover'))) {
        console.log('🎉 HOVER WORKING with proper timing!');
        console.log('📋 Content extract:', text.substring(0, 200) + '...');
      } else if (text.includes('No hover information')) {
        console.log('❌ Still no hover information (dependency issue?)');
        console.log('📋 Full response:', text);
      } else {
        console.log('❓ Unexpected hover response:', text.substring(0, 150) + '...');
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
        console.log('🎉 WORKSPACE SYMBOLS WORKING with proper timing!');
        console.log('📋 Content extract:', text.substring(0, 200) + '...');
      } else if (text.includes('No symbols found')) {
        console.log('❌ Still no workspace symbols (indexing issue?)');
      } else {
        console.log('❓ Unexpected workspace response:', text.substring(0, 150) + '...');
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
      if (text.includes('Definition') && !text.includes('No definitions')) {
        console.log('🎉 DEFINITIONS WORKING with proper timing!');
        console.log('📋 Content extract:', text.substring(0, 200) + '...');
      } else if (text.includes('No definitions found')) {
        console.log('❌ Still no definitions');
      } else {
        console.log('❓ Unexpected definitions response:', text.substring(0, 150) + '...');
      }
      
      console.log('\n🏁 Timing-aware test completed!');
      console.log('\n📊 Summary:');
      console.log(`   • Project loading: ${projectLoadingComplete ? '✅' : '❌'}`);
      console.log(`   • File loading: ${fileLoadingComplete ? '✅' : '❌'}`);
      console.log(`   • Tests run after full initialization: ✅`);
      
      setTimeout(() => {
        mcp.kill();
        process.exit(0);
      }, 2000);
      break;
  }
}

// Manual trigger if loading takes too long
setTimeout(() => {
  if (testPhase === 'waiting') {
    console.log('\n⏰ 60 seconds passed - starting tests anyway...');
    console.log(`   • Project loading: ${projectLoadingComplete ? '✅' : '❌'}`);
    console.log(`   • File loading: ${fileLoadingComplete ? '✅' : '❌'}`);
    
    testPhase = 'hover';
    sendMCPRequest(1, 'hover', {
      filePath: testFile,
      line: 8,
      character: 20
    });
  }
}, 60000);

// Error handling
mcp.on('error', (error) => {
  console.error('❌ MCP server error:', error);
});

mcp.on('exit', (code, signal) => {
  console.log(`\n🔚 MCP server exited: code ${code}, signal ${signal}`);
});

// Final timeout
setTimeout(() => {
  console.log('\n⏰ Final timeout after 2 minutes');
  mcp.kill();
  process.exit(1);
}, 120000);