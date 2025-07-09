#!/usr/bin/env node

/**
 * Test MCP Server with Real C# Project
 * 
 * Test the server with actual C# files and LSP functionality.
 */

import { spawn } from 'child_process';
import path from 'path';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client';
const CLI_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js';

async function testRealProject() {
  console.log('🎯 Testing MCP Server with Real C# Project...\n');
  console.log(`📁 Project: ${PROJECT_ROOT}`);
  console.log(`🚀 CLI: ${CLI_PATH}\n`);
  
  const server = spawn('node', [CLI_PATH, PROJECT_ROOT], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  let responses = [];
  let serverReady = false;
  
  server.stderr.on('data', (data) => {
    const output = data.toString();
    console.log('📊 Server:', output.trim());
    
    if (output.includes('MCP server started successfully')) {
      serverReady = true;
      console.log('✅ Server ready! Testing with real C# project...\n');
      setTimeout(runTests, 1000); // Wait for LSP to fully initialize
    }
  });
  
  server.stdout.on('data', (data) => {
    const response = data.toString().trim();
    console.log('📥 Response:', response);
    
    try {
      const parsed = JSON.parse(response);
      responses.push(parsed);
    } catch (error) {
      console.log('❌ Invalid JSON:', error.message);
    }
  });
  
  async function runTests() {
    const tests = [
      {
        name: 'Initialize',
        request: {
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            clientInfo: { name: 'test-client', version: '1.0.0' }
          },
          id: 1
        }
      },
      {
        name: 'Get Document Symbols',
        request: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'documentSymbols',
            arguments: {
              filePath: 'Program.cs'
            }
          },
          id: 2
        }
      },
      {
        name: 'Get Diagnostics',
        request: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'diagnostics',
            arguments: {
              filePath: 'Program.cs'
            }
          },
          id: 3
        }
      },
      {
        name: 'Workspace Search',
        request: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'workspaceSymbols',
            arguments: {
              query: 'Calculator'
            }
          },
          id: 4
        }
      },
      {
        name: 'Get Hover Info',
        request: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'hover',
            arguments: {
              filePath: 'Program.cs',
              line: 5,
              character: 10
            }
          },
          id: 5
        }
      }
    ];
    
    for (const test of tests) {
      console.log(`\n📤 Test: ${test.name}`);
      server.stdin.write(JSON.stringify(test.request) + '\n');
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    // Wait for all responses
    setTimeout(() => {
      console.log('\n📊 Test Summary:');
      console.log(`  - Server ready: ${serverReady}`);
      console.log(`  - Responses received: ${responses.length}`);
      
      responses.forEach((response, index) => {
        const success = response.result && !response.error;
        console.log(`  - Response ${index + 1}: ${success ? '✅ Success' : '❌ Error'}`);
        
        if (response.error) {
          console.log(`    Error: ${response.error.message}`);
        }
      });
      
      server.kill();
    }, 3000);
  }
  
  return new Promise((resolve) => {
    server.on('close', (code) => {
      console.log(`\n🏁 Server closed with code ${code}`);
      resolve();
    });
  });
}

// Run the test
testRealProject().catch(console.error);