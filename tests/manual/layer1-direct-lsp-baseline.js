#!/usr/bin/env node

/**
 * 🧪 LAYER 1: DIRECT ROSLYN LSP BASELINE TESTING
 * 
 * Tests Roslyn LSP directly to establish baseline performance
 * for workspace symbols, hover, definitions, references, signature help
 */

import { spawn } from 'child_process';
import path from 'path';
import { performance } from 'perf_hooks';
import fs from 'fs';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const LSP_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer';
const LOG_FILE = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/tests/ULTRA_SYSTEMATIC_TESTING_PROGRESS.md';

class DirectLSPTester {
  constructor() {
    this.lspServer = null;
    this.responses = [];
    this.currentId = 1;
    this.serverReady = false;
    this.logs = [];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    this.logs.push(logEntry);
  }

  async updateProgressFile(section, content) {
    try {
      let progressContent = await fs.promises.readFile(LOG_FILE, 'utf8');
      
      // Update the specific section
      const sectionRegex = new RegExp(`(#### ${section}[\\s\\S]*?)(?=####|---|\n\n## |$)`, 'g');
      progressContent = progressContent.replace(sectionRegex, content);
      
      await fs.promises.writeFile(LOG_FILE, progressContent);
    } catch (error) {
      this.log(`Error updating progress file: ${error.message}`);
    }
  }

  async runBaselineTests() {
    this.log('🧪 STARTING LAYER 1: DIRECT ROSLYN LSP BASELINE TESTING');
    this.log(`📁 Project: ${PROJECT_ROOT}`);
    this.log(`🚀 LSP: ${LSP_PATH}`);
    
    await this.startLSPServer();
    await this.initializeServer();
    
    // Run systematic tests
    await this.testWorkspaceSymbols();
    await this.testHover();
    await this.testDefinitions();
    await this.testReferences();
    await this.testSignatureHelp();
    
    await this.stopLSPServer();
    await this.generateReport();
  }

  async startLSPServer() {
    this.log('🔧 Starting Roslyn LSP server...');
    
    // Use exact same parameters as working MCP server
    this.lspServer = spawn(LSP_PATH, [
      '--stdio',
      '--logLevel', 'Information',
      '--extensionLogDirectory', '/tmp'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: PROJECT_ROOT
    });
    
    // Handle stderr (logs)
    this.lspServer.stderr.on('data', (data) => {
      const output = data.toString();
      this.log(`LSP STDERR: ${output.trim()}`);
      if (output.includes('Language server initialized')) {
        this.serverReady = true;
      }
    });
    
    // Handle stdout (LSP protocol messages)
    let buffer = '';
    this.lspServer.stdout.on('data', (data) => {
      buffer += data.toString();
      
      // Parse LSP messages (Content-Length header format)
      while (true) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;
        
        const headers = buffer.substring(0, headerEnd);
        const contentLengthMatch = headers.match(/Content-Length: (\d+)/i);
        
        if (!contentLengthMatch) {
          this.log('❌ Invalid LSP message: missing Content-Length');
          buffer = buffer.substring(headerEnd + 4);
          continue;
        }
        
        const contentLength = parseInt(contentLengthMatch[1]);
        const messageStart = headerEnd + 4;
        
        if (buffer.length < messageStart + contentLength) {
          break; // Wait for more data
        }
        
        const messageJson = buffer.substring(messageStart, messageStart + contentLength);
        buffer = buffer.substring(messageStart + contentLength);
        
        try {
          const response = JSON.parse(messageJson);
          this.responses.push({
            ...response,
            receivedAt: performance.now()
          });
        } catch (error) {
          this.log(`❌ Failed to parse LSP message: ${error.message}`);
        }
      }
    });
    
    // Wait for server to start
    let attempts = 0;
    while (!this.serverReady && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
    }
    
    if (!this.serverReady) {
      throw new Error('LSP server failed to start');
    }
    
