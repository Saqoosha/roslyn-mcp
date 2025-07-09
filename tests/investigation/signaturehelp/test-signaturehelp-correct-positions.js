#!/usr/bin/env node

/**
 * Test SignatureHelp at CORRECT positions (actual method calls)
 */

import { spawn } from 'child_process';

console.log('🎯 Testing SignatureHelp at CORRECT positions');
console.log('━'.repeat(60));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', '/Users/hiko/Documents/everies/everies'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client'
});

let initComplete = false;

mcp.stderr.on('data', (data) => {
  if (data.toString().includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Initialization complete');
    
    setTimeout(() => {
      console.log('\n🧪 Testing SignatureHelp at ACTUAL method calls...');
      testCorrectPositions();
    }, 5000);
  }
});

function testCorrectPositions() {
  // Test at actual method call positions
  const testCases = [
    {
      name: 'SetActive method call',
      file: 'Assets/Scripts/Runtime/MainController.cs',
      line: 54,  // flush.gameObject.SetActive(true);
      character: 35, // After SetActive(
      code: 'flush.gameObject.SetActive(true);'
    },
    {
      name: 'UniTask.WhenAll method call',
      file: 'Assets/Scripts/Runtime/MainController.cs',
      line: 61,  // await UniTask.WhenAll(
      character: 27, // After WhenAll(
      code: 'await UniTask.WhenAll('
    },
    {
      name: 'DebugLabel.SetText method call',
      file: 'Assets/Scripts/Runtime/MainController.cs',
      line: 69,  // DebugLabel.SetText("Ready");
      character: 25, // After SetText(
      code: 'DebugLabel.SetText("Ready");'
    },
    {
      name: 'FindOnScreenEveries method call',
      file: 'Assets/Scripts/Runtime/MainController.cs',
      line: 75,  // var onScreenEveries = FindOnScreenEveries().ToArray();
      character: 45, // After FindOnScreenEveries(
      code: 'var onScreenEveries = FindOnScreenEveries().ToArray();'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    setTimeout(() => {
      console.log(`\n${index + 1}. ${testCase.name}`);
      console.log(`   Code: ${testCase.code}`);
      console.log(`   Position: ${testCase.line}:${testCase.character}`);
      
      const request = {
        jsonrpc: '2.0',
        id: 200 + index,
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
    }, index * 1500);
  });
  
  setTimeout(() => {
    analyzeResults();
  }, testCases.length * 1500 + 3000);
}

const results = {};

function analyzeResults() {
  console.log('\n🔬 CORRECT POSITION ANALYSIS');
  console.log('━'.repeat(60));
  
  Object.entries(results).forEach(([testName, result]) => {
    console.log(`${testName}: ${result}`);
  });
  
  const workingCount = Object.values(results).filter(r => r.includes('✅')).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n📈 Success Rate: ${workingCount}/${totalCount}`);
  
  if (workingCount > 0) {
    console.log('\n🎉 SIGNATUREHELP IS WORKING!');
    console.log('The issue was incorrect test positions in the report.');
  } else {
    console.log('\n❌ Still not working at correct positions');
    console.log('This indicates a deeper Roslyn LSP issue.');
  }
  
  mcp.kill();
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      
      if (response.id >= 200 && response.id <= 203) {
        const testIndex = response.id - 200;
        const testNames = [
          'SetActive method call',
          'UniTask.WhenAll method call',
          'DebugLabel.SetText method call',
          'FindOnScreenEveries method call'
        ];
        
        const testName = testNames[testIndex];
        const text = response.result?.content?.[0]?.text || '';
        
        if (text.includes('📋 **Method Signature Help**')) {
          results[testName] = '✅ WORKING - Found signature help';
        } else if (text.includes('❌ No signature help available')) {
          results[testName] = '❌ Failed - No signature help available';
        } else {
          results[testName] = '❓ Unknown response';
        }
      }
    } catch (e) {
      // Ignore non-JSON
    }
  }
});

mcp.on('exit', () => {
  console.log('\n🔚 Correct position test complete');
});

setTimeout(() => {
  console.log('\n⏰ Test timeout');
  analyzeResults();
}, 30000);