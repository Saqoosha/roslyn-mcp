#!/usr/bin/env node

/**
 * 🔧 REMAINING TOOLS PRECISION TEST
 * 
 * Tests definitions, references, code actions, and formatting with complex scenarios
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const CLI_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js';

class RemainingToolsTest {
  constructor() {
    this.server = null;
    this.responses = [];
    this.currentId = 1;
    this.serverReady = false;
  }

  async runTests() {
    console.log('🔧 REMAINING TOOLS PRECISION TEST\n');
    
    await this.startServer();
    await this.waitForServer();
    
    await this.testDefinitions();
    await this.testReferences();
    await this.testCodeActions();
    await this.testFormatting();
    await this.testSignatureHelp();
    
    await this.stopServer();
  }

  async startServer() {
    console.log('🚀 Starting server...');
    
    this.server = spawn('node', [CLI_PATH, PROJECT_ROOT], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.server.stderr.on('data', (data) => {
      if (data.toString().includes('MCP server started successfully')) {
        this.serverReady = true;
      }
    });
    
    this.server.stdout.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        this.responses.push(response);
      } catch (error) {}
    });
  }

  async waitForServer() {
    while (!this.serverReady) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Server ready!\n');
  }

  async sendRequest(name, toolName, args) {
    const startTime = performance.now();
    const id = this.currentId++;
    
    const request = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: toolName, arguments: args },
      id
    };
    
    this.server.stdin.write(JSON.stringify(request) + '\n');
    
    // Wait for response
    let response = null;
    const timeout = 5000;
    const start = Date.now();
    
    while (!response && (Date.now() - start) < timeout) {
      response = this.responses.find(r => r.id === id);
      if (!response) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    const duration = performance.now() - startTime;
    const success = !!response && !response.error;
    
    console.log(`${success ? '✅' : '❌'} ${name} (${duration.toFixed(2)}ms)`);
    
    if (success && response.result?.content?.[0]?.text) {
      const content = response.result.content[0].text;
      if (content.includes('Found') || content.includes('📍')) {
        const count = (content.match(/📍/g) || []).length;
        console.log(`   Found ${count} results`);
      } else if (content.includes('✅') || content.includes('❌')) {
        console.log(`   ${content.split('\\n')[0]}`);
      }
    }
    
    if (!success && response?.error) {
      console.log(`   Error: ${response.error.message}`);
    }
    
    return { success, response, duration };
  }

  async testDefinitions() {
    console.log('🎯 DEFINITIONS TESTS');
    console.log('=' .repeat(40));
    
    const tests = [
      // Basic tests
      { file: 'Program.cs', line: 7, character: 11, desc: 'Calculator class' },
      { file: 'Program.cs', line: 17, character: 20, desc: 'Add method' },
      { file: 'Program.cs', line: 9, character: 21, desc: 'Private field _value' },
      { file: 'Program.cs', line: 47, character: 21, desc: 'Main method' },
      
      // Complex features
      { file: 'ComplexFeaturesTest.cs', line: 50, character: 18, desc: 'Customer class' },
      { file: 'ComplexFeaturesTest.cs', line: 8, character: 25, desc: 'IRepository interface' },
      { file: 'ComplexFeaturesTest.cs', line: 20, character: 25, desc: 'BaseEntity class' },
      
      // Edge cases
      { file: 'EdgeCasesTest.cs', line: 8, character: 20, desc: 'Unicode property' },
      { file: 'Program.cs', line: 1000, character: 10, desc: 'Invalid position' }
    ];
    
    for (const test of tests) {
      await this.sendRequest(
        `Definition - ${test.desc}`,
        'definitions',
        {
          filePath: test.file,
          line: test.line,
          character: test.character
        }
      );
    }
    
    console.log('');
  }

  async testReferences() {
    console.log('🔗 REFERENCES TESTS');
    console.log('=' .repeat(40));
    
    const tests = [
      // Basic references
      { file: 'Program.cs', line: 7, character: 11, desc: 'Calculator class usage' },
      { file: 'Program.cs', line: 17, character: 20, desc: 'Add method usage' },
      { file: 'Program.cs', line: 9, character: 21, desc: '_value field usage' },
      
      // With and without declaration
      { file: 'Program.cs', line: 7, character: 11, desc: 'Calculator with declaration', includeDeclaration: true },
      { file: 'Program.cs', line: 7, character: 11, desc: 'Calculator without declaration', includeDeclaration: false },
      
      // Complex file references
      { file: 'ComplexFeaturesTest.cs', line: 50, character: 18, desc: 'Customer references' },
      { file: 'ComplexFeaturesTest.cs', line: 133, character: 18, desc: 'Order references' }
    ];
    
    for (const test of tests) {
      await this.sendRequest(
        `References - ${test.desc}`,
        'references',
        {
          filePath: test.file,
          line: test.line,
          character: test.character,
          ...(test.includeDeclaration !== undefined && { includeDeclaration: test.includeDeclaration })
        }
      );
    }
    
    console.log('');
  }

  async testCodeActions() {
    console.log('🛠️ CODE ACTIONS TESTS');
    console.log('=' .repeat(40));
    
    const tests = [
      // Basic code actions
      { 
        file: 'Program.cs', 
        line: 9, character: 21, endLine: 9, endCharacter: 27,
        desc: 'Field suggestions'
      },
      { 
        file: 'Program.cs', 
        line: 12, character: 16, endLine: 12, endCharacter: 25,
        desc: 'Constructor suggestions'
      },
      
      // Method code actions
      { 
        file: 'Program.cs', 
        line: 17, character: 20, endLine: 17, endCharacter: 23,
        desc: 'Method suggestions'
      },
      
      // Complex file code actions
      { 
        file: 'ComplexFeaturesTest.cs', 
        line: 50, character: 18, endLine: 50, endCharacter: 26,
        desc: 'Complex class suggestions'
      },
      
      // Error-prone areas
      { 
        file: 'EdgeCasesTest.cs', 
        line: 35, character: 20, endLine: 35, endCharacter: 30,
        desc: 'Syntax error suggestions'
      },
      
      // Large selection
      { 
        file: 'Program.cs', 
        line: 15, character: 8, endLine: 20, endCharacter: 16,
        desc: 'Multi-line selection'
      }
    ];
    
    for (const test of tests) {
      await this.sendRequest(
        `Code Actions - ${test.desc}`,
        'codeActions',
        {
          filePath: test.file,
          line: test.line,
          character: test.character,
          endLine: test.endLine,
          endCharacter: test.endCharacter
        }
      );
    }
    
    console.log('');
  }

  async testFormatting() {
    console.log('📝 FORMATTING TESTS');
    console.log('=' .repeat(40));
    
    const tests = [
      // Basic formatting
      { file: 'Program.cs', desc: 'Basic program file', options: {} },
      
      // Different tab sizes
      { file: 'Program.cs', desc: 'Tab size 2', options: { tabSize: 2 } },
      { file: 'Program.cs', desc: 'Tab size 8', options: { tabSize: 8 } },
      
      // Spaces vs tabs
      { file: 'Program.cs', desc: 'Use tabs', options: { insertSpaces: false } },
      { file: 'Program.cs', desc: 'Use spaces', options: { insertSpaces: true } },
      
      // Whitespace options
      { 
        file: 'Program.cs', 
        desc: 'Trim whitespace + final newline',
        options: { 
          trimTrailingWhitespace: true, 
          insertFinalNewline: true 
        }
      },
      
      // Complex files
      { file: 'ComplexFeaturesTest.cs', desc: 'Complex features file', options: {} },
      { file: 'EdgeCasesTest.cs', desc: 'Edge cases file', options: {} },
      
      // Non-existent file
      { file: 'DoesNotExist.cs', desc: 'Non-existent file', options: {} }
    ];
    
    for (const test of tests) {
      await this.sendRequest(
        `Formatting - ${test.desc}`,
        'formatting',
        {
          filePath: test.file,
          ...test.options
        }
      );
    }
    
    console.log('');
  }

  async testSignatureHelp() {
    console.log('✋ SIGNATURE HELP TESTS');
    console.log('=' .repeat(40));
    
    const tests = [
      // Method calls
      { file: 'Program.cs', line: 19, character: 12, desc: 'Add method call' },
      { file: 'Program.cs', line: 25, character: 15, desc: 'Subtract method call' },
      
      // Constructor calls
      { file: 'Program.cs', line: 50, character: 25, desc: 'Calculator constructor' },
      
      // Complex method signatures
      { file: 'ComplexFeaturesTest.cs', line: 75, character: 20, desc: 'Complex generic method' },
      { file: 'ComplexFeaturesTest.cs', line: 200, character: 25, desc: 'Async method signature' },
      
      // System method calls
      { file: 'Program.cs', line: 49, character: 20, desc: 'Console.WriteLine' },
      
      // Invalid positions
      { file: 'Program.cs', line: 5, character: 0, desc: 'Empty line' },
      { file: 'Program.cs', line: 1000, character: 10, desc: 'Invalid position' }
    ];
    
    for (const test of tests) {
      await this.sendRequest(
        `Signature Help - ${test.desc}`,
        'signatureHelp',
        {
          filePath: test.file,
          line: test.line,
          character: test.character
        }
      );
    }
    
    console.log('');
  }

  async stopServer() {
    if (this.server) {
      this.server.kill();
    }
  }
}

// Run the remaining tools test
const test = new RemainingToolsTest();
test.runTests().catch(console.error);