    this.log('✅ LSP server started');
  }

  async initializeServer() {
    this.log('🔄 Initializing LSP server...');
    
    const initRequest = {
      jsonrpc: '2.0',
      id: this.currentId++,
      method: 'initialize',
      params: {
        processId: process.pid,
        rootUri: `file://${PROJECT_ROOT}`,
        workspaceFolders: [{
          uri: `file://${PROJECT_ROOT}`,
          name: 'test-projects'
        }],
        capabilities: {
          workspace: {
            workspaceSymbol: { dynamicRegistration: false },
            configuration: true,
            workspaceFolders: true
          },
          textDocument: {
            hover: { dynamicRegistration: false },
            definition: { dynamicRegistration: false },
            references: { dynamicRegistration: false },
            signatureHelp: { dynamicRegistration: false }
          }
        }
      }
    };
    
    const response = await this.sendLSPRequest('Initialize', initRequest);
    
    // Send initialized notification
    const initializedNotification = {
      jsonrpc: '2.0',
      method: 'initialized',
      params: {}
    };
    
    let notificationJson = JSON.stringify(initializedNotification);
    let message = `Content-Length: ${notificationJson.length}\r\n\r\n${notificationJson}`;
    this.lspServer.stdin.write(message);
    
    // Load solution
    const solutionPath = path.join(PROJECT_ROOT, 'csharp-ls-client.sln');
    const openSolutionNotification = {
      jsonrpc: '2.0',
      method: 'solution/open',
      params: {
        solution: `file://${solutionPath}`
      }
    };
    
    notificationJson = JSON.stringify(openSolutionNotification);
    message = `Content-Length: ${notificationJson.length}\r\n\r\n${notificationJson}`;
    this.lspServer.stdin.write(message);
    
    // Wait for solution loading
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    this.log('✅ LSP server initialized and solution loaded');
  }

  async sendLSPRequest(name, request) {
    const startTime = performance.now();
    
    // Send LSP request with proper Content-Length header
    const requestJson = JSON.stringify(request);
    const message = `Content-Length: ${requestJson.length}\r\n\r\n${requestJson}`;
    this.lspServer.stdin.write(message);
    
    // Wait for response
    let response = null;
    const timeout = 10000;
    const pollInterval = 50;
    let elapsed = 0;
    
    while (!response && elapsed < timeout) {
      response = this.responses.find(r => r.id === request.id);
      if (!response) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        elapsed += pollInterval;
      }
    }
    
    const duration = performance.now() - startTime;
    
    const result = {
      name,
      request,
      response: response || { error: 'Timeout' },
      duration,
      success: !!response && !response.error,
      timestamp: new Date().toISOString()
    };
    
    this.log(`${result.success ? '✅' : '❌'} ${name} (${duration.toFixed(2)}ms)`);
    
    return result;
  }

  async testWorkspaceSymbols() {
    this.log('\n🔍 TESTING WORKSPACE SYMBOLS');
    this.log('=' .repeat(40));
    
    const queries = ['Calculator', 'Program', 'Add', 'Main', 'TestProject'];
    const results = [];
    
    for (const query of queries) {
      const request = {
        jsonrpc: '2.0',
        id: this.currentId++,
        method: 'workspace/symbol',
        params: { query }
      };
      
      const result = await this.sendLSPRequest(`WorkspaceSymbol-${query}`, request);
      results.push(result);
      
      if (result.success && result.response.result) {
        this.log(`   Found ${result.response.result.length} symbols for "${query}"`);
        result.response.result.slice(0, 3).forEach(symbol => {
          this.log(`     - ${symbol.name} (${symbol.kind})`);
        });
      } else {
        this.log(`   No symbols found for "${query}"`);
      }
    }
    
    // Update progress file
    await this.updateWorkspaceSymbolsProgress(results);
  }

  async testHover() {
    this.log('\n🎯 TESTING HOVER');
    this.log('=' .repeat(40));
    
    const positions = [
      { file: 'Program.cs', line: 6, character: 11, desc: 'Calculator class' },
      { file: 'Program.cs', line: 16, character: 20, desc: 'Add method' },
      { file: 'Program.cs', line: 8, character: 21, desc: '_value field' },
      { file: 'Program.cs', line: 46, character: 21, desc: 'Main method' }
    ];
    
    const results = [];
    
    for (const pos of positions) {
      const fileUri = `file://${PROJECT_ROOT}/${pos.file}`;
      const request = {
        jsonrpc: '2.0',
        id: this.currentId++,
        method: 'textDocument/hover',
        params: {
          textDocument: { uri: fileUri },
          position: { line: pos.line, character: pos.character }
        }
      };
      
      const result = await this.sendLSPRequest(`Hover-${pos.desc}`, request);
      results.push(result);
      
      if (result.success && result.response.result) {
        const hoverContent = result.response.result.contents?.value || 
                           result.response.result.contents?.[0]?.value || 
                           'No content';
        this.log(`   Hover info: ${hoverContent.substring(0, 100)}...`);
      }
    }
    
    await this.updateHoverProgress(results);
  }

  async testDefinitions() {
    this.log('\n📍 TESTING DEFINITIONS');
    this.log('=' .repeat(40));
    
    const positions = [
      { file: 'Program.cs', line: 6, character: 11, desc: 'Calculator class' },
      { file: 'Program.cs', line: 16, character: 20, desc: 'Add method' },
      { file: 'Program.cs', line: 49, character: 25, desc: 'Calculator constructor call' }
    ];
    
    const results = [];
    
    for (const pos of positions) {
      const fileUri = `file://${PROJECT_ROOT}/${pos.file}`;
      const request = {
        jsonrpc: '2.0',
        id: this.currentId++,
        method: 'textDocument/definition',
        params: {
          textDocument: { uri: fileUri },
          position: { line: pos.line, character: pos.character }
        }
      };
      
      const result = await this.sendLSPRequest(`Definition-${pos.desc}`, request);
      results.push(result);
      
      if (result.success && result.response.result) {
        const definitions = Array.isArray(result.response.result) ? 
                          result.response.result : [result.response.result];
        this.log(`   Found ${definitions.length} definitions`);
      }
    }
    
    await this.updateDefinitionsProgress(results);
  }

  async testReferences() {
    this.log('\n🔗 TESTING REFERENCES');
    this.log('=' .repeat(40));
    
    const positions = [
      { file: 'Program.cs', line: 6, character: 11, desc: 'Calculator class' },
      { file: 'Program.cs', line: 16, character: 20, desc: 'Add method' }
    ];
    
    const results = [];
    
    for (const pos of positions) {
      const fileUri = `file://${PROJECT_ROOT}/${pos.file}`;
      const request = {
        jsonrpc: '2.0',
        id: this.currentId++,
        method: 'textDocument/references',
        params: {
          textDocument: { uri: fileUri },
          position: { line: pos.line, character: pos.character },
          context: { includeDeclaration: true }
        }
      };
      
      const result = await this.sendLSPRequest(`References-${pos.desc}`, request);
      results.push(result);
      
      if (result.success && result.response.result) {
        this.log(`   Found ${result.response.result.length} references`);
      }
    }
    
    await this.updateReferencesProgress(results);
  }

  async testSignatureHelp() {
    this.log('\n✋ TESTING SIGNATURE HELP');
    this.log('=' .repeat(40));
    
    const positions = [
      { file: 'Program.cs', line: 49, character: 30, desc: 'Calculator constructor call' },
      { file: 'Program.cs', line: 50, character: 20, desc: 'Add method call' }
    ];
    
    const results = [];
    
    for (const pos of positions) {
      const fileUri = `file://${PROJECT_ROOT}/${pos.file}`;
      const request = {
        jsonrpc: '2.0',
        id: this.currentId++,
        method: 'textDocument/signatureHelp',
        params: {
          textDocument: { uri: fileUri },
          position: { line: pos.line, character: pos.character }
        }
      };
      
      const result = await this.sendLSPRequest(`SignatureHelp-${pos.desc}`, request);
      results.push(result);
      
      if (result.success && result.response.result) {
        const signatures = result.response.result.signatures || [];
        this.log(`   Found ${signatures.length} signatures`);
      }
    }
    
    await this.updateSignatureHelpProgress(results);
  }

  async updateWorkspaceSymbolsProgress(results) {
    const successfulResults = results.filter(r => r.success && r.response.result?.length > 0);
    const content = `#### 🔍 Workspace Symbols Test
- **Status**: ${successfulResults.length > 0 ? '✅ WORKING' : '❌ FAILED'}
- **Success Rate**: ${successfulResults.length}/${results.length}
- **Details**: ${successfulResults.length > 0 ? 'LSP returning symbols' : 'No symbols found in any query'}

${results.map(r => `
**Query**: "${r.request.params.query}"
- **Status**: ${r.success ? '✅' : '❌'}
- **Results**: ${r.response.result?.length || 0} symbols
- **Time**: ${r.duration.toFixed(2)}ms
`).join('')}

`;
    
    await this.updateProgressFile('🔍 Workspace Symbols Test', content);
  }

  async updateHoverProgress(results) {
    const successfulResults = results.filter(r => r.success && r.response.result);
    const content = `#### 🎯 Hover Test
- **Status**: ${successfulResults.length > 0 ? '✅ WORKING' : '❌ FAILED'}
- **Success Rate**: ${successfulResults.length}/${results.length}

${results.map(r => `
**Position**: ${r.request.params.textDocument.uri.split('/').pop()}:${r.request.params.position.line}:${r.request.params.position.character}
- **Status**: ${r.success ? '✅' : '❌'}
- **Has Content**: ${r.response.result?.contents ? '✅' : '❌'}
- **Time**: ${r.duration.toFixed(2)}ms
`).join('')}

`;
    
    await this.updateProgressFile('🎯 Hover Test', content);
  }

  async updateDefinitionsProgress(results) {
    const successfulResults = results.filter(r => r.success && r.response.result);
    const content = `#### 📍 Definition Test
- **Status**: ${successfulResults.length > 0 ? '✅ WORKING' : '❌ FAILED'}
- **Success Rate**: ${successfulResults.length}/${results.length}

${results.map(r => `
**Position**: ${r.request.params.textDocument.uri.split('/').pop()}:${r.request.params.position.line}:${r.request.params.position.character}
- **Status**: ${r.success ? '✅' : '❌'}
- **Definitions Found**: ${Array.isArray(r.response.result) ? r.response.result.length : (r.response.result ? 1 : 0)}
- **Time**: ${r.duration.toFixed(2)}ms
`).join('')}

`;
    
    await this.updateProgressFile('📍 Definition Test', content);
  }

  async updateReferencesProgress(results) {
    const successfulResults = results.filter(r => r.success && r.response.result);
    const content = `#### 🔗 References Test
- **Status**: ${successfulResults.length > 0 ? '✅ WORKING' : '❌ FAILED'}
- **Success Rate**: ${successfulResults.length}/${results.length}

${results.map(r => `
**Position**: ${r.request.params.textDocument.uri.split('/').pop()}:${r.request.params.position.line}:${r.request.params.position.character}
- **Status**: ${r.success ? '✅' : '❌'}
- **References Found**: ${r.response.result?.length || 0}
- **Time**: ${r.duration.toFixed(2)}ms
`).join('')}

`;
    
    await this.updateProgressFile('🔗 References Test', content);
  }

  async updateSignatureHelpProgress(results) {
    const successfulResults = results.filter(r => r.success && r.response.result);
    const content = `#### ✋ Signature Help Test
- **Status**: ${successfulResults.length > 0 ? '✅ WORKING' : '❌ FAILED'}
- **Success Rate**: ${successfulResults.length}/${results.length}

${results.map(r => `
**Position**: ${r.request.params.textDocument.uri.split('/').pop()}:${r.request.params.position.line}:${r.request.params.position.character}
- **Status**: ${r.success ? '✅' : '❌'}
- **Signatures Found**: ${r.response.result?.signatures?.length || 0}
- **Time**: ${r.duration.toFixed(2)}ms
`).join('')}

`;
    
    await this.updateProgressFile('✋ Signature Help Test', content);
  }

  async generateReport() {
    this.log('\n📊 LAYER 1 BASELINE TEST COMPLETE');
    this.log('Check ULTRA_SYSTEMATIC_TESTING_PROGRESS.md for detailed results');
  }

  async stopLSPServer() {
    if (this.lspServer) {
      this.lspServer.kill();
    }
  }
}

// Run the baseline tests
const tester = new DirectLSPTester();
tester.runBaselineTests().catch(console.error);