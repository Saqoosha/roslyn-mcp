#!/usr/bin/env node
/**
 * Basic test for MCP server functionality
 * Tests Phase 1.2: Basic MCP Server with ping tool
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function testBasicMCP() {
  console.log('🧪 Testing Basic MCP Server...');
  
  try {
    // Start the MCP server in current directory (temporary for testing)
    const serverProcess = spawn('node', [join(__dirname, 'dist/cli.js'), '--log-level', 'debug', '--test-mode'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let initialized = false;
    let toolsListed = false;
    let pingExecuted = false;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        serverProcess.kill();
        reject(new Error('Test timeout - server took too long to start'));
      }, 10000);

      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('📤 Server output:', output);
        
        if (output.includes('MCP server started successfully')) {
          initialized = true;
          console.log('✅ Server initialized successfully');
          
          // Test tools/list request
          const listRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {}
          };
          
          const message = JSON.stringify(listRequest);
          const content = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`;
          
          console.log('📨 Sending tools/list request');
          serverProcess.stdin.write(content);
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log('📤 Server stderr:', output);
        
        // Check for successful tool listing
        if (output.includes('Listed') && output.includes('tools')) {
          toolsListed = true;
          console.log('✅ Tools listed successfully');
          
          // Test ping tool execution
          const pingRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'ping',
              arguments: {
                message: 'test-message'
              }
            }
          };
          
          const message = JSON.stringify(pingRequest);
          const content = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`;
          
          console.log('📨 Sending ping tool request');
          serverProcess.stdin.write(content);
        }
        
        // Check for successful ping execution
        if (output.includes('Tool ping executed successfully')) {
          pingExecuted = true;
          console.log('✅ Ping tool executed successfully');
          
          clearTimeout(timeout);
          serverProcess.kill();
          
          if (initialized && toolsListed && pingExecuted) {
            console.log('\n🎉 Basic MCP Server test PASSED!');
            console.log('✅ Server initialization');
            console.log('✅ Tools listing');
            console.log('✅ Ping tool execution');
            resolve(true);
          } else {
            reject(new Error('Not all test conditions were met'));
          }
        }
      });

      serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Server process error: ${error.message}`));
      });

      serverProcess.on('exit', (code, signal) => {
        clearTimeout(timeout);
        if (code !== 0 && code !== null) {
          reject(new Error(`Server exited with code ${code}, signal ${signal}`));
        }
      });
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testBasicMCP()
  .then(() => {
    console.log('\n🚀 Phase 1.2 Basic MCP Server test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Phase 1.2 test failed:', error);
    process.exit(1);
  });