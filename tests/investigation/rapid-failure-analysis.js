#!/usr/bin/env node

/**
 * RAPID FAILURE ANALYSIS - 60 second focused test on specific failing tools
 */

import { spawn } from 'child_process';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('⚡ RAPID FAILURE ANALYSIS - 60 Second Focus Test');
console.log('━'.repeat(70));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', projectRoot,
  '--log-level', 'error'  // Minimal logging for speed
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client'
});

let initComplete = false;
const results = {};
const startTime = Date.now();

// Quick initialization check
mcp.stderr.on('data', (data) => {
  if (data.toString().includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Init complete, starting focused tests...');
    
    // Start rapid testing immediately
    setTimeout(() => {
      runFocusedTests();
    }, 1000);
  }
});

function runFocusedTests() {
  console.log('\n🎯 TESTING SPECIFIC FAILING TOOLS...');
  
  // Test 1: Workspace Symbols (known issue)
  setTimeout(() => {
    console.log('1️⃣ Workspace Symbols...');
    const request = {
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: 'workspaceSymbols', arguments: { query: 'Every' } }
    };
    mcp.stdin.write(JSON.stringify(request) + '\n');
  }, 1000);

  // Test 2: Definitions (known issue)  
  setTimeout(() => {
    console.log('2️⃣ Definitions...');
    const request = {
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'definitions', arguments: { 
        filePath: 'Assets/Scripts/Runtime/MainController.cs', line: 43, character: 20 
      }}
    };
    mcp.stdin.write(JSON.stringify(request) + '\n');
  }, 5000);

  // Test 3: References (known to work)
  setTimeout(() => {
    console.log('3️⃣ References (control)...');
    const request = {
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'references', arguments: { 
        filePath: 'Assets/Scripts/Runtime/MainController.cs', line: 43, character: 20 
      }}
    };
    mcp.stdin.write(JSON.stringify(request) + '\n');
  }, 10000);

  // Test 4: Document Symbols (should work)
  setTimeout(() => {
    console.log('4️⃣ Document Symbols...');
    const request = {
      jsonrpc: '2.0', id: 4, method: 'tools/call',
      params: { name: 'documentSymbols', arguments: { 
        filePath: 'Assets/Scripts/Runtime/MainController.cs'
      }}
    };
    mcp.stdin.write(JSON.stringify(request) + '\n');
  }, 15000);

  // Test 5: Signature Help (known issue)
  setTimeout(() => {
    console.log('5️⃣ Signature Help...');
    const request = {
      jsonrpc: '2.0', id: 5, method: 'tools/call',
      params: { name: 'signatureHelp', arguments: { 
        filePath: 'Assets/Scripts/Runtime/MainController.cs', line: 62, character: 35 
      }}
    };
    mcp.stdin.write(JSON.stringify(request) + '\n');
  }, 20000);

  // Rapid analysis
  setTimeout(() => {
    performRapidAnalysis();
  }, 40000);
}

function performRapidAnalysis() {
  console.log('\n📊 RAPID ANALYSIS RESULTS');
  console.log('═'.repeat(50));
  
  const elapsed = Date.now() - startTime;
  console.log(`⏱️ Total time: ${(elapsed/1000).toFixed(1)}s`);
  console.log(`📊 Tests completed: ${Object.keys(results).length}/5`);
  
  console.log('\n🔍 TOOL STATUS:');
  [
    { id: 1, name: 'Workspace Symbols', expected: 'FAIL' },
    { id: 2, name: 'Definitions', expected: 'FAIL' },  
    { id: 3, name: 'References', expected: 'PASS' },
    { id: 4, name: 'Document Symbols', expected: 'PASS' },
    { id: 5, name: 'Signature Help', expected: 'FAIL' }
  ].forEach(test => {
    const result = results[test.id];
    const status = result ? (result.success ? '✅ PASS' : '❌ FAIL') : '⏳ PENDING';
    const match = result ? (result.success === (test.expected === 'PASS') ? '✓' : '✗') : '?';
    console.log(`   ${status} ${test.name} (expected ${test.expected}) ${match}`);
  });
  
  console.log('\n🎯 ROOT CAUSE ANALYSIS:');
  
  const passCount = Object.values(results).filter(r => r.success).length;
  const failCount = Object.values(results).filter(r => !r.success).length;
  
  if (results[3]?.success && results[4]?.success) {
    console.log('✅ File-level operations work (References, Document Symbols)');
  }
  
  if (results[1] && !results[1].success) {
    console.log('❌ Workspace-level indexing fails (Workspace Symbols)');
  }
  
  if (results[2] && !results[2].success && results[3]?.success) {
    console.log('❌ Definitions fail while References work (LSP inconsistency)');
  }
  
  console.log(`\n📈 SUCCESS RATE: ${passCount}/${passCount + failCount} (${((passCount/(passCount + failCount))*100).toFixed(0)}%)`);
  
  console.log('\n💡 NEXT ACTIONS:');
  if (!results[1]?.success) {
    console.log('• Investigate workspace symbol indexing failure');
  }
  if (!results[2]?.success && results[3]?.success) {  
    console.log('• Debug definitions vs references LSP request differences');
  }
  if (!results[5]?.success) {
    console.log('• Analyze signature help position/context requirements');
  }
  
  mcp.kill();
}

// Handle responses rapidly
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const elapsed = Date.now() - startTime;
      
      if (response.id >= 1 && response.id <= 5) {
        const text = response.result?.content?.[0]?.text || '';
        const success = text.includes('Found') || text.includes('references') || text.includes('symbols') || text.includes('Definition');
        
        results[response.id] = { 
          success, 
          time: elapsed,
          summary: text.substring(0, 50) + '...'
        };
        
        console.log(`   📥 Test ${response.id}: ${success ? '✅' : '❌'} (${elapsed}ms)`);
      }
    } catch (e) {
      // Ignore parsing errors for speed
    }
  }
});

mcp.on('exit', () => {
  console.log('\n🔚 Rapid analysis complete');
});

// Hard timeout
setTimeout(() => {
  console.log('\n⏰ 60s timeout - finalizing...');
  performRapidAnalysis();
}, 60000);