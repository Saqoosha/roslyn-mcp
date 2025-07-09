#!/usr/bin/env node

/**
 * Test MCP Server with Actual C# Solution
 * 
 * Test with the real C# solution that has .sln and .csproj files.
 */

import { spawn } from 'child_process';
import path from 'path';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const CLI_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js';

async function testWithSolution() {
  console.log('🎯 Testing MCP Server with C# Solution...\n');
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
      console.log('✅ Server ready! Testing with real C# solution...\n');
      setTimeout(runTests, 2000); // Wait for LSP and solution loading
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
        name: 'List Tools',
        request: {
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 2
        }
      },
      {
        name: 'Get Document Symbols - Program.cs',
        request: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'documentSymbols',
            arguments: {
              filePath: 'Program.cs'
            }
          },
          id: 3
        }
      },
      {
        name: 'Get Diagnostics - Program.cs',
        request: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'diagnostics',
            arguments: {
              filePath: 'Program.cs'
            }
          },
          id: 4
        }
      },
      {
        name: 'Workspace Search - Calculator',
        request: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'workspaceSymbols',
            arguments: {
              query: 'Calculator'
            }
          },
          id: 5
        }
      },
      {
        name: 'Get Hover - Program.cs line 6',
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
          id: 6
        }
      },
      {
        name: 'Get Completion - Program.cs',
        request: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'completion',
            arguments: {
              filePath: 'Program.cs',
              line: 8,
              character: 0
            }
          },
          id: 7
        }
      }
    ];
    
    for (const test of tests) {
      console.log(`\n📤 Test: ${test.name}`);
      server.stdin.write(JSON.stringify(test.request) + '\n');
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Wait for all responses
    setTimeout(() => {
      console.log('\n📊 Final Test Summary:');
      console.log(`  - Server ready: ${serverReady}`);
      console.log(`  - Responses received: ${responses.length}`);
      
      responses.forEach((response, index) => {
        const success = response.result && !response.error;
        console.log(`  - Response ${index + 1}: ${success ? '✅ Success' : '❌ Error'}`);
        
        if (response.error) {
          console.log(`    Error: ${response.error.message}`);
        } else if (response.result?.content?.[0]?.text?.includes('❌')) {
          console.log(`    Tool Error: ${response.result.content[0].text.split('\\n')[0]}`);
        }
      });
      
      server.kill();
    }, 5000);
  }
  
  return new Promise((resolve) => {
    server.on('close', (code) => {
      console.log(`\n🏁 Server closed with code ${code}`);
      resolve();
    });
  });
}

// Run the test
testWithSolution().catch(console.error);