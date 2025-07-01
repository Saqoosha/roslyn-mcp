#!/usr/bin/env node
/**
 * Test for hover tool functionality with real LSP integration
 * Tests Phase 1.4: First LSP Bridge Tool - hover
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function testHoverTool() {
  console.log('🧪 Testing Hover Tool with LSP Integration...');
  
  try {
    // Start the MCP server with LSP integration (no test mode)
    const parentDir = dirname(__dirname);
    const serverProcess = spawn('node', [join(__dirname, 'dist/cli.js'), '--log-level', 'debug', '--project', parentDir], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let serverReady = false;
    let hoverTestExecuted = false;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        serverProcess.kill();
        reject(new Error('Test timeout - hover tool test took too long'));
      }, 20000); // Longer timeout for full integration test

      const checkOutput = (output) => {
        if (output.includes('ready to accept connections')) {
          serverReady = true;
          console.log('✅ Server ready, testing hover tool...');
          
          // Test hover tool by sending MCP request
          setTimeout(() => {
            testHoverRequest(serverProcess);
          }, 1000);
        }
        
        if (output.includes('Tool hover executed successfully')) {
          hoverTestExecuted = true;
          console.log('✅ Hover tool executed successfully');
          
          setTimeout(() => {
            clearTimeout(timeout);
            serverProcess.kill();
            
            if (serverReady && hoverTestExecuted) {
              console.log('\n🎉 Hover Tool test PASSED!');
              console.log('✅ Server startup with LSP');
              console.log('✅ Hover tool execution');
              console.log('✅ LSP-to-MCP bridge working');
              resolve(true);
            } else {
              reject(new Error(`Not all test conditions were met. Ready: ${serverReady}, Hover: ${hoverTestExecuted}`));
            }
          }, 500);
        }
      };

      const testHoverRequest = (process) => {
        // Test hover on "Calculator" class name at line 4, character 18
        const hoverRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'hover',
            arguments: {
              filePath: 'test-sample.cs',
              line: 4, // "public class Calculator" 
              character: 18 // Position on "Calculator"
            }
          }
        };
        
        const message = JSON.stringify(hoverRequest);
        const content = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`;
        
        console.log('📨 Sending hover tool request for Calculator class');
        process.stdin.write(content);
      };

      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('📤 Server output:', output.trim());
        checkOutput(output);
      });

      serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log('📤 Server stderr:', output.trim());
        checkOutput(output);
        
        // Check for errors
        if (output.includes('Failed to start LSP client') || output.includes('Failed to start server')) {
          clearTimeout(timeout);
          serverProcess.kill();
          reject(new Error('Server failed to start: ' + output));
        }
      });

      serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Server process error: ${error.message}`));
      });

      serverProcess.on('exit', (code, signal) => {
        clearTimeout(timeout);
        // Normal exit is expected when we kill the process
        if (code === null && signal === 'SIGTERM') {
          return;
        }
        if (code !== 0 && code !== null) {
          reject(new Error(`Server exited unexpectedly with code ${code}, signal ${signal}`));
        }
      });
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testHoverTool()
  .then(() => {
    console.log('\n🚀 Phase 1.4 Hover Tool test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Phase 1.4 test failed:', error);
    process.exit(1);
  });