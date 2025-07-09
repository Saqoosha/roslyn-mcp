#!/usr/bin/env node

/**
 * 🚀 QUICK MCP TEST
 * 
 * Test the "Program" query that works in direct LSP to see if MCP gives same results
 */

import { spawn } from 'child_process';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const MCP_CLI_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js';

async function quickMCPTest() {
  console.log('🚀 QUICK MCP TEST - Testing "Program" query');
  console.log('(This query returns 9 symbols in direct LSP including Calculator)\n');
  
  const mcpServer = spawn('node', [MCP_CLI_PATH, PROJECT_ROOT], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverReady = false;

  mcpServer.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('MCP server started successfully')) {
      serverReady = true;
      console.log('✅ MCP server ready!');
      
      // Wait for solution loading then test
      setTimeout(() => {
        console.log('\n📤 Testing workspace symbols with query "Program"...');
        
        // Initialize first
        mcpServer.stdin.write(JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize', 
          params: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            clientInfo: { name: 'quick-test', version: '1.0.0' }
          },
          id: 1
        }) + '\n');
        
        // Send workspace symbols request
        setTimeout(() => {
          mcpServer.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'workspaceSymbols',
              arguments: { query: 'Program' }
            },
            id: 2
          }) + '\n');
        }, 1000);
        
      }, 4000); // Wait longer for solution loading
    }
  });

  mcpServer.stdout.on('data', (data) => {
    try {
      const response = JSON.parse(data.toString());
      
      if (response.id === 2) {
        console.log('\n📥 MCP Response for "Program" query:');
        
        if (response.result?.content?.[0]?.text) {
          const content = response.result.content[0].text;
          console.log(content);
          
          const symbolCount = (content.match(/📍/g) || []).length;
          console.log(`\n📊 Symbol count: ${symbolCount}`);
          
          if (symbolCount > 0) {
            console.log('✅ MCP found symbols! Bridge is working.');
          } else {
            console.log('❌ MCP found no symbols. Bridge issue or LSP not ready.');
          }
        } else if (response.error) {
          console.log(`❌ MCP Error: ${response.error.message}`);
        } else {
          console.log('❌ Unexpected response format');
        }
        
        mcpServer.kill();
      }
    } catch (error) {
      // Ignore parse errors
    }
  });

  setTimeout(() => {
    if (!serverReady) {
      console.log('❌ MCP server timeout');
    }
    mcpServer.kill();
  }, 15000);
}

quickMCPTest().catch(console.error);