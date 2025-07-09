#!/usr/bin/env node

/**
 * Direct LSP hover test to see raw responses
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const LSP_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer';

class DirectLSPHoverTest {
  constructor() {
    this.lsp = null;
    this.responses = [];
    this.currentId = 1;
    this.buffer = '';
  }

  async runTest() {
    console.log('🔍 DIRECT LSP HOVER TEST\n');
    console.log(`📁 Project: ${PROJECT_ROOT}`);
    console.log(`🚀 LSP: ${LSP_PATH}\n`);
    
    await this.startLSP();
    await this.initializeLSP();
    await this.loadSolution();
    
    // Wait for solution loading
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Open and test document
    await this.openDocument();
    
    // Test hover requests
    await this.testHoverRequests();
    
    await this.shutdownLSP();
  }

  async startLSP() {
    console.log('🔧 Starting LSP process...');
    
    this.lsp = spawn(LSP_PATH, [
      '--stdio',
      '--logLevel', 'Information',
      '--extensionLogDirectory', '/tmp'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: PROJECT_ROOT
    });
    
    this.lsp.stdout.on('data', (data) => {
      this.handleData(data.toString());
    });
    
    this.lsp.stderr.on('data', (data) => {
      console.log('🔧 LSP stderr:', data.toString().trim());
    });
    
    this.lsp.on('error', (error) => {
      console.error('❌ LSP process error:', error);
    });
    
    // Give LSP time to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ LSP process started\n');
  }

  handleData(data) {
    this.buffer += data;
    
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const headers = this.buffer.substring(0, headerEnd);
      const contentLengthMatch = headers.match(/Content-Length: (\d+)/i);
      
      if (!contentLengthMatch) {
        this.buffer = this.buffer.substring(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1], 10);
      const messageStart = headerEnd + 4;
      
      if (this.buffer.length < messageStart + contentLength) {
        break;
      }

      const content = this.buffer.substring(messageStart, messageStart + contentLength);
      this.buffer = this.buffer.substring(messageStart + contentLength);

      try {
        const message = JSON.parse(content);
        this.responses.push(message);
        console.log('📥 LSP Response:', JSON.stringify(message, null, 2));
      } catch (error) {
        console.error('❌ Failed to parse LSP message:', error);
      }
    }
  }

  async sendRequest(method, params = {}) {
    const id = this.currentId++;
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };
    
    const content = JSON.stringify(request);
    const message = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`;
    
    console.log('📤 LSP Request:', method, JSON.stringify(params, null, 2));
    this.lsp.stdin.write(message);
    
    // Wait for response
    const timeout = 10000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const response = this.responses.find(r => r.id === id);
      if (response) {
        return response;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    throw new Error(`Timeout waiting for response to ${method}`);
  }

  async sendNotification(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      method,
      params
    };
    
    const content = JSON.stringify(request);
    const message = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`;
    
    console.log('📤 LSP Notification:', method, JSON.stringify(params, null, 2));
    this.lsp.stdin.write(message);
  }

  async initializeLSP() {
    console.log('🔄 Initializing LSP...');
    
    const initResult = await this.sendRequest('initialize', {
      processId: process.pid,
      rootUri: `file://${PROJECT_ROOT}`,
      capabilities: {
        textDocument: {
          hover: { 
            dynamicRegistration: false, 
            contentFormat: ['markdown', 'plaintext'] 
          },
          synchronization: {
            didOpen: true,
            didChange: true,
            didClose: true
          }
        },
        workspace: {
          workspaceFolders: true,
          symbol: { dynamicRegistration: false }
        }
      },
      workspaceFolders: [{
        uri: `file://${PROJECT_ROOT}`,
        name: 'root'
      }]
    });
    
    await this.sendNotification('initialized', {});
    console.log('✅ LSP initialized\n');
  }

  async loadSolution() {
    console.log('🔄 Loading solution...');
    
    await this.sendNotification('solution/open', {
      solution: `file://${resolve(PROJECT_ROOT, 'csharp-ls-client.sln')}`
    });
    
    await this.sendNotification('workspace/projectInitializationComplete', {});
    
    console.log('✅ Solution loaded\n');
  }

  async openDocument() {
    console.log('🔄 Opening document...');
    
    const filePath = resolve(PROJECT_ROOT, 'Program.cs');
    const content = readFileSync(filePath, 'utf8');
    const uri = `file://${filePath}`;
    
    await this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId: 'csharp',
        version: 1,
        text: content
      }
    });
    
    console.log(`✅ Document opened: ${uri}\n`);
    
    // Show file content for reference
    console.log('📄 File content (first 10 lines):');
    const lines = content.split('\n');
    lines.slice(0, 10).forEach((line, i) => {
      console.log(`   ${i.toString().padStart(2)}: ${line}`);
    });
    console.log('');
  }

  async testHoverRequests() {
    console.log('🔍 Testing hover requests...\n');
    
    const filePath = resolve(PROJECT_ROOT, 'Program.cs');
    const uri = `file://${filePath}`;
    
    const hoverTests = [
      { line: 7, character: 11, description: 'Calculator class name' },
      { line: 17, character: 20, description: 'Add method name' },
      { line: 9, character: 21, description: 'private field _value' },
      { line: 22, character: 16, description: 'Console.WriteLine' },
    ];
    
    for (const test of hoverTests) {
      console.log(`📍 Testing hover: ${test.description} at line ${test.line}, char ${test.character}`);
      
      try {
        const hoverResult = await this.sendRequest('textDocument/hover', {
          textDocument: { uri },
          position: { line: test.line, character: test.character }
        });
        
        console.log('📄 Hover result:', JSON.stringify(hoverResult, null, 2));
        
        if (hoverResult.result && hoverResult.result.contents) {
          console.log('✅ Got hover contents!');
        } else {
          console.log('❌ No hover contents in result');
        }
        
      } catch (error) {
        console.log('❌ Hover request failed:', error.message);
      }
      
      console.log('');
    }
  }

  async shutdownLSP() {
    console.log('🔄 Shutting down LSP...');
    
    try {
      await this.sendRequest('shutdown', {});
      await this.sendNotification('exit', {});
    } catch (error) {
      console.log('⚠️ Shutdown error (expected):', error.message);
    }
    
    this.lsp.kill();
    console.log('✅ LSP shutdown complete');
  }
}

// Run the test
const test = new DirectLSPHoverTest();
test.runTest().catch(console.error);