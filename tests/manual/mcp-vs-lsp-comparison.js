#!/usr/bin/env node

/**
 * 🔍 MCP vs LSP COMPARISON TEST
 * 
 * Compare exact same queries between direct LSP and MCP bridge
 * to identify if the issue is in our bridge or the LSP itself
 */

import { spawn } from 'child_process';
import path from 'path';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const LSP_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer';
const MCP_CLI_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js';

class MCPvsLSPComparison {
  constructor() {
    this.lspResults = new Map();
    this.mcpResults = new Map();
    this.queries = ['Program', 'Add', 'Main', 'C', 'Test', 'Calculator']; // Mix of working and non-working
  }

  async runComparison() {
    console.log('🆚 MCP vs LSP COMPARISON TEST');
    console.log('=' .repeat(50));
    console.log(`📁 Project: ${PROJECT_ROOT}\n`);
    
    console.log('🔬 Phase 1: Testing Direct LSP...');
    await this.testDirectLSP();
    
    console.log('\n🔬 Phase 2: Testing MCP Bridge...');
    await this.testMCPBridge();
    
    console.log('\n📊 Phase 3: Analysis & Comparison...');
    this.analyzeResults();
  }

  async testDirectLSP() {
    return new Promise((resolve) => {
      const lspServer = spawn(LSP_PATH, [
        '--stdio',
        '--logLevel', 'Information',
        '--extensionLogDirectory', '/tmp'
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: PROJECT_ROOT
      });

      let buffer = '';
      let initialized = false;
      let queryIndex = 0;

      lspServer.stdout.on('data', (data) => {
        buffer += data.toString();
        this.parseLSPMessages(buffer, (message) => {
          if (message.method === 'window/logMessage' && 
              message.params?.message?.includes('Language server initialized')) {
            initialized = true;
            this.initializeLSP(lspServer, () => {
              this.sendLSPWorkspaceQueries(lspServer, queryIndex);
            });
          } else if (message.id >= 100 && message.id < 200) {
            // Workspace symbol responses
            const query = this.queries[message.id - 100];
            this.lspResults.set(query, {
              success: !!message.result,
              count: message.result?.length || 0,
              symbols: message.result?.slice(0, 3).map(s => s.name) || [],
              error: message.error?.message
            });
            
            console.log(`  📍 LSP "${query}": ${message.result?.length || 0} symbols`);
            
            if (this.lspResults.size === this.queries.length) {
              lspServer.kill();
              resolve();
            }
          }
        });
      });

      setTimeout(() => {
        if (!initialized) {
          console.log('❌ LSP timeout');
          lspServer.kill();
          resolve();
        }
      }, 10000);
    });
  }

