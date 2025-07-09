#!/usr/bin/env node

/**
 * ULTRATHINK: Targeted fix for remaining 3 LSP issues
 * 1. Workspace Symbols - MSBuild integration timing
 * 2. Definitions vs References - Same position inconsistency  
 * 3. Signature Help - Method context detection
 */

import { spawn } from 'child_process';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('🧠 ULTRATHINK: Targeted Fix Analysis');
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
let projectInitComplete = false;
const startTime = Date.now();
const results = {};

// Track ALL LSP notifications for debugging
const lspNotifications = [];

mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  
  // Track Microsoft protocol notifications
  if (logText.includes('RECEIVED: workspace/projectInitializationComplete')) {
    projectInitComplete = true;
    console.log('✅ Microsoft notification received - workspace symbols should work');
  }
  
  if (logText.includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Background initialization completed');
    
    // Start targeted testing after initialization
    setTimeout(() => {
      console.log('\n🎯 STARTING TARGETED ISSUE ANALYSIS...');
      runTargetedTests();
    }, 5000);
  }
  
  // Track all LSP notifications
  if (logText.includes('LSP')) {
    lspNotifications.push(logText.trim());
  }
});

function runTargetedTests() {
  console.log('\n1️⃣ Testing Workspace Symbols (MSBuild Integration)...');
  
  // Test workspace symbols with different timing
  const workspaceTest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'workspaceSymbols',
      arguments: { query: 'Every' }
    }
  };
  
  mcp.stdin.write(JSON.stringify(workspaceTest) + '\n');
  
  setTimeout(() => {
    console.log('\n2️⃣ Testing Definitions vs References (Same Position)...');
    
    // Test REFERENCES first (known to work)
    const referencesTest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'references',
        arguments: {
          filePath: 'Assets/Scripts/Runtime/MainController.cs',
          line: 43,
          character: 20
        }
      }
    };
    
    mcp.stdin.write(JSON.stringify(referencesTest) + '\n');
    
    // Test DEFINITIONS at exact same position
    setTimeout(() => {
      const definitionsTest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'definitions',
          arguments: {
            filePath: 'Assets/Scripts/Runtime/MainController.cs',
            line: 43,
            character: 20
          }
        }
      };
      
      mcp.stdin.write(JSON.stringify(definitionsTest) + '\n');
    }, 2000);
    
  }, 5000);
  
  setTimeout(() => {
    console.log('\n3️⃣ Testing Signature Help (Method Context)...');
    
    // Test signature help at method call position
    const signatureTest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'signatureHelp',
        arguments: {
          filePath: 'Assets/Scripts/Runtime/MainController.cs',
          line: 62,
          character: 35
        }
      }
    };
    
    mcp.stdin.write(JSON.stringify(signatureTest) + '\n');
    
    // Analysis after all tests
    setTimeout(() => {
      performTargetedAnalysis();
    }, 5000);
    
  }, 12000);
}

function performTargetedAnalysis() {
  console.log('\n🔬 TARGETED ANALYSIS RESULTS');
  console.log('━'.repeat(60));
  
  const elapsed = Date.now() - startTime;
  console.log(`⏱️ Total time: ${(elapsed/1000).toFixed(1)}s`);
  console.log(`✅ Background init: ${initComplete ? 'COMPLETE' : 'PENDING'}`);
  console.log(`✅ Project init: ${projectInitComplete ? 'COMPLETE' : 'PENDING'}`);
  
  console.log('\n📊 SPECIFIC ISSUE ANALYSIS:');
  
  // Issue 1: Workspace Symbols
  if (results.workspaceSymbols) {
    if (results.workspaceSymbols.includes('Found')) {
      console.log('✅ Issue 1 FIXED: Workspace symbols working');
    } else {
      console.log('❌ Issue 1 PERSISTS: Workspace symbols failing');
      console.log('   💡 Root cause: MSBuild integration not complete');
    }
  } else {
    console.log('⏳ Issue 1 PENDING: No workspace symbols response');
  }
  
  // Issue 2: Definitions vs References
  if (results.references && results.definitions) {
    if (results.references.includes('references') && results.definitions.includes('Definition')) {
      console.log('✅ Issue 2 FIXED: Both references and definitions working');
    } else if (results.references.includes('references') && !results.definitions.includes('Definition')) {
      console.log('❌ Issue 2 PERSISTS: References work but definitions fail');
      console.log('   💡 Root cause: LSP request processing inconsistency');
    }
  } else {
    console.log('⏳ Issue 2 PENDING: Missing responses');
  }
  
  // Issue 3: Signature Help
  if (results.signatureHelp) {
    if (results.signatureHelp.includes('Signature')) {
      console.log('✅ Issue 3 FIXED: Signature help working');
    } else {
      console.log('❌ Issue 3 PERSISTS: Signature help failing');
      console.log('   💡 Root cause: Method context detection issue');
    }
  } else {
    console.log('⏳ Issue 3 PENDING: No signature help response');
  }
  
  console.log('\n🎯 SPECIFIC FIXES NEEDED:');
  
  if (!projectInitComplete) {
    console.log('🔧 FIX 1: Ensure workspace/projectInitializationComplete notification is received');
    console.log('   - Check LSP server initialization sequence');
    console.log('   - Verify MSBuild project loading');
    console.log('   - Add proper notification handling');
  }
  
  if (results.references && !results.definitions) {
    console.log('🔧 FIX 2: Debug definitions vs references LSP request differences');
    console.log('   - Compare exact LSP request formats');
    console.log('   - Check document synchronization state');
    console.log('   - Verify position calculation consistency');
  }
  
  if (!results.signatureHelp) {
    console.log('🔧 FIX 3: Improve signature help method context detection');
    console.log('   - Test different method call positions');
    console.log('   - Verify document parsing state');
    console.log('   - Check LSP signature help requirements');
  }
  
  console.log('\n💡 NEXT STEPS:');
  console.log('1. Implement specific fixes for identified issues');
  console.log('2. Test fixes systematically');
  console.log('3. Verify 90%+ success rate achieved');
  
  mcp.kill();
}

// Handle responses and track results
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const text = response.result?.content?.[0]?.text || '';
      
      if (response.id === 1) {
        results.workspaceSymbols = text;
        console.log(`   📥 Workspace symbols: ${text.includes('Found') ? '✅ Found symbols' : '❌ No symbols'}`);
      } else if (response.id === 2) {
        results.references = text;
        console.log(`   📥 References: ${text.includes('references') ? '✅ Found references' : '❌ No references'}`);
      } else if (response.id === 3) {
        results.definitions = text;
        console.log(`   📥 Definitions: ${text.includes('Definition') ? '✅ Found definition' : '❌ No definition'}`);
      } else if (response.id === 4) {
        results.signatureHelp = text;
        console.log(`   📥 Signature help: ${text.includes('Signature') ? '✅ Found signature' : '❌ No signature'}`);
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
  console.log('\n🔚 Targeted analysis complete');
});

// Safety timeout
setTimeout(() => {
  console.log('\n⏰ Analysis timeout');
  mcp.kill();
}, 60000);