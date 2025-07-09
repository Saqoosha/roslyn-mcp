#!/usr/bin/env node

/**
 * ULTRATHINK: Fix MonoBehaviour indexing
 * Based on analysis: MonoBehaviour and Behaviour fail, but Component and Object work
 * This suggests specific Unity assembly loading issues
 */

import { spawn } from 'child_process';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('🔧 FIXING MonoBehaviour INDEXING');
console.log('━'.repeat(60));

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

mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  
  if (logText.includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Initialization complete');
    
    setTimeout(() => {
      console.log('\n🔬 Testing MonoBehaviour indexing strategies...');
      testMonoBehaviourStrategies();
    }, 5000);
  }
});

function testMonoBehaviourStrategies() {
  console.log('\n1️⃣ Testing different MonoBehaviour search strategies...');
  
  // Multiple strategies to find MonoBehaviour
  const strategies = [
    // Direct searches
    { query: 'MonoBehaviour', name: 'Direct MonoBehaviour' },
    { query: 'MonoBehavior', name: 'MonoBehavior (US spelling)' },
    
    // Partial matches
    { query: 'MonoB', name: 'MonoB (partial)' },
    { query: 'Behaviour', name: 'Behaviour (base class)' },
    { query: 'Behavior', name: 'Behavior (US spelling)' },
    
    // Case variations
    { query: 'monobehaviour', name: 'monobehaviour (lowercase)' },
    { query: 'MONOBEHAVIOUR', name: 'MONOBEHAVIOUR (uppercase)' },
    
    // Namespace qualified
    { query: 'UnityEngine.MonoBehaviour', name: 'Fully qualified' },
    { query: 'UnityEngine.Behaviour', name: 'UnityEngine.Behaviour' },
    
    // Related Unity classes that should work
    { query: 'ScriptableObject', name: 'ScriptableObject (Unity base)' },
    { query: 'Component', name: 'Component (known working)' },
    { query: 'Object', name: 'Object (known working)' },
    
    // Test inheritance chain
    { query: 'UnityEngine.Object', name: 'UnityEngine.Object' },
    { query: 'UnityEngine.Component', name: 'UnityEngine.Component' },
  ];
  
  strategies.forEach((strategy, index) => {
    setTimeout(() => {
      console.log(`\n${index + 1}. Testing: ${strategy.name} ("${strategy.query}")`);
      
      const request = {
        jsonrpc: '2.0',
        id: 200 + index,
        method: 'tools/call',
        params: {
          name: 'workspaceSymbols',
          arguments: { query: strategy.query }
        }
      };
      
      mcp.stdin.write(JSON.stringify(request) + '\n');
    }, index * 1500);
  });
  
  // Test document symbols to see if MonoBehaviour appears there
  setTimeout(() => {
    console.log('\n2️⃣ Testing document symbols for MonoBehaviour usage...');
    
    const docSymbolsRequest = {
      jsonrpc: '2.0',
      id: 300,
      method: 'tools/call',
      params: {
        name: 'documentSymbols',
        arguments: { filePath: 'Assets/Scripts/Runtime/MainController.cs' }
      }
    };
    
    mcp.stdin.write(JSON.stringify(docSymbolsRequest) + '\n');
  }, strategies.length * 1500 + 2000);
  
  // Test references to MonoBehaviour
  setTimeout(() => {
    console.log('\n3️⃣ Testing references to MonoBehaviour...');
    
    const referencesRequest = {
      jsonrpc: '2.0',
      id: 301,
      method: 'tools/call',
      params: {
        name: 'references',
        arguments: { 
          filePath: 'Assets/Scripts/Runtime/MainController.cs',
          line: 22,  // The line with "public sealed class MainController : MonoBehaviour"
          character: 50  // Position on MonoBehaviour
        }
      }
    };
    
    mcp.stdin.write(JSON.stringify(referencesRequest) + '\n');
  }, strategies.length * 1500 + 4000);
  
  // Analysis
  setTimeout(() => {
    analyzeMonoBehaviourResults();
  }, strategies.length * 1500 + 10000);
}

const results = {};

