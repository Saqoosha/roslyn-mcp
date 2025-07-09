#!/usr/bin/env node

/**
 * ULTRATHINK ROOT CAUSE INVESTIGATION
 * Comprehensive analysis of LSP failures for workspace symbols, definitions, and signature help
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('🧠 ULTRATHINK ROOT CAUSE INVESTIGATION');
console.log('━'.repeat(80));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', projectRoot,
  '--log-level', 'debug'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client'
});

let initComplete = false;
let testSequence = 0;
const results = {};
const logMessages = [];

// Track all LSP messages for deep analysis
mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  logMessages.push(logText);
  
  if (logText.includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Background initialization completed');
    
    // Start comprehensive investigation
    setTimeout(() => {
      console.log('\n🔬 STARTING COMPREHENSIVE INVESTIGATION...');
      runInvestigationSequence();
    }, 5000);
  }
});

async function runInvestigationSequence() {
  console.log('\n' + '═'.repeat(80));
  console.log('🧪 HYPOTHESIS 1: DOCUMENT SYNCHRONIZATION TEST');
  console.log('═'.repeat(80));
  
  // Test if LSP properly tracks document opening
  await testDocumentSync();
  
  setTimeout(() => {
    console.log('\n' + '═'.repeat(80));
    console.log('🧪 HYPOTHESIS 2: SYMBOL INDEXING TIMING TEST');
    console.log('═'.repeat(80));
    testSymbolIndexingTiming();
  }, 5000);
  
  setTimeout(() => {
    console.log('\n' + '═'.repeat(80));
    console.log('🧪 HYPOTHESIS 3: COMPILATION STATUS TEST');
    console.log('═'.repeat(80));
    testCompilationStatus();
  }, 15000);
  
  setTimeout(() => {
    console.log('\n' + '═'.repeat(80));
    console.log('🧪 HYPOTHESIS 4: LSP REQUEST FORMAT TEST');
    console.log('═'.repeat(80));
    testLSPRequestFormat();
  }, 25000);
  
  setTimeout(() => {
    console.log('\n' + '═'.repeat(80));
    console.log('🧠 FINAL ANALYSIS AND ROOT CAUSE IDENTIFICATION');
    console.log('═'.repeat(80));
    performFinalAnalysis();
  }, 35000);
}

async function testDocumentSync() {
  console.log('🔍 Testing document synchronization...');
  
  // Test 1: Document symbols for a file that should exist
  const docSymbolsRequest = {
    jsonrpc: '2.0',
    id: 100,
    method: 'tools/call',
    params: {
      name: 'documentSymbols',
      arguments: { filePath: 'Assets/Scripts/Runtime/MainController.cs' }
    }
  };
  
  console.log('   📄 Testing document symbols for MainController.cs...');
  mcp.stdin.write(JSON.stringify(docSymbolsRequest) + '\\n');
  
  setTimeout(() => {
    // Test 2: Try to get diagnostics for the same file
    const diagnosticsRequest = {
      jsonrpc: '2.0',
      id: 101,
      method: 'tools/call',
      params: {
        name: 'diagnostics',
        arguments: { filePath: 'Assets/Scripts/Runtime/MainController.cs' }
      }
    };
    
    console.log('   🔧 Testing diagnostics for MainController.cs...');
    mcp.stdin.write(JSON.stringify(diagnosticsRequest) + '\\n');
  }, 2000);
}

function testSymbolIndexingTiming() {
  console.log('🕐 Testing symbol indexing timing patterns...');
  
  // Test multiple queries with different timing
  const queries = ['Every', 'MainController', 'Unity', 'GameObject', 'M', 'E'];
  
  queries.forEach((query, index) => {
    setTimeout(() => {
      const request = {
        jsonrpc: '2.0',
        id: 200 + index,
        method: 'tools/call',
        params: {
          name: 'workspaceSymbols',
          arguments: { query }
        }
      };
      
      console.log(`   🔍 Testing workspace symbols: "${query}"`);
      mcp.stdin.write(JSON.stringify(request) + '\\n');
    }, index * 1000);
  });
}

function testCompilationStatus() {
  console.log('🔧 Testing compilation status...');
  
  // Use completion to test if compilation is working
  // Completion requires compiled symbols
  const completionRequest = {
    jsonrpc: '2.0',
    id: 300,
    method: 'tools/call',
    params: {
      name: 'completion',
      arguments: {
        filePath: 'Assets/Scripts/Runtime/MainController.cs',
        line: 50,
        character: 10
      }
    }
  };
  
  console.log('   💡 Testing completion at MainController.cs:50:10...');
  mcp.stdin.write(JSON.stringify(completionRequest) + '\\n');
  
  setTimeout(() => {
    // Test code actions (also requires compilation)
    const codeActionsRequest = {
      jsonrpc: '2.0',
      id: 301,
      method: 'tools/call',
      params: {
        name: 'codeActions',
        arguments: {
          filePath: 'Assets/Scripts/Runtime/MainController.cs',
          line: 50,
          character: 10,
          endLine: 50,
          endCharacter: 20
        }
      }
    };
    
    console.log('   🔧 Testing code actions at MainController.cs:50:10...');
    mcp.stdin.write(JSON.stringify(codeActionsRequest) + '\\n');
  }, 2000);
}

function testLSPRequestFormat() {
  console.log('📋 Testing LSP request format...');
  
  // Test the exact position where references work but definitions fail
  const refPosition = {
    filePath: 'Assets/Scripts/Runtime/MainController.cs',
    line: 43,
    character: 20
  };
  
  // Test references (known to work)
  const referencesRequest = {
    jsonrpc: '2.0',
    id: 400,
    method: 'tools/call',
    params: {
      name: 'references',
      arguments: refPosition
    }
  };
  
  console.log('   📎 Testing references at known working position...');
  mcp.stdin.write(JSON.stringify(referencesRequest) + '\\n');
  
  setTimeout(() => {
    // Test definitions at same position
    const definitionsRequest = {
      jsonrpc: '2.0',
      id: 401,
      method: 'tools/call',
      params: {
        name: 'definitions',
        arguments: refPosition
      }
    };
    
    console.log('   🎯 Testing definitions at same position...');
    mcp.stdin.write(JSON.stringify(definitionsRequest) + '\\n');
  }, 2000);
  
  setTimeout(() => {
    // Test signature help at method call
    const signatureRequest = {
      jsonrpc: '2.0',
      id: 402,
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
    
    console.log('   ✍️  Testing signature help at method call...');
    mcp.stdin.write(JSON.stringify(signatureRequest) + '\\n');
  }, 4000);
}

function performFinalAnalysis() {
  console.log('🧠 ANALYZING ALL RESULTS...');
  
  // Analyze patterns in results
  const workingTools = [];
  const failingTools = [];
  const partialTools = [];
  
  Object.entries(results).forEach(([testName, result]) => {
    if (result.includes('✅') || result.includes('Found') || result.includes('reference')) {
      workingTools.push(testName);
    } else if (result.includes('❌') || result.includes('No') || result.includes('failed')) {
      failingTools.push(testName);
    } else {
      partialTools.push(testName);
    }
  });
  
  console.log(`\\n📊 RESULT SUMMARY:`);
  console.log(`✅ Working: ${workingTools.length} - ${workingTools.join(', ')}`);
  console.log(`❌ Failing: ${failingTools.length} - ${failingTools.join(', ')}`);
  console.log(`❓ Partial: ${partialTools.length} - ${partialTools.join(', ')}`);
  
  // Identify patterns
  console.log(`\\n🔍 PATTERN ANALYSIS:`);
  
  if (results.documentSymbols && results.documentSymbols.includes('✅')) {
    console.log('✅ Document-level operations work → LSP can read files');
  } else {
    console.log('❌ Document-level operations fail → LSP file access issue');
  }
  
  if (results.completion && results.completion.includes('✅')) {
    console.log('✅ Completion works → Compilation is successful');
  } else {
    console.log('❌ Completion fails → Compilation issue');
  }
  
  if (results.references && results.references.includes('✅')) {
    console.log('✅ References work → Symbol resolution partially works');
  } else {
    console.log('❌ References fail → Symbol resolution broken');
  }
  
  // Identify root cause
  console.log(`\\n🎯 ROOT CAUSE HYPOTHESIS:`);
  
  if (workingTools.includes('documentSymbols') && workingTools.includes('references')) {
    if (failingTools.includes('workspaceSymbols')) {
      console.log('🔍 PRIMARY ISSUE: Workspace-level symbol indexing failure');
      console.log('   → LSP can read files and find references within files');
      console.log('   → But cross-project symbol indexing is not working');
      console.log('   → This suggests MSBuild design-time build issues');
    }
    
    if (failingTools.includes('definitions')) {
      console.log('🔍 SECONDARY ISSUE: Definition resolution inconsistency');
      console.log('   → References work but definitions fail at same position');
      console.log('   → This suggests LSP request handling differences');
    }
  }
  
  // Log analysis
  console.log(`\\n📝 LOG ANALYSIS:`);
  const errorLogs = logMessages.filter(msg => 
    msg.toLowerCase().includes('error') || 
    msg.toLowerCase().includes('timeout') ||
    msg.toLowerCase().includes('failed')
  );
  
  if (errorLogs.length > 0) {
    console.log(`❌ Found ${errorLogs.length} error-related log entries`);
    errorLogs.slice(0, 5).forEach(log => console.log(`   ${log.trim()}`));
  }
  
  const projectLogs = logMessages.filter(msg => 
    msg.includes('Successfully completed load') ||
    msg.includes('initialization')
  );
  
  console.log(`✅ Project loading: ${projectLogs.length} successful loads detected`);
  
  mcp.kill();
}

// Handle all responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const id = response.id;
      const text = response.result?.content?.[0]?.text || '';
      
      // Map responses to test names
      const testMap = {
        100: 'documentSymbols',
        101: 'diagnostics',
        200: 'workspaceSymbols_Every',
        201: 'workspaceSymbols_MainController',
        202: 'workspaceSymbols_Unity',
        203: 'workspaceSymbols_GameObject',
        204: 'workspaceSymbols_M',
        205: 'workspaceSymbols_E',
        300: 'completion',
        301: 'codeActions',
        400: 'references',
        401: 'definitions',
        402: 'signatureHelp'
      };
      
      const testName = testMap[id];
      if (testName) {
        if (text.includes('Found') || text.includes('symbol') || text.includes('reference') || text.includes('completion')) {
          results[testName] = '✅ Working';
          console.log(`   ✅ ${testName}: Working`);
        } else if (text.includes('No') || text.includes('failed') || text.includes('error')) {
          results[testName] = '❌ Failed';
          console.log(`   ❌ ${testName}: Failed`);
        } else {
          results[testName] = '❓ Partial';
          console.log(`   ❓ ${testName}: Partial response`);
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
  console.log(`\\n🔚 Investigation completed`);
});

// Safety timeout
setTimeout(() => {
  console.log('\\n⏰ Investigation timeout');
  mcp.kill();
}, 120000);