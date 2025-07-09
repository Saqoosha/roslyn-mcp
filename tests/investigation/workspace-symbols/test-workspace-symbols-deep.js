#!/usr/bin/env node

/**
 * Deep test of workspace symbols to understand indexing behavior
 */

import { spawn } from 'child_process';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('🔍 Deep Testing Workspace Symbols');
console.log('━'.repeat(60));

const testQueries = [
  'MainController',  // User-defined class (should exist)
  'Every',           // User-defined class (should exist)
  'Unity',           // Unity framework (package)
  'M',               // Single letter (should find many)
  'Log',             // Unity.Logging (should exist)
  'GameObject',      // Unity built-in (should exist)
  'Program'          // Filename-based search
];

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
let currentTestIndex = 0;
const results = {};

// Monitor initialization
mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  
  if (logText.includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Background initialization completed');
    
    // Wait extra time for indexing to complete
    setTimeout(() => {
      console.log('\n🧪 Starting workspace symbol tests...');
      console.log('⏳ Waiting additional 15 seconds for indexing...');
      
      setTimeout(() => {
        runNextTest();
      }, 15000);
    }, 5000);
  }
  
  // Monitor project loading
  if (logText.includes('Successfully completed load')) {
    const match = logText.match(/Successfully completed load of (.+)\.csproj/);
    if (match) {
      console.log(`📁 Project loaded: ${match[1]}`);
    }
  }
});

function runNextTest() {
  if (currentTestIndex >= testQueries.length) {
    showSummary();
    return;
  }
  
  const query = testQueries[currentTestIndex];
  console.log(`\n${currentTestIndex + 1}. Testing query: "${query}"`);
  
  const request = {
    jsonrpc: '2.0',
    id: 100 + currentTestIndex,
    method: 'tools/call',
    params: {
      name: 'workspaceSymbols',
      arguments: { query }
    }
  };
  
  mcp.stdin.write(JSON.stringify(request) + '\n');
  
  setTimeout(() => {
    currentTestIndex++;
    runNextTest();
  }, 3000);
}

function showSummary() {
  console.log('\n📊 WORKSPACE SYMBOLS SUMMARY');
  console.log('━'.repeat(60));
  
  let workingQueries = 0;
  let failedQueries = 0;
  
  testQueries.forEach((query, index) => {
    const result = results[query] || '❓ No response';
    console.log(`${query.padEnd(15)} → ${result}`);
    
    if (result.includes('Found')) {
      workingQueries++;
    } else if (result.includes('No symbols found')) {
      failedQueries++;
    }
  });
  
  console.log('\n🎯 Analysis:');
  console.log(`✅ Working queries: ${workingQueries}/${testQueries.length}`);
  console.log(`❌ Failed queries: ${failedQueries}/${testQueries.length}`);
  
  // Analyze patterns
  const packageSymbols = ['Unity', 'GameObject', 'Log'].filter(q => results[q] && results[q].includes('Found'));
  const userSymbols = ['MainController', 'Every'].filter(q => results[q] && results[q].includes('Found'));
  
  console.log(`\n📦 Package symbols working: ${packageSymbols.length}/3`);
  console.log(`👤 User symbols working: ${userSymbols.length}/2`);
  
  if (packageSymbols.length > 0 && userSymbols.length === 0) {
    console.log('\n🔍 PATTERN DETECTED: Package symbols work but user symbols don\'t');
    console.log('💡 This suggests user code indexing is incomplete');
  } else if (userSymbols.length > 0) {
    console.log('\n✅ User symbols are indexed correctly');
  }
  
  mcp.kill();
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      
      if (response.id >= 100 && response.id < 100 + testQueries.length) {
        const queryIndex = response.id - 100;
        const query = testQueries[queryIndex];
        const text = response.result?.content?.[0]?.text || '';
        
        if (text.includes('Found') && text.includes('symbol')) {
          const match = text.match(/Found (\d+) symbol/);
          const count = match ? match[1] : '?';
          results[query] = `✅ Found ${count} symbols`;
          console.log(`   ✅ Found ${count} symbols`);
        } else if (text.includes('No symbols found')) {
          results[query] = '❌ No symbols found';
          console.log(`   ❌ No symbols found`);
        } else if (text.includes('Background indexing')) {
          results[query] = '⏳ Indexing incomplete';
          console.log(`   ⏳ Indexing incomplete`);
        } else {
          results[query] = '❓ Unexpected response';
          console.log(`   ❓ Unexpected response`);
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
});

mcp.on('exit', (code, signal) => {
  console.log(`\n🔚 Test completed`);
});

// Safety timeout
setTimeout(() => {
  console.log('\n⏰ Overall timeout');
  mcp.kill();
}, 180000); // 3 minutes