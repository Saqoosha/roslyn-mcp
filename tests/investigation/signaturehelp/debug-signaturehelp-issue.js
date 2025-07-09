#!/usr/bin/env node

/**
 * ULTRATHINK: Debug SignatureHelp issue
 * Why is SignatureHelp failing despite proper implementation?
 */

import { spawn } from 'child_process';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('🔍 ULTRATHINK: SignatureHelp Deep Debug');
console.log('━'.repeat(60));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', projectRoot,
  '--log-level', 'debug'  // Enable debug logging
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client'
});

let initComplete = false;
let logMessages = [];

mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  logMessages.push(logText);
  
  if (logText.includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Initialization complete');
    
    setTimeout(() => {
      console.log('\n🧪 Testing SignatureHelp at multiple positions...');
      testSignatureHelpPositions();
    }, 5000);
  }
});

function testSignatureHelpPositions() {
  // Test multiple positions that should trigger signature help
  const testCases = [
    {
      name: 'Method Call - After Opening Paren',
      file: 'Assets/Scripts/Runtime/MainController.cs',
      line: 337,
      character: 25,
      description: 'AddEvery(|'
    },
    {
      name: 'Method Call - Between Parameters',
      file: 'Assets/Scripts/Runtime/MainController.cs',
      line: 337,
      character: 30,
      description: 'AddEvery(pose, |'
    },
    {
      name: 'Unity Method Call',
      file: 'Assets/Scripts/Runtime/MainController.cs',
      line: 50,
      character: 20,
      description: 'GetComponent<Transform>(|'
    },
    {
      name: 'Console.WriteLine Call',
      file: 'Assets/Scripts/Runtime/MainController.cs',
      line: 60,
      character: 15,
      description: 'Console.WriteLine(|'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    setTimeout(() => {
      console.log(`\n${index + 1}. ${testCase.name}`);
      console.log(`   File: ${testCase.file}`);
      console.log(`   Position: ${testCase.line}:${testCase.character}`);
      console.log(`   Context: ${testCase.description}`);
      
      const request = {
        jsonrpc: '2.0',
        id: 100 + index,
        method: 'tools/call',
        params: {
          name: 'signatureHelp',
          arguments: {
            filePath: testCase.file,
            line: testCase.line,
            character: testCase.character
          }
        }
      };
      
      mcp.stdin.write(JSON.stringify(request) + '\n');
    }, index * 2000);
  });
  
  // Analysis after all tests
  setTimeout(() => {
    analyzeSignatureHelpResults();
  }, testCases.length * 2000 + 3000);
}

const testResults = {};

function analyzeSignatureHelpResults() {
  console.log('\n🔬 SIGNATUREHELP ANALYSIS RESULTS');
  console.log('━'.repeat(60));
  
  console.log('📊 Test Results:');
  Object.entries(testResults).forEach(([testName, result]) => {
    console.log(`   ${testName}: ${result}`);
  });
  
  const workingCount = Object.values(testResults).filter(r => r.includes('✅')).length;
  const totalCount = Object.keys(testResults).length;
  
  console.log(`\n📈 Success Rate: ${workingCount}/${totalCount} positions working`);
  
  if (workingCount === 0) {
    console.log('\n❌ COMPLETE FAILURE: All SignatureHelp positions failed');
    console.log('🔍 Root Cause Analysis:');
    
    // Check for common issues
    const hasLSPErrors = logMessages.some(msg => msg.includes('LSP') && msg.includes('error'));
    const hasDocSyncErrors = logMessages.some(msg => msg.includes('textDocument/didOpen') && msg.includes('error'));
    const hasSignatureErrors = logMessages.some(msg => msg.includes('textDocument/signatureHelp') && msg.includes('error'));
    
    if (hasLSPErrors) {
      console.log('   1. LSP Communication Errors detected');
    }
    if (hasDocSyncErrors) {
      console.log('   2. Document Synchronization Errors detected');
    }
    if (hasSignatureErrors) {
      console.log('   3. SignatureHelp LSP Request Errors detected');
    }
    
    console.log('\n🔧 POTENTIAL FIXES:');
    console.log('   1. Verify Roslyn LSP SignatureHelp capability is enabled');
    console.log('   2. Check if position calculation is correct (0-based vs 1-based)');
    console.log('   3. Ensure document is properly synchronized before request');
    console.log('   4. Test with simpler C# project (not Unity)');
    console.log('   5. Check LSP server logs for SignatureHelp errors');
    
    console.log('\n📋 DEBUG LOGS (last 10 lines):');
    logMessages.slice(-10).forEach(msg => console.log(`   ${msg.trim()}`));
    
  } else if (workingCount < totalCount) {
    console.log('\n⚠️ PARTIAL SUCCESS: Some positions work');
    console.log('💡 This suggests position-specific issues');
    
  } else {
    console.log('\n✅ ALL TESTS PASSED: SignatureHelp is working!');
    console.log('🎉 The issue might be with the test report positions');
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. If all fail → LSP server issue');
  console.log('2. If partial → Position calculation issue');
  console.log('3. If all pass → Report is outdated');
  
  mcp.kill();
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      
      if (response.id >= 100 && response.id <= 103) {
        const testIndex = response.id - 100;
        const testNames = [
          'Method Call - After Opening Paren',
          'Method Call - Between Parameters', 
          'Unity Method Call',
          'Console.WriteLine Call'
        ];
        
        const testName = testNames[testIndex];
        const text = response.result?.content?.[0]?.text || '';
        
        if (text.includes('📋 **Method Signature Help**')) {
          testResults[testName] = '✅ Working - Found signature help';
        } else if (text.includes('❌ No signature help available')) {
          testResults[testName] = '❌ Failed - No signature help available';
        } else if (text.includes('⚠️ Signature help requires LSP client')) {
          testResults[testName] = '⚠️ Failed - LSP client not running';
        } else {
          testResults[testName] = '❓ Unknown response';
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
  console.log('\n🔚 SignatureHelp debug complete');
});

// Timeout
setTimeout(() => {
  console.log('\n⏰ Debug timeout');
  analyzeSignatureHelpResults();
}, 60000);