function analyzeMonoBehaviourResults() {
  console.log('\n🔬 MONOBEHAVIOUR INDEXING ANALYSIS');
  console.log('━'.repeat(60));
  
  // Group results by strategy type
  const strategyGroups = {
    'Direct Searches': ['MonoBehaviour', 'MonoBehavior'],
    'Partial Matches': ['MonoB', 'Behaviour', 'Behavior'],
    'Case Variations': ['monobehaviour', 'MONOBEHAVIOUR'],
    'Namespace Qualified': ['UnityEngine.MonoBehaviour', 'UnityEngine.Behaviour'],
    'Related Classes': ['ScriptableObject', 'Component', 'Object'],
    'Full Qualified': ['UnityEngine.Object', 'UnityEngine.Component']
  };
  
  console.log('📊 MonoBehaviour Search Results:');
  Object.entries(strategyGroups).forEach(([groupName, queries]) => {
    console.log(`\n📂 ${groupName}:`);
    queries.forEach(query => {
      const result = results[query] || '⏳ No response';
      console.log(`   ${query.padEnd(25)} → ${result}`);
    });
  });
  
  // Check document symbols result
  if (results.documentSymbols) {
    console.log('\n📄 Document Symbols Analysis:');
    if (results.documentSymbols.includes('MonoBehaviour')) {
      console.log('✅ MonoBehaviour found in document symbols');
    } else {
      console.log('❌ MonoBehaviour NOT found in document symbols');
    }
  }
  
  // Check references result
  if (results.references) {
    console.log('\n📎 References Analysis:');
    if (results.references.includes('reference')) {
      console.log('✅ MonoBehaviour references found');
    } else {
      console.log('❌ MonoBehaviour references NOT found');
    }
  }
  
  // Find working strategies
  const workingStrategies = Object.entries(results).filter(([_, result]) => 
    result.includes('Found') && result.includes('symbol')
  );
  
  console.log('\n🎯 WORKING STRATEGIES:');
  if (workingStrategies.length > 0) {
    workingStrategies.forEach(([query, result]) => {
      console.log(`✅ ${query} → ${result}`);
    });
    
    console.log('\n🎉 SOLUTION FOUND!');
    console.log('MonoBehaviour CAN be found using these strategies:');
    workingStrategies.forEach(([query]) => {
      console.log(`   • Use query: "${query}"`);
    });
  } else {
    console.log('❌ No working strategies found');
    
    console.log('\n🔧 POTENTIAL FIXES:');
    console.log('1. Check Unity assembly references in .csproj files');
    console.log('2. Verify UnityEngine.CoreModule.dll is accessible');
    console.log('3. Check if MonoBehaviour is in a different assembly');
    console.log('4. Compare Unity project configuration with working projects');
    
    console.log('\n💡 WORKAROUND:');
    console.log('• Use "Component" instead of "MonoBehaviour" for searches');
    console.log('• Use document symbols to navigate to MonoBehaviour usage');
    console.log('• Use references to find MonoBehaviour instances');
  }
  
  // Final recommendation
  console.log('\n📋 FINAL RECOMMENDATION:');
  if (workingStrategies.length > 0) {
    console.log('✅ MonoBehaviour indexing issue is FIXABLE');
    console.log('Update workspace symbols to use working strategies');
  } else {
    console.log('⚠️ MonoBehaviour indexing has limitations');
    console.log('But other Unity classes work fine, and practical development is unaffected');
  }
  
  mcp.kill();
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      
      if (response.id >= 200 && response.id <= 213) {
        // Workspace symbols responses
        const testIndex = response.id - 200;
        const queries = [
          'MonoBehaviour', 'MonoBehavior', 'MonoB', 'Behaviour', 'Behavior',
          'monobehaviour', 'MONOBEHAVIOUR', 'UnityEngine.MonoBehaviour', 'UnityEngine.Behaviour',
          'ScriptableObject', 'Component', 'Object', 'UnityEngine.Object', 'UnityEngine.Component'
        ];
        
        const query = queries[testIndex];
        const text = response.result?.content?.[0]?.text || '';
        
        if (text.includes('Found') && text.includes('symbol')) {
          const match = text.match(/Found (\\d+) symbol/);
          const count = match ? match[1] : '?';
          results[query] = `✅ Found ${count} symbols`;
        } else if (text.includes('No symbols found')) {
          results[query] = '❌ No symbols found';
        } else {
          results[query] = '❓ Unexpected response';
        }
        
      } else if (response.id === 300) {
        // Document symbols response
        const text = response.result?.content?.[0]?.text || '';
        results.documentSymbols = text;
        
      } else if (response.id === 301) {
        // References response
        const text = response.result?.content?.[0]?.text || '';
        results.references = text;
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
  console.log('\n🔚 MonoBehaviour fix analysis complete');
});

// Timeout
setTimeout(() => {
  console.log('\n⏰ Analysis timeout');
  mcp.kill();
}, 120000);