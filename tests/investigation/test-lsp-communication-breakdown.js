#!/usr/bin/env node

/**
 * Test LSP communication breakdown - verify if LSP responds to ANY requests
 */

import { spawn } from 'child_process';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('🚨 CRITICAL ISSUE INVESTIGATION: LSP Communication Breakdown');
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
let requestsSent = 0;
let responsesReceived = 0;
const startTime = Date.now();

// Track stderr for initialization
mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  
  if (logText.includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Background initialization completed');
    
    // Test basic communication immediately
    setTimeout(() => {
      console.log('\n🔬 TESTING BASIC LSP COMMUNICATION...');
      testBasicCommunication();
    }, 2000);
  }
});

function testBasicCommunication() {
  console.log('\n1️⃣ Testing basic MCP tools list...');
  
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  
  requestsSent++;
  mcp.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  setTimeout(() => {
    console.log('\n2️⃣ Testing simple ping/status...');
    
    const pingRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'ping',
        arguments: {}
      }
    };
    
    requestsSent++;
    mcp.stdin.write(JSON.stringify(pingRequest) + '\n');
    
    setTimeout(() => {
      console.log('\n3️⃣ Testing status check...');
      
      const statusRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'status',
          arguments: {}
        }
      };
      
      requestsSent++;
      mcp.stdin.write(JSON.stringify(statusRequest) + '\n');
      
      setTimeout(() => {
        console.log('\n4️⃣ Testing simple diagnostics...');
        
        const diagnosticsRequest = {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'diagnostics',
            arguments: { filePath: 'Program.cs' }
          }
        };
        
        requestsSent++;
        mcp.stdin.write(JSON.stringify(diagnosticsRequest) + '\n');
        
        setTimeout(() => {
          analyzeResults();
        }, 10000);
      }, 3000);
    }, 3000);
  }, 3000);
}

function analyzeResults() {
  const elapsed = Date.now() - startTime;
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 COMMUNICATION ANALYSIS RESULTS');
  console.log('═'.repeat(80));
  
  console.log(`⏱️  Total time elapsed: ${elapsed}ms`);
  console.log(`📤 Requests sent: ${requestsSent}`);
  console.log(`📥 Responses received: ${responsesReceived}`);
  console.log(`📊 Response rate: ${responsesReceived}/${requestsSent} (${((responsesReceived/requestsSent)*100).toFixed(1)}%)`);
  
  if (responsesReceived === 0) {
    console.log('\n🚨 CRITICAL DIAGNOSIS: ZERO RESPONSES RECEIVED');
    console.log('━'.repeat(80));
    console.log('🔍 This indicates a fundamental communication breakdown:');
    console.log('   • LSP server starts and loads projects successfully');
    console.log('   • But MCP wrapper is not receiving/processing tool requests');
    console.log('   • OR LSP is not responding to any requests at all');
    console.log('   • OR JSON-RPC protocol mismatch between MCP and LSP');
    
    console.log('\n💡 POSSIBLE ROOT CAUSES:');
    console.log('   1. MCP wrapper stdin/stdout pipe broken');
    console.log('   2. LSP server hanging after initialization');
    console.log('   3. JSON-RPC protocol version mismatch');
    console.log('   4. LSP request routing failure in MCP wrapper');
    console.log('   5. LSP process deadlock or infinite loop');
    
    console.log('\n🔧 IMMEDIATE ACTIONS NEEDED:');
    console.log('   1. Check MCP wrapper request handling code');
    console.log('   2. Test direct LSP communication (bypass MCP)');
    console.log('   3. Verify LSP process is still running');
    console.log('   4. Check for LSP error logs');
    
  } else if (responsesReceived < requestsSent) {
    console.log('\n⚠️  PARTIAL COMMUNICATION FAILURE');
    console.log('   Some requests work, others fail - investigate patterns');
    
  } else {
    console.log('\n✅ COMMUNICATION WORKING');
    console.log('   All requests received responses - issue is with specific tools');
  }
  
  mcp.kill();
}

// Track stdout for responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      responsesReceived++;
      
      const elapsed = Date.now() - startTime;
      console.log(`   📥 Response ${responsesReceived} received (${elapsed}ms): ID=${response.id}`);
      
      if (response.result) {
        console.log(`      ✅ Success: ${JSON.stringify(response.result).substring(0, 100)}...`);
      } else if (response.error) {
        console.log(`      ❌ Error: ${response.error.message}`);
      }
    } catch (e) {
      console.log(`   📥 Non-JSON response: ${line.substring(0, 50)}...`);
    }
  }
});

// Error handling
mcp.on('error', (error) => {
  console.error('❌ MCP Process Error:', error);
});

mcp.on('exit', (code, signal) => {
  console.log(`\n🔚 Communication test completed (exit code: ${code}, signal: ${signal})`);
});

// Safety timeout
setTimeout(() => {
  console.log('\n⏰ Communication test timeout');
  analyzeResults();
}, 60000);