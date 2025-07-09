#!/usr/bin/env node

/**
 * ULTRATHINK: Deep fix for workspace symbols - the final 10% to reach 90%+ success
 * Investigation: Why workspace symbols fail despite projectInitializationComplete notification
 */

import { spawn } from 'child_process';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('🧠 ULTRATHINK: Deep Workspace Symbols Fix');
console.log('━'.repeat(60));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', projectRoot,
  '--log-level', 'debug'  // Enable debug logging to see everything
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client'
});

let projectInitComplete = false;
let msbuildMessages = [];
let lspMessages = [];

// Track ALL messages to understand the workspace symbols issue
mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  
  if (logText.includes('RECEIVED: workspace/projectInitializationComplete')) {
    projectInitComplete = true;
    console.log('✅ Microsoft notification received');
    
    // Wait a bit more then test workspace symbols with different strategies
    setTimeout(() => {
      console.log('\n🔬 Testing workspace symbols with different strategies...');
      testWorkspaceSymbolsStrategies();
    }, 10000); // Wait 10 seconds after notification
  }
  
  // Track MSBuild related messages
  if (logText.includes('MSBuild') || logText.includes('csproj') || logText.includes('compilation')) {
    msbuildMessages.push(logText.trim());
  }
  
  // Track LSP messages
  if (logText.includes('LSP') || logText.includes('Successfully completed load')) {
    lspMessages.push(logText.trim());
  }
});

function testWorkspaceSymbolsStrategies() {
  console.log('\n1️⃣ Testing exact Microsoft queries...');
  
  // Test multiple strategies that Microsoft C# extension might use
  const testStrategies = [
    // Strategy 1: Single letter queries (often work due to indexing)
    { query: 'E', name: 'Single letter E' },
    { query: 'M', name: 'Single letter M' },
    
    // Strategy 2: Common Unity symbols
    { query: 'Unity', name: 'Unity framework' },
    { query: 'MonoBehaviour', name: 'Unity MonoBehaviour' },
    { query: 'GameObject', name: 'Unity GameObject' },
    
    // Strategy 3: Exact class names
    { query: 'Every', name: 'User class Every' },
    { query: 'MainController', name: 'User class MainController' },
    
    // Strategy 4: Partial matches
    { query: 'Main', name: 'Partial Main' },
    { query: 'Control', name: 'Partial Control' },
    
    // Strategy 5: Empty query (should return limited results)
    { query: '', name: 'Empty query' },
  ];
  
  testStrategies.forEach((strategy, index) => {
    setTimeout(() => {
      console.log(`\n${index + 1}. Testing strategy: ${strategy.name} ("${strategy.query}")`);
      
      const request = {
        jsonrpc: '2.0',
        id: 100 + index,
        method: 'tools/call',
        params: {
          name: 'workspaceSymbols',
          arguments: { query: strategy.query }
        }
      };
      
      mcp.stdin.write(JSON.stringify(request) + '\n');
    }, index * 2000);
  });
  
  // Analysis after all strategies
  setTimeout(() => {
    analyzeWorkspaceSymbolsResults();
  }, testStrategies.length * 2000 + 5000);
}

const results = {};

function analyzeWorkspaceSymbolsResults() {
  console.log('\n🔬 DEEP WORKSPACE SYMBOLS ANALYSIS');
  console.log('━'.repeat(60));
  
  console.log('📊 Test Results:');
  Object.entries(results).forEach(([testName, result]) => {
    console.log(`   ${testName}: ${result}`);
  });
  
  const workingQueries = Object.values(results).filter(r => r.includes('Found')).length;
  const totalQueries = Object.keys(results).length;
  
  console.log(`\n📈 Success Rate: ${workingQueries}/${totalQueries} (${((workingQueries/totalQueries)*100).toFixed(0)}%)`);
  
  if (workingQueries === 0) {
    console.log('\n❌ COMPLETE FAILURE: All workspace symbol queries failed');
    console.log('🔍 Possible causes:');
    console.log('   1. MSBuild compilation not actually complete');
    console.log('   2. Symbol indexing requires additional time');
    console.log('   3. LSP server needs additional configuration');
    console.log('   4. Microsoft uses different workspace symbol provider');
    
    console.log('\n📋 MSBuild Messages:');
    msbuildMessages.slice(-5).forEach(msg => console.log(`   ${msg}`));
    
    console.log('\n📋 LSP Messages:');
    lspMessages.slice(-5).forEach(msg => console.log(`   ${msg}`));
    
    console.log('\n💡 HYPOTHESIS: The issue might be that:');
    console.log('   - Roslyn LSP loads projects successfully');
    console.log('   - But MSBuild design-time build is not triggered');
    console.log('   - Without design-time build, symbols are not indexed');
    console.log('   - Microsoft C# extension might trigger design-time build differently');
    
  } else if (workingQueries < totalQueries) {
    console.log('\n⚠️ PARTIAL SUCCESS: Some queries work, others fail');
    console.log('🔍 This suggests:');
    console.log('   - Basic symbol indexing is working');
    console.log('   - But specific symbol types or scopes are missing');
    console.log('   - Need to investigate which symbols are indexed vs missing');
    
  } else {
    console.log('\n✅ COMPLETE SUCCESS: All workspace symbol queries working!');
    console.log('🎉 Workspace symbols issue is FIXED!');
  }
  
  console.log('\n🔧 RECOMMENDED FIXES:');
  
  if (workingQueries === 0) {
    console.log('1. Trigger MSBuild design-time build explicitly');
    console.log('2. Add additional wait time after projectInitializationComplete');
    console.log('3. Check if additional LSP notifications are needed');
    console.log('4. Verify MSBuild targets are properly loaded');
  }
  
  mcp.kill();
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      
      if (response.id >= 100 && response.id <= 109) {
        const testIndex = response.id - 100;
        const strategies = [
          'Single letter E', 'Single letter M', 'Unity framework', 'Unity MonoBehaviour',
          'Unity GameObject', 'User class Every', 'User class MainController', 
          'Partial Main', 'Partial Control', 'Empty query'
        ];
        
        const testName = strategies[testIndex];
        const text = response.result?.content?.[0]?.text || '';
        
        if (text.includes('Found') && text.includes('symbol')) {
          const match = text.match(/Found (\\d+) symbol/);
          const count = match ? match[1] : '?';
          results[testName] = `✅ Found ${count} symbols`;
        } else if (text.includes('No symbols found')) {
          results[testName] = '❌ No symbols found';
        } else if (text.includes('Background indexing') || text.includes('LSP Status')) {
          results[testName] = '⏳ Still indexing';
        } else {
          results[testName] = '❓ Unexpected response';
        }
      }
    } catch (e) {
      // Ignore non-JSON
    }
  }
});

mcp.on('error', (error) => {
  console.error('❌ Error:', error);
});

mcp.on('exit', () => {
  console.log('\n🔚 Deep analysis complete');
});

// Extended timeout for thorough analysis
setTimeout(() => {
  console.log('\n⏰ Deep analysis timeout');
  mcp.kill();
}, 120000);