  async testMCPBridge() {
    return new Promise((resolve) => {
      const mcpServer = spawn('node', [MCP_CLI_PATH, PROJECT_ROOT], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let serverReady = false;
      let responses = [];

      mcpServer.stderr.on('data', (data) => {
        if (data.toString().includes('MCP server started successfully')) {
          serverReady = true;
          console.log('  ✅ MCP server ready');
          
          // Wait for solution loading then test
          setTimeout(() => {
            this.sendMCPQueries(mcpServer, responses);
          }, 3000);
        }
      });

      mcpServer.stdout.on('data', (data) => {
        try {
          const response = JSON.parse(data.toString());
          responses.push(response);
          
          if (response.id >= 100 && response.id < 200) {
            const query = this.queries[response.id - 100];
            const content = response.result?.content?.[0]?.text || '';
            const symbolCount = (content.match(/📍/g) || []).length;
            const hasResults = symbolCount > 0 || content.includes('Found');
            
            this.mcpResults.set(query, {
              success: !response.error && !content.includes('❌'),
              count: symbolCount,
              content: content.substring(0, 100) + '...',
              error: response.error?.message
            });
            
            console.log(`  📍 MCP "${query}": ${hasResults ? symbolCount + ' symbols' : 'No symbols'}`);
            
            if (this.mcpResults.size === this.queries.length) {
              mcpServer.kill();
              resolve();
            }
          }
        } catch (error) {
          // Ignore parse errors
        }
      });

      setTimeout(() => {
        if (!serverReady) {
          console.log('❌ MCP timeout');
          mcpServer.kill();
          resolve();
        }
      }, 15000);
    });
  }

  sendLSPWorkspaceQueries(lspServer, queryIndex) {
    this.queries.forEach((query, index) => {
      setTimeout(() => {
        const message = {
          jsonrpc: '2.0',
          id: 100 + index,
          method: 'workspace/symbol',
          params: { query }
        };
        
        const messageJson = JSON.stringify(message);
        const lspMessage = `Content-Length: ${messageJson.length}\r\n\r\n${messageJson}`;
        lspServer.stdin.write(lspMessage);
      }, index * 300);
    });
  }

  sendMCPQueries(mcpServer, responses) {
    // Initialize first
    mcpServer.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: { name: 'comparison-test', version: '1.0.0' }
      },
      id: 1
    }) + '\n');

    // Send workspace symbol queries
    setTimeout(() => {
      this.queries.forEach((query, index) => {
        setTimeout(() => {
          mcpServer.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'workspaceSymbols',
              arguments: { query }
            },
            id: 100 + index
          }) + '\n');
        }, index * 500);
      });
    }, 1000);
  }

  initializeLSP(lspServer, callback) {
    // Send initialize
    const initMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        processId: process.pid,
        rootUri: `file://${PROJECT_ROOT}`,
        workspaceFolders: [{ uri: `file://${PROJECT_ROOT}`, name: 'test-projects' }],
        capabilities: {
          workspace: { workspaceSymbol: { dynamicRegistration: false } }
        }
      }
    };

    const messageJson = JSON.stringify(initMessage);
    const lspMessage = `Content-Length: ${messageJson.length}\r\n\r\n${messageJson}`;
    lspServer.stdin.write(lspMessage);

    setTimeout(() => {
      // Send initialized notification
      const initializedJson = JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialized',
        params: {}
      });
      const initializedMessage = `Content-Length: ${initializedJson.length}\r\n\r\n${initializedJson}`;
      lspServer.stdin.write(initializedMessage);

      // Send solution/open
      const solutionPath = path.join(PROJECT_ROOT, 'csharp-ls-client.sln');
      const solutionJson = JSON.stringify({
        jsonrpc: '2.0',
        method: 'solution/open',
        params: { solution: `file://${solutionPath}` }
      });
      const solutionMessage = `Content-Length: ${solutionJson.length}\r\n\r\n${solutionJson}`;
      lspServer.stdin.write(solutionMessage);

      setTimeout(callback, 3000);
    }, 500);
  }

  parseLSPMessages(buffer, callback) {
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const headers = buffer.substring(0, headerEnd);
      const contentLengthMatch = headers.match(/Content-Length: (\d+)/i);

      if (!contentLengthMatch) {
        buffer = buffer.substring(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1]);
      const messageStart = headerEnd + 4;

      if (buffer.length < messageStart + contentLength) break;

      const messageJson = buffer.substring(messageStart, messageStart + contentLength);
      buffer = buffer.substring(messageStart + contentLength);

      try {
        const message = JSON.parse(messageJson);
        callback(message);
      } catch (error) {
        // Ignore parse errors
      }
    }
  }

  analyzeResults() {
    console.log('📈 COMPARISON ANALYSIS');
    console.log('=' .repeat(50));

    this.queries.forEach(query => {
      const lspResult = this.lspResults.get(query);
      const mcpResult = this.mcpResults.get(query);

      console.log(`\n🔍 Query: "${query}"`);
      console.log(`  📊 Direct LSP: ${lspResult?.count || 0} symbols`);
      console.log(`  📊 MCP Bridge: ${mcpResult?.count || 0} symbols`);

      const match = (lspResult?.count || 0) === (mcpResult?.count || 0);
      console.log(`  🎯 Match: ${match ? '✅ YES' : '❌ NO'}`);

      if (!match) {
        console.log(`    LSP Success: ${lspResult?.success || false}`);
        console.log(`    MCP Success: ${mcpResult?.success || false}`);
        if (lspResult?.error) console.log(`    LSP Error: ${lspResult.error}`);
        if (mcpResult?.error) console.log(`    MCP Error: ${mcpResult.error}`);
      }
    });

    // Summary
    const matches = this.queries.filter(query => {
      const lspCount = this.lspResults.get(query)?.count || 0;
      const mcpCount = this.mcpResults.get(query)?.count || 0;
      return lspCount === mcpCount;
    }).length;

    console.log(`\n🎯 FINAL VERDICT:`);
    console.log(`  Matching results: ${matches}/${this.queries.length}`);
    console.log(`  Bridge accuracy: ${((matches/this.queries.length)*100).toFixed(1)}%`);

    if (matches === this.queries.length) {
      console.log(`  ✅ MCP bridge is working correctly!`);
      console.log(`  🔍 Issue is in LSP search algorithm behavior`);
    } else {
      console.log(`  ❌ MCP bridge has discrepancies`);
      console.log(`  🛠️ Bridge implementation needs investigation`);
    }
  }
}

// Run the comparison
const comparison = new MCPvsLSPComparison();
comparison.runComparison().catch(console.error);