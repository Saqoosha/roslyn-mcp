#!/usr/bin/env node

/**
 * Debug MCP Protocol Communication
 * 
 * This script tests the basic MCP protocol handshake to identify
 * why the server times out on JSON-RPC requests.
 */

import { spawn } from 'child_process';
import path from 'path';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp';
const CLI_PATH = path.join(PROJECT_ROOT, 'dist', 'cli.js');

async function debugMCPProtocol() {
  console.log('🔍 Debugging MCP Protocol Communication...\n');
  
  // Test 1: Basic server startup
  console.log('📋 Test 1: Basic Server Startup');
  
  const server = spawn('node', [CLI_PATH, PROJECT_ROOT, '--test-mode'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' }
  });
  
  let initialized = false;
  let responseReceived = false;
  
  // Collect server output
  server.stderr.on('data', (data) => {
    const output = data.toString();
    console.log('📊 Server stderr:', output.trim());
    
    if (output.includes('MCP server started successfully')) {
      initialized = true;
      console.log('✅ Server initialized successfully');
      
      // Send initialize request after server is ready
      setTimeout(() => {
        console.log('\n📤 Sending initialize request...');
        
        const initRequest = {
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {
              roots: {
                listChanged: true
              }
            },
            clientInfo: {
              name: 'test-client',
              version: '1.0.0'
            }
          },
          id: 1
        };
        
        const requestJson = JSON.stringify(initRequest) + '\n';
        console.log('📤 Request:', requestJson.trim());
        
        server.stdin.write(requestJson);
      }, 100);
    }
  });
  
  // Collect server responses
  server.stdout.on('data', (data) => {
    responseReceived = true;
    console.log('📥 Server stdout:', data.toString().trim());
    
    try {
      const response = JSON.parse(data.toString());
      console.log('✅ Valid JSON response received:', response);
    } catch (error) {
      console.log('❌ Invalid JSON response:', error.message);
    }
  });
  
  // Handle server errors
  server.on('error', (error) => {
    console.error('❌ Server error:', error);
  });
  
  server.on('close', (code, signal) => {
    console.log(`\n🏁 Server closed with code ${code}, signal ${signal}`);
  });
  
  // Wait for response or timeout
  await new Promise((resolve) => {
    setTimeout(() => {
      if (!responseReceived) {
        console.log('⏰ Timeout: No response received within 5 seconds');
        
        // Send a simpler ping request
        console.log('\n📤 Trying simpler ping request...');
        const pingRequest = {
          jsonrpc: '2.0',
          method: 'ping',
          id: 2
        };
        
        server.stdin.write(JSON.stringify(pingRequest) + '\n');
        
        setTimeout(() => {
          if (!responseReceived) {
            console.log('❌ No response to ping either');
          }
          server.kill();
          resolve();
        }, 2000);
      } else {
        server.kill();
        resolve();
      }
    }, 5000);
  });
  
  console.log('\n📊 Summary:');
  console.log(`  - Server initialized: ${initialized}`);
  console.log(`  - Response received: ${responseReceived}`);
  
  if (initialized && !responseReceived) {
    console.log('\n🔍 Issue: Server starts but doesn\'t respond to JSON-RPC requests');
    console.log('💡 Possible causes:');
    console.log('  1. MCP protocol version mismatch');
    console.log('  2. JSON-RPC parsing issues');
    console.log('  3. StdioServerTransport not properly connected');
    console.log('  4. Request handler not registered');
  }
}

// Run the test
debugMCPProtocol().catch(console.error);