#!/usr/bin/env node

/**
 * Test definitions vs references at the same position
 */

import { spawn } from 'child_process';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('🔍 Testing Definitions vs References at Same Position');
console.log('━'.repeat(60));

// Test the same position that works for references
const testPosition = {
  filePath: 'Assets/Scripts/Runtime/MainController.cs',
  line: 43,
  character: 20
};

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', projectRoot,
  '--log-level', 'error'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client'
});

let initComplete = false;
const startTime = Date.now();
const testResults = {};

// Wait for background initialization
mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  
  if (logText.includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Background initialization completed');
    
    // Wait then test both methods at the same position
    setTimeout(() => {
      console.log('\n🧪 Testing both methods at the same position...');
      console.log(`📍 Position: ${testPosition.filePath}:${testPosition.line}:${testPosition.character}`);
      console.log('━'.repeat(60));
      
      testReferences();
    }, 5000);
  }
});

function testReferences() {
  console.log('\n1️⃣ Testing References (known to work)...');
  
  const referencesRequest = {
    jsonrpc: '2.0',
    id: 100,
    method: 'tools/call',
    params: {
      name: 'references',
      arguments: testPosition
    }
  };
  
  mcp.stdin.write(JSON.stringify(referencesRequest) + '\n');
  
  setTimeout(() => {
    testDefinitions();
  }, 3000);
}

function testDefinitions() {
  console.log('\n2️⃣ Testing Definitions (at same position)...');
  
  const definitionsRequest = {
    jsonrpc: '2.0',
    id: 200,
    method: 'tools/call',
    params: {
      name: 'definitions',
      arguments: testPosition
    }
  };
  
  mcp.stdin.write(JSON.stringify(definitionsRequest) + '\n');
  
  setTimeout(() => {
    console.log('\n📊 Test Summary:');
    console.log(`References: ${testResults.references || 'No response'}`);
    console.log(`Definitions: ${testResults.definitions || 'No response'}`);
    
    if (testResults.references && testResults.definitions) {
      if (testResults.references.includes('references') && testResults.definitions.includes('definitions')) {
        console.log('\n✅ Both methods work at the same position!');
      } else if (testResults.references.includes('references') && testResults.definitions.includes('No definitions')) {
        console.log('\n❌ References work but definitions fail at same position');
        console.log('🔍 This suggests a definitions-specific issue');
      }
    }
    
    mcp.kill();
  }, 5000);
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const elapsed = Date.now() - startTime;
      
      if (response.id === 100) {
        // References response
        const text = response.result?.content?.[0]?.text || '';
        if (text.includes('602 references')) {
          testResults.references = '✅ Found 602 references';
          console.log('   ✅ References: Found 602 references');
        } else if (text.includes('references')) {
          testResults.references = '✅ Found references';
          console.log('   ✅ References: Found some references');
        } else {
          testResults.references = '❌ No references found';
          console.log('   ❌ References: No references found');
        }
      } else if (response.id === 200) {
        // Definitions response
        const text = response.result?.content?.[0]?.text || '';
        if (text.includes('Definition Location')) {
          testResults.definitions = '✅ Found definition';
          console.log('   ✅ Definitions: Found definition location');
        } else if (text.includes('No definitions found')) {
          testResults.definitions = '❌ No definitions found';
          console.log('   ❌ Definitions: No definitions found');
        } else {
          testResults.definitions = '❓ Unexpected response';
          console.log('   ❓ Definitions: Unexpected response');
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
  console.log('\n⏰ Test timeout');
  mcp.kill();
}, 120000);