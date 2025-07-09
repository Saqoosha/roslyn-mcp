#!/usr/bin/env node

/**
 * Test MCP Tools Functionality
 * 
 * Now that we know the server works, let's test the actual tools.
 */

import { spawn } from 'child_process';
import path from 'path';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp';
const CLI_PATH = path.join(PROJECT_ROOT, 'dist', 'cli.js');

async function testMCPTools() {
  console.log('🔧 Testing MCP Tools Functionality...\n');
  
  const server = spawn('node', [CLI_PATH, PROJECT_ROOT, '--test-mode'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' }
  });
  
  let responses = [];
  
  server.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('MCP server started successfully')) {
      console.log('✅ Server ready, testing tools...\n');
      runTests();
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
        name: 'Call Ping Tool',
        request: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'ping',
            arguments: {}
          },
          id: 3
        }
      }
    ];
    
    for (const test of tests) {
      console.log(`\n📤 Test: ${test.name}`);
      server.stdin.write(JSON.stringify(test.request) + '\n');
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Wait for all responses
    setTimeout(() => {
      console.log('\n📊 Test Summary:');
      console.log(`  - Responses received: ${responses.length}`);
      responses.forEach((response, index) => {
        console.log(`  - Response ${index + 1}:`, response.result ? '✅ Success' : '❌ Error');
      });
      
      server.kill();
    }, 2000);
  }
  
  return new Promise((resolve) => {
    server.on('close', resolve);
  });
}

// Run the test
testMCPTools().catch(console.error);