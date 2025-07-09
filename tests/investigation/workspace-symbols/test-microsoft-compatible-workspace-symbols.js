#!/usr/bin/env node

/**
 * Test Microsoft-compatible workspace symbols implementation
 */

import { spawn } from 'child_process';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('🔬 Testing Microsoft-Compatible Workspace Symbols Implementation');
console.log('━'.repeat(80));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', projectRoot,
  '--log-level', 'info'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client'
});

let initComplete = false;
let projectInitComplete = false;
const startTime = Date.now();

// Track all important notifications
mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  
  if (logText.includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Background initialization completed');
  }
  
  if (logText.includes('🎉 Project initialization completed')) {
    projectInitComplete = true;
    console.log('✅ Project initialization completed - workspace symbols should work');
    
    // Test workspace symbols immediately after project init complete
    setTimeout(() => {
      console.log('\n🧪 Testing workspace symbols after project initialization...');
      testWorkspaceSymbols();
    }, 2000);
  }
  
  // Log Microsoft protocol notifications
  if (logText.includes('RECEIVED: workspace/projectInitializationComplete')) {
    console.log('✅ Microsoft protocol notification received');
  }
  
  // Log solution/project loading
  if (logText.includes('Loading solution:')) {
    console.log('📁 Solution loading started');
  }
  
  if (logText.includes('Loading') && logText.includes('project(s)')) {
    console.log('📁 Projects loading started');
  }
});

function testWorkspaceSymbols() {
  console.log('\n🔍 Testing workspace symbols for Unity project...');
  
  // Test multiple queries that should work with Unity projects
  const testQueries = [
    'Every',          // User-defined class
    'MainController', // User-defined class
    'Unity',          // Unity package
    'Log',            // Unity.Logging
    'GameObject'      // Unity built-in
  ];
  
  testQueries.forEach((query, index) => {
    setTimeout(() => {
      console.log(`\n${index + 1}. Testing query: "${query}"`);
      
      const request = {
        jsonrpc: '2.0',
        id: 100 + index,
        method: 'tools/call',
        params: {
          name: 'workspaceSymbols',
          arguments: { query }
        }
      };
      
      mcp.stdin.write(JSON.stringify(request) + '\n');
    }, index * 3000);
  });
  
  // Summary after all tests
  setTimeout(() => {
    console.log('\n📊 Test Summary:');
    console.log('━'.repeat(50));
    
    const elapsed = Date.now() - startTime;
    console.log(`⏱️  Total elapsed: ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`✅ Background init: ${initComplete ? 'COMPLETE' : 'PENDING'}`);
    console.log(`✅ Project init: ${projectInitComplete ? 'COMPLETE' : 'PENDING'}`);
    console.log(`📊 Workspace symbol tests: ${testResults.size}/5 completed`);
    
    if (projectInitComplete) {
      console.log('\n🎉 SUCCESS: Microsoft-compatible initialization completed');
      console.log('   Workspace symbols should now work correctly');
    } else {
      console.log('\n❌ ISSUE: Project initialization not completed');
      console.log('   Workspace symbols may not work properly');
    }
    
    mcp.kill();
  }, 20000);
}

// Track test results
const testResults = new Map();

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const elapsed = Date.now() - startTime;
      
      if (response.id >= 100 && response.id <= 104) {
        const testIndex = response.id - 100;
        const queries = ['Every', 'MainController', 'Unity', 'Log', 'GameObject'];
        const query = queries[testIndex];
        
        const text = response.result?.content?.[0]?.text || '';
        
        if (text.includes('Found') && text.includes('symbol')) {
          const match = text.match(/Found (\\d+) symbol/);
          const count = match ? match[1] : '?';
          testResults.set(query, `✅ Found ${count} symbols`);
          console.log(`   ✅ ${query}: Found ${count} symbols`);
        } else if (text.includes('No symbols found')) {
          testResults.set(query, '❌ No symbols found');
          console.log(`   ❌ ${query}: No symbols found`);
        } else if (text.includes('Background indexing') || text.includes('LSP Status')) {
          testResults.set(query, '⏳ Still indexing');
          console.log(`   ⏳ ${query}: Still indexing`);
        } else {
          testResults.set(query, '❓ Unexpected response');
          console.log(`   ❓ ${query}: Unexpected response`);
        }
      }
    } catch (e) {
      // Ignore non-JSON responses
    }
  }
});

// Error handling
mcp.on('error', (error) => {
  console.error('❌ MCP Error:', error);
});

mcp.on('exit', (code, signal) => {
  console.log(`\n🔚 Test completed`);
});

// Safety timeout
setTimeout(() => {
  console.log('\n⏰ Safety timeout reached');
  mcp.kill();
}, 120000);