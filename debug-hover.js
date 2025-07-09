#!/usr/bin/env node

/**
 * Debug hover responses to understand "No type info" issue
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const CLI_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js';

class HoverDebugTest {
  constructor() {
    this.server = null;
    this.responses = [];
    this.currentId = 1;
    this.serverReady = false;
  }

  async runTest() {
    console.log('🔍 HOVER DEBUG TEST\n');
    console.log(`📁 Project: ${PROJECT_ROOT}`);
    console.log(`🚀 CLI: ${CLI_PATH}\n`);
    
    await this.startServer();
    await this.waitForServer();
    
    // Initialize
    await this.initialize();
    
    // Test hover on different symbols
    const hoverTests = [
      { file: 'Program.cs', line: 7, character: 11, description: 'Calculator class name', expected: 'class Calculator' },
      { file: 'Program.cs', line: 17, character: 20, description: 'Add method name', expected: 'method Add' },
      { file: 'Program.cs', line: 9, character: 21, description: 'private field', expected: 'field _value' },
      { file: 'Program.cs', line: 22, character: 16, description: 'Console.WriteLine', expected: 'Console method' },
    ];
    
    console.log('🔍 Testing hover with detailed responses:');
    console.log('='.repeat(60));
    
    for (const test of hoverTests) {
      console.log(`\n📍 Testing: ${test.description} at ${test.file}:${test.line}:${test.character}`);
      const result = await this.testHover(test.file, test.line, test.character);
      
      console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'} (${result.duration.toFixed(2)}ms)`);
      
      if (result.success && result.response) {
        console.log('   📄 Raw Response Content:');
        console.log('   ', JSON.stringify(result.response, null, 2));
        
        if (result.response.result?.content?.[0]?.text) {
          const text = result.response.result.content[0].text;
          console.log('   📝 Formatted Text:');
          console.log('   ', text.replace(/\n/g, '\n    '));
        }
      } else if (result.response?.error) {
        console.log('   ❌ Error:', result.response.error);
      }
      
      console.log('   ' + '-'.repeat(50));
    }
    
    await this.stopServer();
  }

  async startServer() {
    console.log('🔧 Starting MCP Server...');
    
    this.server = spawn('node', [CLI_PATH, PROJECT_ROOT], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    this.server.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('🔧 Server:', output.trim());
      if (output.includes('MCP server started successfully')) {
        this.serverReady = true;
      }
    });
    
    this.server.stdout.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        this.responses.push({
          ...response,
          receivedAt: performance.now()
        });
      } catch (error) {
        // Ignore parsing errors
      }
    });
  }

  async waitForServer() {
    console.log('⏳ Waiting for server initialization...');
    
    while (!this.serverReady) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Wait for solution loading to complete
    await new Promise(resolve => setTimeout(resolve, 8000));
    console.log('✅ Server ready!\n');
  }

  async initialize() {
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'hover-debug-client', version: '1.0.0' }
    });
  }

  async testHover(file, line, character) {
    const startTime = performance.now();
    
    const result = await this.sendRequest('tools/call', {
      name: 'hover',
      arguments: {
        filePath: file,
        line: line,
        character: character
      }
    });
    
    const duration = performance.now() - startTime;
    
    return {
      success: !!result && !result.error,
      duration,
      response: result
    };
  }

  async sendRequest(method, params = {}) {
    const id = this.currentId++;
    
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };
    
    this.server.stdin.write(JSON.stringify(request) + '\n');
    
    // Wait for response
    let response = null;
    const timeout = 15000; // 15 second timeout
    const pollInterval = 50;
    let elapsed = 0;
    
    while (!response && elapsed < timeout) {
      response = this.responses.find(r => r.id === id);
      if (!response) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        elapsed += pollInterval;
      }
    }
    
    return response || { error: 'Timeout' };
  }

  async stopServer() {
    if (this.server) {
      this.server.kill();
      await new Promise(resolve => {
        this.server.on('close', resolve);
      });
    }
  }
}

// Run the test
const test = new HoverDebugTest();
test.runTest().catch(console.error);