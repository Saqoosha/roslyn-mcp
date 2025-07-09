#!/usr/bin/env node

/**
 * ULTRATHINK: Investigate MonoBehaviour indexing issue
 * Why is MonoBehaviour not indexed when other Unity classes are?
 */

import { spawn } from 'child_process';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('🔍 INVESTIGATING MonoBehaviour INDEXING');
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
const results = {};

mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  
  if (logText.includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Initialization complete');
    
    setTimeout(() => {
      console.log('\n🔬 Testing Unity class indexing patterns...');
      testUnityClassIndexing();
    }, 5000);
  }
});

function testUnityClassIndexing() {
  console.log('\n1️⃣ Testing Unity base classes...');
  
  // Test various Unity classes to understand indexing pattern
  const unityClasses = [
    // Core Unity classes
    { query: 'MonoBehaviour', name: 'MonoBehaviour (base class)' },
    { query: 'Component', name: 'Component (base class)' },
    { query: 'Behaviour', name: 'Behaviour (base class)' },
    { query: 'Object', name: 'Object (Unity base)' },
    
    // Unity types that work
    { query: 'GameObject', name: 'GameObject (known working)' },
    { query: 'Transform', name: 'Transform (component)' },
    { query: 'Rigidbody', name: 'Rigidbody (component)' },
    
    // Unity namespaces
    { query: 'UnityEngine', name: 'UnityEngine namespace' },
    { query: 'Unity', name: 'Unity (general)' },
    
    // Case variations
    { query: 'Mono', name: 'Mono (partial)' },
    { query: 'mono', name: 'mono (lowercase)' },
    { query: 'MONOBEHAVIOUR', name: 'MONOBEHAVIOUR (uppercase)' },
    
    // Unity packages
    { query: 'Collections', name: 'Unity.Collections' },
    { query: 'Burst', name: 'Unity.Burst' },
    { query: 'Logging', name: 'Unity.Logging' },
  ];
  
  unityClasses.forEach((test, index) => {
    setTimeout(() => {
      console.log(`\n${index + 1}. Testing: ${test.name} ("${test.query}")`);
      
      const request = {
        jsonrpc: '2.0',
        id: 100 + index,
        method: 'tools/call',
        params: {
          name: 'workspaceSymbols',
          arguments: { query: test.query }
        }
      };
      
      mcp.stdin.write(JSON.stringify(request) + '\n');
    }, index * 1500);
  });
  
  // Analysis after all tests
  setTimeout(() => {
    analyzeUnityIndexing();
  }, unityClasses.length * 1500 + 5000);
}

function analyzeUnityIndexing() {
  console.log('\n🔬 UNITY INDEXING ANALYSIS');
  console.log('━'.repeat(60));
  
  console.log('📊 Unity Class Indexing Results:');
  
  const categories = {
    'Base Classes': ['MonoBehaviour', 'Component', 'Behaviour', 'Object'],
    'Working Unity Types': ['GameObject', 'Transform', 'Rigidbody'],
    'Namespaces': ['UnityEngine', 'Unity'],
    'Case Variations': ['Mono', 'mono', 'MONOBEHAVIOUR'],
    'Unity Packages': ['Collections', 'Burst', 'Logging']
  };
  
  Object.entries(categories).forEach(([category, queries]) => {
    console.log(`\n📂 ${category}:`);
    queries.forEach(query => {
      const result = results[query] || '⏳ No response';
      console.log(`   ${query.padEnd(15)} → ${result}`);
    });
  });
  
  // Pattern analysis
  console.log('\n🔍 PATTERN ANALYSIS:');
  
  const workingQueries = Object.entries(results).filter(([_, result]) => result.includes('Found'));
  const failingQueries = Object.entries(results).filter(([_, result]) => result.includes('No symbols'));
  
  console.log(`✅ Working: ${workingQueries.length} queries`);
  console.log(`❌ Failing: ${failingQueries.length} queries`);
  
  if (workingQueries.length > 0) {
    console.log('\n✅ Working Unity classes:');
    workingQueries.forEach(([query, result]) => {
      console.log(`   ${query} → ${result}`);
    });
  }
  
  if (failingQueries.length > 0) {
    console.log('\n❌ Not indexed Unity classes:');
    failingQueries.forEach(([query, result]) => {
      console.log(`   ${query} → ${result}`);
    });
  }
  
  // Hypothesis about MonoBehaviour
  console.log('\n💡 MONOBEHAVIOUR HYPOTHESIS:');
  
  if (results['MonoBehaviour'] && results['MonoBehaviour'].includes('No symbols')) {
    console.log('❌ MonoBehaviour is NOT indexed');
    console.log('🔍 Possible reasons:');
    console.log('   1. MonoBehaviour is in a different assembly not loaded');
    console.log('   2. MonoBehaviour is in UnityEngine.CoreModule which might not be indexed');
    console.log('   3. Base classes are not indexed by design (only concrete types)');
    console.log('   4. MonoBehaviour requires different indexing approach');
    
    // Check if other base classes also fail
    if (results['Component'] && results['Component'].includes('No symbols')) {
      console.log('   → Component also fails → Pattern: Base classes not indexed');
    }
    if (results['Behaviour'] && results['Behaviour'].includes('No symbols')) {
      console.log('   → Behaviour also fails → Pattern: Base classes not indexed');
    }
    
  } else if (results['MonoBehaviour'] && results['MonoBehaviour'].includes('Found')) {
    console.log('✅ MonoBehaviour IS indexed');
    console.log('🎉 The issue might be resolved!');
  }
  
  console.log('\n🔧 POTENTIAL FIXES:');
  console.log('1. Check Unity assembly loading - ensure UnityEngine.CoreModule is loaded');
  console.log('2. Verify MSBuild includes Unity reference assemblies');
  console.log('3. Check if base classes need special indexing treatment');
  console.log('4. Compare working vs failing Unity classes for patterns');
  
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Check which Unity assemblies are actually loaded');
  console.log('2. Verify UnityEngine.CoreModule.dll is accessible');
  console.log('3. Test if MonoBehaviour appears in document symbols');
  console.log('4. Compare with Microsoft C# extension behavior');
  
  mcp.kill();
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      
      if (response.id >= 100 && response.id <= 114) {
        const testIndex = response.id - 100;
        const queries = [
          'MonoBehaviour', 'Component', 'Behaviour', 'Object',
          'GameObject', 'Transform', 'Rigidbody',
          'UnityEngine', 'Unity',
          'Mono', 'mono', 'MONOBEHAVIOUR',
          'Collections', 'Burst', 'Logging'
        ];
        
        const query = queries[testIndex];
        const text = response.result?.content?.[0]?.text || '';
        
        if (text.includes('Found') && text.includes('symbol')) {
          const match = text.match(/Found (\\d+) symbol/);
          const count = match ? match[1] : '?';
          results[query] = `✅ Found ${count} symbols`;
        } else if (text.includes('No symbols found')) {
          results[query] = '❌ No symbols found';
        } else if (text.includes('Background indexing') || text.includes('LSP Status')) {
          results[query] = '⏳ Still indexing';
        } else {
          results[query] = '❓ Unexpected response';
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
  console.log('\n🔚 Investigation complete');
});

// Timeout
setTimeout(() => {
  console.log('\n⏰ Investigation timeout');
  mcp.kill();
}, 90000);