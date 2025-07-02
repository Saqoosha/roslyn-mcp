#!/usr/bin/env node
/**
 * Simple test for MCP server functionality
 * Tests Phase 1.2: Basic MCP Server startup and tool registration
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function testBasicMCPStartup() {
  console.log('🧪 Testing Basic MCP Server Startup...');
  
  try {
    // Start the MCP server in test mode
    const serverProcess = spawn('node', [join(__dirname, 'dist/cli.js'), '--log-level', 'debug', '--test-mode'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let serverStarted = false;
    let toolsRegistered = false;
    let testModeEnabled = false;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        serverProcess.kill();
        reject(new Error('Test timeout - server took too long to start'));
      }, 5000);

      const checkOutput = (output) => {
        if (output.includes('Registered') && output.includes('tools')) {
          toolsRegistered = true;
          console.log('✅ Tools registered successfully');
        }
        
        if (output.includes('Test mode: enabled')) {
          testModeEnabled = true;
          console.log('✅ Test mode enabled successfully');
        }
        
        if (output.includes('MCP server started successfully')) {
          serverStarted = true;
          console.log('✅ MCP server started successfully');
        }
        
        if (output.includes('ready to accept connections')) {
          console.log('✅ Server ready to accept connections');
          
          // Give it a moment to fully initialize, then test success
          setTimeout(() => {
            clearTimeout(timeout);
            serverProcess.kill();
            
            if (serverStarted && toolsRegistered && testModeEnabled) {
              console.log('\n🎉 Basic MCP Server startup test PASSED!');
              console.log('✅ Server initialization');
              console.log('✅ Tool registration');
              console.log('✅ Test mode functionality');
              resolve(true);
            } else {
              reject(new Error(`Not all test conditions were met. Started: ${serverStarted}, Tools: ${toolsRegistered}, TestMode: ${testModeEnabled}`));
            }
          }, 500);
        }
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
      });

      serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Server process error: ${error.message}`));
      });

      serverProcess.on('exit', (code, signal) => {
        clearTimeout(timeout);
        // Normal exit is expected when we kill the process
        if (code === null && signal === 'SIGTERM') {
          // This is expected - we killed it
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
testBasicMCPStartup()
  .then(() => {
    console.log('\n🚀 Phase 1.2 Basic MCP Server test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Phase 1.2 test failed:', error);
    process.exit(1);
  });