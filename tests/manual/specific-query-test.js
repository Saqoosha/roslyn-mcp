#!/usr/bin/env node

/**
 * 🎯 SPECIFIC QUERY COMPARISON
 * 
 * Test specific queries that we know work vs don't work in direct LSP
 * to confirm if MCP bridge produces same results
 */

import { spawn } from 'child_process';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const CLI_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js';

async function testSpecificQueries() {
  console.log('🎯 SPECIFIC QUERY COMPARISON TEST');
  console.log('Testing queries we know work vs don\'t work in direct LSP\n');
  
  const server = spawn('node', [CLI_PATH, PROJECT_ROOT], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp'
  });
  
  let serverReady = false;
  let responses = [];
  let currentId = 1;
  
  server.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('MCP server started successfully')) {
      serverReady = true;
      console.log('✅ MCP server ready! Testing queries...\n');
      setTimeout(runTests, 3000); // Wait for solution loading
    }
  });
  
  server.stdout.on('data', (data) => {
    try {
      const response = JSON.parse(data.toString());
      responses.push(response);
    } catch (error) {}
  });
  
  async function sendRequest(name, toolName, args) {
    const id = currentId++;
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: toolName, arguments: args },
      id
    }) + '\n');
    
    // Wait for response
    let response = null;
    const startTime = Date.now();
    while (!response && (Date.now() - startTime) < 5000) {
      response = responses.find(r => r.id === id);
      if (!response) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    if (response?.result?.content?.[0]?.text) {
      const content = response.result.content[0].text;
      const symbolCount = (content.match(/📍/g) || []).length;
      const hasSymbols = symbolCount > 0 || content.includes('Found');
      
      console.log(`📊 ${name}:`);
      console.log(`   MCP Result: ${hasSymbols ? symbolCount + ' symbols found' : 'No symbols found'}`);
      
      // Show first few lines of response
      const lines = content.split('\n').slice(0, 3);
      lines.forEach(line => console.log(`   ${line}`));
      console.log('');
      
      return { success: hasSymbols, count: symbolCount, content };
    } else {
      console.log(`❌ ${name}: Error or no response`);
      return { success: false, count: 0 };
    }
  }
  
  async function runTests() {
    // Initialize first
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: { name: 'specific-test', version: '1.0.0' }
      },
      id: currentId++
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test queries we know the direct LSP behavior for
    console.log('🔍 Testing workspace symbol queries:\n');
    
    // Known to return 9 symbols in direct LSP (including Calculator)
    await sendRequest('Query: "Program" (should find 9 symbols)', 'workspaceSymbols', { query: 'Program' });
    
    // Known to return 0 symbols in direct LSP (the issue!)  
    await sendRequest('Query: "Calculator" (direct LSP returns 0)', 'workspaceSymbols', { query: 'Calculator' });
    
    // Known to return 6 symbols in direct LSP
    await sendRequest('Query: "Add" (should find 6 symbols)', 'workspaceSymbols', { query: 'Add' });
    
    // Known to return 0 symbols in direct LSP
    await sendRequest('Query: "" (empty - should return 0)', 'workspaceSymbols', { query: '' });
    
    console.log('🎯 COMPARISON COMPLETE');
    console.log('If MCP results match direct LSP behavior, our bridge is working correctly!');
    
    server.kill();
  }
  
  setTimeout(() => {
    if (!serverReady) {
      console.log('❌ Server failed to start');
      server.kill();
    }
  }, 10000);
}

testSpecificQueries().catch(console.error);