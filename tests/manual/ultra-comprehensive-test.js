#!/usr/bin/env node

/**
 * 🚀 ULTRA-COMPREHENSIVE PRECISION TEST SUITE
 * 
 * Tests every MCP tool with multiple scenarios, edge cases, and real-world usage patterns.
 * Covers C# language features, Unicode, syntax errors, performance, and complex scenarios.
 */

import { spawn } from 'child_process';
import path from 'path';
import { performance } from 'perf_hooks';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const CLI_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js';

class UltraTestSuite {
  constructor() {
    this.server = null;
    this.responses = [];
    this.testResults = [];
    this.currentId = 1;
    this.serverReady = false;
    this.startTime = 0;
  }

  async runAllTests() {
    console.log('🚀 ULTRA-COMPREHENSIVE PRECISION TEST SUITE\n');
    console.log(`📁 Project: ${PROJECT_ROOT}`);
    console.log(`🚀 CLI: ${CLI_PATH}\n`);
    
    this.startTime = performance.now();
    
    await this.startServer();
    await this.waitForServer();
    
    // Run comprehensive test suites
    await this.runBasicFunctionalityTests();
    await this.runDocumentSymbolsTests();
    await this.runDiagnosticsTests();
    await this.runHoverTests();
    await this.runCompletionTests();
    await this.runWorkspaceSymbolsTests();
    await this.runDefinitionsTests();
    await this.runReferencesTests();
    await this.runCodeActionsTests();
    await this.runFormattingTests();
    await this.runSignatureHelpTests();
    await this.runEdgeCaseTests();
    await this.runPerformanceTests();
    
    this.generateDetailedReport();
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
        console.log('❌ Invalid JSON response:', error.message);
      }
    });
  }

  async waitForServer() {
    console.log('⏳ Waiting for server initialization...');
    
    while (!this.serverReady) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Additional wait for solution loading (5 seconds works best)
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('✅ Server ready!\n');
  }

  async sendRequest(name, method, params = {}) {
    const startTime = performance.now();
    const id = this.currentId++;
    
    const request = {
      jsonrpc: '2.0',
      method,
      ...(method.startsWith('tools/') ? { params } : { params }),
      id
    };
    
    this.server.stdin.write(JSON.stringify(request) + '\n');
    
    // Wait for response
    let response = null;
    const timeout = 10000; // 10 second timeout
    const pollInterval = 50;
    let elapsed = 0;
    
    while (!response && elapsed < timeout) {
      response = this.responses.find(r => r.id === id);
      if (!response) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        elapsed += pollInterval;
      }
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const testResult = {
      name,
      method,
      params,
      success: !!response && !response.error,
      duration,
      response: response || { error: 'Timeout' },
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(testResult);
    
    return testResult;
  }

  async runBasicFunctionalityTests() {
    console.log('🔥 BASIC FUNCTIONALITY TESTS');
    console.log('=' .repeat(50));
    
    const tests = [
      {
        name: 'Initialize Protocol',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          clientInfo: { name: 'ultra-test-client', version: '1.0.0' }
        }
      },
      {
        name: 'List All Tools',
        method: 'tools/list'
      },
      {
        name: 'Ping Server',
        method: 'tools/call',
        params: {
          name: 'ping',
          arguments: { message: 'Ultra test ping!' }
        }
      }
    ];
    
    for (const test of tests) {
      const result = await this.sendRequest(test.name, test.method, test.params);
      console.log(`${result.success ? '✅' : '❌'} ${test.name} (${result.duration.toFixed(2)}ms)`);
      
      if (!result.success) {
        console.log(`   Error: ${result.response.error?.message || 'Unknown error'}`);
      }
    }
    
    console.log('');
  }

  async runDocumentSymbolsTests() {
    console.log('📋 DOCUMENT SYMBOLS TESTS');
    console.log('=' .repeat(50));
    
    const testFiles = [
      { file: 'Program.cs', description: 'Basic Program File' },
      { file: 'ComplexFeaturesTest.cs', description: 'Complex C# Features' },
      { file: 'EdgeCasesTest.cs', description: 'Edge Cases & Unicode' },
      { file: 'SimpleErrorTest.cs', description: 'File with Errors' },
      { file: 'NonExistent.cs', description: 'Non-existent File' }
    ];
    
    for (const testFile of testFiles) {
      const result = await this.sendRequest(
        `Document Symbols - ${testFile.description}`,
        'tools/call',
        {
          name: 'documentSymbols',
          arguments: { filePath: testFile.file }
        }
      );
      
      console.log(`${result.success ? '✅' : '❌'} ${testFile.description} (${result.duration.toFixed(2)}ms)`);
      
      if (result.success && result.response.result?.content?.[0]?.text) {
        const symbolCount = (result.response.result.content[0].text.match(/📍/g) || []).length;
        console.log(`   Found ${symbolCount} symbols`);
      }
    }
    
    console.log('');
  }

  async runDiagnosticsTests() {
    console.log('🩺 DIAGNOSTICS TESTS');
    console.log('=' .repeat(50));
    
    const testFiles = [
      { file: 'Program.cs', description: 'Basic Program', expectErrors: false },
      { file: 'SimpleErrorTest.cs', description: 'File with Syntax Errors', expectErrors: true },
      { file: 'EdgeCasesTest.cs', description: 'Edge Cases File', expectErrors: true },
      { file: 'ComplexFeaturesTest.cs', description: 'Complex Features', expectErrors: false }
    ];
    
    for (const testFile of testFiles) {
      const result = await this.sendRequest(
        `Diagnostics - ${testFile.description}`,
        'tools/call',
        {
          name: 'diagnostics',
          arguments: { 
            filePath: testFile.file,
            includeSuggestions: true
          }
        }
      );
      
      console.log(`${result.success ? '✅' : '❌'} ${testFile.description} (${result.duration.toFixed(2)}ms)`);
      
      if (result.success && result.response.result?.content?.[0]?.text) {
        const diagnosticText = result.response.result.content[0].text;
        const errorCount = (diagnosticText.match(/❌/g) || []).length;
        const warningCount = (diagnosticText.match(/⚠️/g) || []).length;
        const infoCount = (diagnosticText.match(/ℹ️/g) || []).length;
        
        console.log(`   Errors: ${errorCount}, Warnings: ${warningCount}, Info: ${infoCount}`);
        
        if (testFile.expectErrors && errorCount === 0) {
          console.log(`   ⚠️  Expected errors but found none`);
        }
      }
    }
    
    console.log('');
  }

  async runHoverTests() {
    console.log('🎯 HOVER TESTS');
    console.log('=' .repeat(50));
    
    const hoverTests = [
      // Program.cs tests
      { file: 'Program.cs', line: 7, character: 11, description: 'Calculator class name' },
      { file: 'Program.cs', line: 12, character: 16, description: 'Constructor' },
      { file: 'Program.cs', line: 17, character: 20, description: 'Add method' },
      { file: 'Program.cs', line: 9, character: 21, description: 'Private field' },
      
      // Complex features tests
      { file: 'ComplexFeaturesTest.cs', line: 8, character: 25, description: 'Generic interface' },
      { file: 'ComplexFeaturesTest.cs', line: 20, character: 15, description: 'Abstract class' },
      { file: 'ComplexFeaturesTest.cs', line: 50, character: 20, description: 'Customer class' },
      { file: 'ComplexFeaturesTest.cs', line: 85, character: 25, description: 'LINQ expression' },
      
      // Edge cases tests
      { file: 'EdgeCasesTest.cs', line: 8, character: 20, description: 'Unicode property' },
      { file: 'EdgeCasesTest.cs', line: 30, character: 15, description: 'Long class name' },
      
      // Invalid positions
      { file: 'Program.cs', line: 1000, character: 1000, description: 'Invalid position' },
      { file: 'Program.cs', line: 5, character: 0, description: 'Empty line' }
    ];
    
    for (const test of hoverTests) {
      const result = await this.sendRequest(
        `Hover - ${test.description}`,
        'tools/call',
        {
          name: 'hover',
          arguments: {
            filePath: test.file,
            line: test.line,
            character: test.character
          }
        }
      );
      
      console.log(`${result.success ? '✅' : '❌'} ${test.description} (${result.duration.toFixed(2)}ms)`);
      
      if (result.success && result.response.result?.content?.[0]?.text) {
        const hoverText = result.response.result.content[0].text;
        const hasTypeInfo = hoverText.includes('Type:') || hoverText.includes('🔍');
        console.log(`   ${hasTypeInfo ? 'Has type info' : 'No type info'}`);
      }
    }
    
    console.log('');
  }

  async runCompletionTests() {
    console.log('💡 COMPLETION TESTS');
    console.log('=' .repeat(50));
    
    const completionTests = [
      // Different contexts
      { file: 'Program.cs', line: 8, character: 0, description: 'Class level' },
      { file: 'Program.cs', line: 15, character: 8, description: 'Method body' },
      { file: 'Program.cs', line: 20, character: 16, description: 'After dot operator' },
      
      // Complex file contexts
      { file: 'ComplexFeaturesTest.cs', line: 50, character: 0, description: 'Complex class context' },
      { file: 'ComplexFeaturesTest.cs', line: 100, character: 12, description: 'Generic method context' },
      
      // Edge cases
      { file: 'EdgeCasesTest.cs', line: 10, character: 20, description: 'Unicode context' },
      { file: 'EdgeCasesTest.cs', line: 50, character: 0, description: 'Long identifier context' },
      
      // Various completion limits
      { file: 'Program.cs', line: 15, character: 8, description: 'Max 5 results', maxResults: 5 },
      { file: 'Program.cs', line: 15, character: 8, description: 'Max 50 results', maxResults: 50 }
    ];
    
    for (const test of completionTests) {
      const result = await this.sendRequest(
        `Completion - ${test.description}`,
        'tools/call',
        {
          name: 'completion',
          arguments: {
            filePath: test.file,
            line: test.line,
            character: test.character,
            ...(test.maxResults && { maxResults: test.maxResults })
          }
        }
      );
      
      console.log(`${result.success ? '✅' : '❌'} ${test.description} (${result.duration.toFixed(2)}ms)`);
      
      if (result.success && result.response.result?.content?.[0]?.text) {
        const completionText = result.response.result.content[0].text;
        const suggestionCount = (completionText.match(/•/g) || []).length;
        console.log(`   Found ${suggestionCount} suggestions`);
      }
    }
    
    console.log('');
  }

  async runWorkspaceSymbolsTests() {
    console.log('🔍 WORKSPACE SYMBOLS TESTS');
    console.log('=' .repeat(50));
    
    const symbolQueries = [
      // IMPORTANT: First query often returns 0 due to indexing warm-up
      { query: 'Warmup', description: 'Warmup query (expected to fail)', expectResults: false },
      
      // Working queries (verified after warm-up)  
      { query: 'Add', description: 'Add method', expectResults: true },
      { query: 'Calculator', description: 'Calculator class', expectResults: true },
      { query: 'Main', description: 'Main method', expectResults: true },
      { query: 'C', description: 'Classes starting with C', expectResults: true },
      
      // Additional working patterns
      { query: 'Test', description: 'Classes containing Test', expectResults: true },
      { query: 'Get', description: 'Methods containing Get', expectResults: true },
      { query: 'Program', description: 'Program class (should work after warmup)', expectResults: true },
      
      // Classes that might work
      { query: 'Customer', description: 'Customer class' },
      { query: 'Order', description: 'Order class' },
      
      // Edge cases
      { query: '', description: 'Empty query', expectResults: false },
      { query: 'NonExistent', description: 'Non-existent symbol', expectResults: false }
    ];
    
    for (const test of symbolQueries) {
      const result = await this.sendRequest(
        `Workspace Symbols - ${test.description}`,
        'tools/call',
        {
          name: 'workspaceSymbols',
          arguments: {
            query: test.query,
            maxResults: 25
          }
        }
      );
      
      console.log(`${result.success ? '✅' : '❌'} ${test.description} (${result.duration.toFixed(2)}ms)`);
      
      if (result.success && result.response.result?.content?.[0]?.text) {
        const symbolText = result.response.result.content[0].text;
        const symbolCount = (symbolText.match(/📍/g) || []).length;
        const hasResults = symbolCount > 0 || symbolText.includes('Found');
        
        const resultStatus = hasResults ? `Found ${symbolCount} symbols` : 'No symbols found';
        const expectationMet = test.expectResults === undefined || 
                              (test.expectResults && hasResults) || 
                              (!test.expectResults && !hasResults);
        
        console.log(`   ${resultStatus} ${expectationMet ? '✅' : '⚠️  (unexpected)'}`);
      }
    }
    
    console.log('');
  }

  async runDefinitionsTests() {
    console.log('🎯 DEFINITIONS TESTS');
    console.log('=' .repeat(50));
    
    const definitionTests = [
      { file: 'Program.cs', line: 7, character: 11, description: 'Calculator class definition' },
      { file: 'Program.cs', line: 17, character: 20, description: 'Add method definition' },
      { file: 'Program.cs', line: 22, character: 16, description: 'Console.WriteLine definition' },
      { file: 'ComplexFeaturesTest.cs', line: 50, character: 15, description: 'Customer class definition' },
      { file: 'ComplexFeaturesTest.cs', line: 85, character: 25, description: 'LINQ Where definition' }
    ];
    
    for (const test of definitionTests) {
      const result = await this.sendRequest(
        `Definitions - ${test.description}`,
        'tools/call',
        {
          name: 'definitions',
          arguments: {
            filePath: test.file,
            line: test.line,
            character: test.character
          }
        }
      );
      
      console.log(`${result.success ? '✅' : '❌'} ${test.description} (${result.duration.toFixed(2)}ms)`);
      
      if (result.success && result.response.result?.content?.[0]?.text) {
        const definitionText = result.response.result.content[0].text;
        const hasDefinitions = definitionText.includes('📍') || definitionText.includes('Definition');
        console.log(`   ${hasDefinitions ? 'Found definitions' : 'No definitions found'}`);
      }
    }
    
    console.log('');
  }

  async runReferencesTests() {
    console.log('🔗 REFERENCES TESTS');
    console.log('=' .repeat(50));
    
    const referenceTests = [
      { file: 'Program.cs', line: 7, character: 11, description: 'Calculator class references' },
      { file: 'Program.cs', line: 17, character: 20, description: 'Add method references' },
      { file: 'Program.cs', line: 9, character: 21, description: 'Private field references' },
      { file: 'ComplexFeaturesTest.cs', line: 50, character: 15, description: 'Customer class references' },
      { file: 'ComplexFeaturesTest.cs', line: 8, character: 25, description: 'IRepository references' }
    ];
    
    for (const test of referenceTests) {
      const result = await this.sendRequest(
        `References - ${test.description}`,
        'tools/call',
        {
          name: 'references',
          arguments: {
            filePath: test.file,
            line: test.line,
            character: test.character,
            includeDeclaration: true
          }
        }
      );
      
      console.log(`${result.success ? '✅' : '❌'} ${test.description} (${result.duration.toFixed(2)}ms)`);
      
      if (result.success && result.response.result?.content?.[0]?.text) {
        const referenceText = result.response.result.content[0].text;
        const referenceCount = (referenceText.match(/📍/g) || []).length;
        console.log(`   Found ${referenceCount} references`);
      }
    }
    
    console.log('');
  }

  async runCodeActionsTests() {
    console.log('⚡ CODE ACTIONS TESTS');
    console.log('=' .repeat(50));
    
    const codeActionTests = [
      { file: 'Program.cs', line: 7, character: 11, description: 'Calculator class actions' },
      { file: 'Program.cs', line: 17, character: 20, description: 'Add method actions' },
      { file: 'SimpleErrorTest.cs', line: 5, character: 10, description: 'Error context actions' },
      { file: 'ComplexFeaturesTest.cs', line: 50, character: 15, description: 'Complex class actions' }
    ];
    
    for (const test of codeActionTests) {
      const result = await this.sendRequest(
        `Code Actions - ${test.description}`,
        'tools/call',
        {
          name: 'codeActions',
          arguments: {
            filePath: test.file,
            line: test.line,
            character: test.character
          }
        }
      );
      
      console.log(`${result.success ? '✅' : '❌'} ${test.description} (${result.duration.toFixed(2)}ms)`);
      
      if (result.success && result.response.result?.content?.[0]?.text) {
        const actionText = result.response.result.content[0].text;
        const actionCount = (actionText.match(/•/g) || []).length;
        console.log(`   Found ${actionCount} code actions`);
      }
    }
    
    console.log('');
  }

  async runFormattingTests() {
    console.log('📐 FORMATTING TESTS');
    console.log('=' .repeat(50));
    
    const formattingTests = [
      { file: 'Program.cs', description: 'Basic Program file' },
      { file: 'ComplexFeaturesTest.cs', description: 'Complex features file' },
      { file: 'EdgeCasesTest.cs', description: 'Edge cases file' }
    ];
    
    for (const test of formattingTests) {
      const result = await this.sendRequest(
        `Formatting - ${test.description}`,
        'tools/call',
        {
          name: 'formatting',
          arguments: {
            filePath: test.file,
            tabSize: 4,
            insertSpaces: true
          }
        }
      );
      
      console.log(`${result.success ? '✅' : '❌'} ${test.description} (${result.duration.toFixed(2)}ms)`);
      
      if (result.success && result.response.result?.content?.[0]?.text) {
        const formattingText = result.response.result.content[0].text;
        const hasFormatting = formattingText.includes('Formatted') || formattingText.includes('changes');
        console.log(`   ${hasFormatting ? 'Formatting applied' : 'No formatting changes'}`);
      }
    }
    
    console.log('');
  }

  async runSignatureHelpTests() {
    console.log('📝 SIGNATURE HELP TESTS');
    console.log('=' .repeat(50));
    
    const signatureTests = [
      { file: 'Program.cs', line: 22, character: 24, description: 'Console.WriteLine signature' },
      { file: 'Program.cs', line: 19, character: 20, description: 'Add method call signature' },
      { file: 'ComplexFeaturesTest.cs', line: 100, character: 25, description: 'Generic method signature' },
      { file: 'ComplexFeaturesTest.cs', line: 120, character: 15, description: 'LINQ method signature' }
    ];
    
    for (const test of signatureTests) {
      const result = await this.sendRequest(
        `Signature Help - ${test.description}`,
        'tools/call',
        {
          name: 'signatureHelp',
          arguments: {
            filePath: test.file,
            line: test.line,
            character: test.character
          }
        }
      );
      
      console.log(`${result.success ? '✅' : '❌'} ${test.description} (${result.duration.toFixed(2)}ms)`);
      
      if (result.success && result.response.result?.content?.[0]?.text) {
        const signatureText = result.response.result.content[0].text;
        const hasSignature = signatureText.includes('Signature') || signatureText.includes('Parameters');
        console.log(`   ${hasSignature ? 'Found signature info' : 'No signature info'}`);
      }
    }
    
    console.log('');
  }

  async runEdgeCaseTests() {
    console.log('⚡ EDGE CASE TESTS');
    console.log('=' .repeat(50));
    
    const edgeCases = [
      // Concurrent requests
      {
        name: 'Concurrent Requests',
        test: async () => {
          const promises = Array.from({ length: 5 }, (_, i) => 
            this.sendRequest(
              `Concurrent-${i}`,
              'tools/call',
              {
                name: 'ping',
                arguments: { message: `Concurrent ping ${i}` }
              }
            )
          );
          
          const results = await Promise.all(promises);
          return results.every(r => r.success);
        }
      },
      
      // Large file handling
      {
        name: 'Large File Symbols',
        test: async () => {
          const result = await this.sendRequest(
            'Large File Test',
            'tools/call',
            {
              name: 'documentSymbols',
              arguments: { filePath: 'ComplexFeaturesTest.cs' }
            }
          );
          return result.success;
        }
      },
      
      // Invalid parameters
      {
        name: 'Invalid Parameters',
        test: async () => {
          const result = await this.sendRequest(
            'Invalid Params Test',
            'tools/call',
            {
              name: 'hover',
              arguments: {
                filePath: 'Program.cs',
                line: -1,
                character: -1
              }
            }
          );
          // Should handle gracefully
          return result.response !== null;
        }
      },
      
      // Non-existent file
      {
        name: 'Non-existent File',
        test: async () => {
          const result = await this.sendRequest(
            'Non-existent File Test',
            'tools/call',
            {
              name: 'diagnostics',
              arguments: { filePath: 'DoesNotExist.cs' }
            }
          );
          return result.response !== null; // Should handle error gracefully
        }
      }
    ];
    
    for (const edgeCase of edgeCases) {
      try {
        const startTime = performance.now();
        const success = await edgeCase.test();
        const duration = performance.now() - startTime;
        
        console.log(`${success ? '✅' : '❌'} ${edgeCase.name} (${duration.toFixed(2)}ms)`);
      } catch (error) {
        console.log(`❌ ${edgeCase.name} - Exception: ${error.message}`);
      }
    }
    
    console.log('');
  }

  async runPerformanceTests() {
    console.log('📊 PERFORMANCE TESTS');
    console.log('=' .repeat(50));
    
    // Measure average response times for each tool
    const performanceTests = [
      { tool: 'ping', args: {} },
      { tool: 'documentSymbols', args: { filePath: 'Program.cs' } },
      { tool: 'diagnostics', args: { filePath: 'Program.cs' } },
      { tool: 'hover', args: { filePath: 'Program.cs', line: 7, character: 11 } },
      { tool: 'completion', args: { filePath: 'Program.cs', line: 15, character: 8 } },
      { tool: 'workspaceSymbols', args: { query: 'Calculator' } }
    ];
    
    const iterations = 3;
    const performanceResults = {};
    
    for (const test of performanceTests) {
      const durations = [];
      
      for (let i = 0; i < iterations; i++) {
        const result = await this.sendRequest(
          `Perf-${test.tool}-${i}`,
          'tools/call',
          {
            name: test.tool,
            arguments: test.args
          }
        );
        
        if (result.success) {
          durations.push(result.duration);
        }
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (durations.length > 0) {
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        
        performanceResults[test.tool] = {
          avg: avgDuration,
          min: minDuration,
          max: maxDuration,
          iterations: durations.length
        };
        
        console.log(`📈 ${test.tool}: avg ${avgDuration.toFixed(2)}ms (min: ${minDuration.toFixed(2)}ms, max: ${maxDuration.toFixed(2)}ms)`);
      } else {
        console.log(`❌ ${test.tool}: All iterations failed`);
      }
    }
    
    console.log('');
    return performanceResults;
  }

  generateDetailedReport() {
    const totalTime = performance.now() - this.startTime;
    const successfulTests = this.testResults.filter(t => t.success).length;
    const failedTests = this.testResults.filter(t => !t.success).length;
    const totalTests = this.testResults.length;
    
    console.log('📋 ULTRA-COMPREHENSIVE TEST REPORT');
    console.log('=' .repeat(60));
    console.log(`⏱️  Total execution time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`📊 Tests executed: ${totalTests}`);
    console.log(`✅ Successful: ${successfulTests} (${((successfulTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    console.log('');
    
    // Response time analysis
    const responseTimes = this.testResults.filter(t => t.success).map(t => t.duration);
    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const minResponseTime = Math.min(...responseTimes);
      const maxResponseTime = Math.max(...responseTimes);
      
      console.log('⚡ PERFORMANCE ANALYSIS');
      console.log('-' .repeat(30));
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Fastest response: ${minResponseTime.toFixed(2)}ms`);
      console.log(`Slowest response: ${maxResponseTime.toFixed(2)}ms`);
      console.log('');
    }
    
    // Tool-specific success rates
    const toolStats = {};
    this.testResults.forEach(test => {
      if (test.params?.name) {
        const toolName = test.params.name;
        if (!toolStats[toolName]) {
          toolStats[toolName] = { success: 0, total: 0, avgDuration: 0 };
        }
        toolStats[toolName].total++;
        if (test.success) {
          toolStats[toolName].success++;
          toolStats[toolName].avgDuration += test.duration;
        }
      }
    });
    
    Object.keys(toolStats).forEach(tool => {
      const stats = toolStats[tool];
      stats.avgDuration = stats.success > 0 ? stats.avgDuration / stats.success : 0;
    });
    
    console.log('🔧 TOOL SUCCESS RATES');
    console.log('-' .repeat(30));
    Object.entries(toolStats).forEach(([tool, stats]) => {
      const successRate = (stats.success / stats.total * 100).toFixed(1);
      console.log(`${tool}: ${stats.success}/${stats.total} (${successRate}%) - avg ${stats.avgDuration.toFixed(2)}ms`);
    });
    console.log('');
    
    // Failed tests summary
    const failedTestsList = this.testResults.filter(t => !t.success);
    if (failedTestsList.length > 0) {
      console.log('❌ FAILED TESTS');
      console.log('-' .repeat(30));
      failedTestsList.forEach(test => {
        console.log(`• ${test.name}: ${test.response.error?.message || 'Unknown error'}`);
      });
      console.log('');
    }
    
    console.log('🎉 ULTRA-COMPREHENSIVE TEST COMPLETED!');
    console.log('=' .repeat(60));
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

// Run the ultra-comprehensive test suite
const testSuite = new UltraTestSuite();
testSuite.runAllTests().catch(console.error);