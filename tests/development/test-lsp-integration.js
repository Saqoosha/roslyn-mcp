#!/usr/bin/env node
/**
 * Test for LSP client integration with Roslyn
 * Tests Phase 1.3: Roslyn LSP Client functionality
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function testLSPIntegration() {
  console.log('🧪 Testing LSP Integration...');
  
  try {
    // Start the MCP server WITHOUT test mode to test real LSP integration
    // Use the parent directory which has a C# project
    const parentDir = dirname(__dirname);
    const serverProcess = spawn('node', [join(__dirname, 'dist/cli.js'), '--log-level', 'debug', '--project', parentDir], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let lspStarted = false;
    let mcpStarted = false;
    let serverReady = false;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        serverProcess.kill();
        reject(new Error('Test timeout - LSP integration took too long'));
      }, 15000); // Longer timeout for LSP startup

      const checkOutput = (output) => {
        if (output.includes('LSP client started successfully')) {
          lspStarted = true;
          console.log('✅ LSP client started successfully');
        }
        
        if (output.includes('MCP server started successfully')) {
          mcpStarted = true;
          console.log('✅ MCP server started successfully');
        }
        
        if (output.includes('ready to accept connections')) {
          serverReady = true;
          console.log('✅ Server ready to accept connections');
          
          // Give it a moment, then test success
          setTimeout(() => {
            clearTimeout(timeout);
            serverProcess.kill();
            
            if (lspStarted && mcpStarted && serverReady) {
              console.log('\n🎉 LSP Integration test PASSED!');
              console.log('✅ LSP client initialization');
              console.log('✅ MCP server startup');
              console.log('✅ Full integration working');
              resolve(true);
            } else {
              reject(new Error(`Not all test conditions were met. LSP: ${lspStarted}, MCP: ${mcpStarted}, Ready: ${serverReady}`));
            }
          }, 1000);
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
        
        // Also check for errors
        if (output.includes('Failed to start LSP client') || output.includes('Failed to start server')) {
          clearTimeout(timeout);
          serverProcess.kill();
          reject(new Error('LSP client failed to start: ' + output));
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
testLSPIntegration()
  .then(() => {
    console.log('\n🚀 Phase 1.3 LSP Integration test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Phase 1.3 test failed:', error);
    process.exit(1);
  });