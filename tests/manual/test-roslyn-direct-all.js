#!/usr/bin/env node
/**
 * Direct Roslyn LSP test for all functions
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectPath = resolve(__dirname, '../../examples/simple-console-app');
const solutionFile = resolve(projectPath, 'SimpleConsoleApp.sln');
const programFile = resolve(projectPath, 'Program.cs');
const lspPath = resolve(__dirname, '../../runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer');

console.log('🔧 ROSLYN LSP DIRECT TEST - ALL FEATURES\n');
console.log('📁 Project:', projectPath);
console.log('📄 Solution:', solutionFile);
console.log('🚀 LSP:', lspPath);
console.log('');

const lsp = spawn(lspPath, ['--stdio', '--logLevel', 'Information'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: projectPath,
});

let buffer = '';
let requestId = 0;
let currentTest = 0;

function sendMessage(message) {
  const content = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
  lsp.stdin.write(header + content);
  console.log(`📤 ${message.method || `request ${message.id}`}`, 
    message.params?.query !== undefined ? `(query: "${message.params.query}")` : '');
}

// Test sequence
const tests = [
  // 1. Initialize
  () => {
    console.log('\n=== TEST 1: Initialize ===');
    sendMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'initialize',
      params: {
        processId: process.pid,
        rootUri: `file://${projectPath}`,
        capabilities: {
          textDocument: {
            hover: { dynamicRegistration: false },
            completion: { dynamicRegistration: false },
            signatureHelp: { dynamicRegistration: false },
            definition: { dynamicRegistration: false },
            references: { dynamicRegistration: false },
            documentSymbol: { dynamicRegistration: false },
            codeAction: { dynamicRegistration: false },
            rename: { dynamicRegistration: false },
            publishDiagnostics: { relatedInformation: true },
            formatting: { dynamicRegistration: false }
          },
          workspace: {
            workspaceFolders: true,
            symbol: { dynamicRegistration: false }
          }
        },
        workspaceFolders: [{
          uri: `file://${projectPath}`,
          name: 'simple-console-app'
        }]
      }
    });
  },

  // 2. Send initialized & load solution
  () => {
    console.log('\n=== TEST 2: Load Solution ===');
    sendMessage({ jsonrpc: '2.0', method: 'initialized', params: {} });
    setTimeout(() => {
      sendMessage({
        jsonrpc: '2.0',
        method: 'solution/open',
        params: { solution: `file://${solutionFile}` }
      });
    }, 100);
  },

  // 3. Open document
  () => {
    console.log('\n=== TEST 3: Open Document ===');
    const content = readFileSync(programFile, 'utf8');
    sendMessage({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: `file://${programFile}`,
          languageId: 'csharp',
          version: 1,
          text: content
        }
      }
    });
  },

  // 4. Hover
  () => {
    console.log('\n=== TEST 4: Hover ===');
    sendMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'textDocument/hover',
      params: {
        textDocument: { uri: `file://${programFile}` },
        position: { line: 29, character: 18 }
      }
    });
  },

  // 5. Definition
  () => {
    console.log('\n=== TEST 5: Definition ===');
    sendMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'textDocument/definition',
      params: {
        textDocument: { uri: `file://${programFile}` },
        position: { line: 14, character: 26 }
      }
    });
  },

  // 6. References
  () => {
    console.log('\n=== TEST 6: References ===');
    sendMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'textDocument/references',
      params: {
        textDocument: { uri: `file://${programFile}` },
        position: { line: 29, character: 18 },
        context: { includeDeclaration: true }
      }
    });
  },

  // 7. Document Symbols
  () => {
    console.log('\n=== TEST 7: Document Symbols ===');
    sendMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'textDocument/documentSymbol',
      params: {
        textDocument: { uri: `file://${programFile}` }
      }
    });
  },

  // 8. Workspace Symbols - specific query
  () => {
    console.log('\n=== TEST 8: Workspace Symbols (Calculator) ===');
    sendMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'workspace/symbol',
      params: { query: 'Calculator' }
    });
  },

  // 9. Workspace Symbols - empty query
  () => {
    console.log('\n=== TEST 9: Workspace Symbols (empty) ===');
    sendMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'workspace/symbol',
      params: { query: '' }
    });
  },

  // 10. Completion
  () => {
    console.log('\n=== TEST 10: Completion ===');
    sendMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'textDocument/completion',
      params: {
        textDocument: { uri: `file://${programFile}` },
        position: { line: 15, character: 20 },
        context: { triggerKind: 1 }
      }
    });
  },

  // 11. Signature Help
  () => {
    console.log('\n=== TEST 11: Signature Help ===');
    sendMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'textDocument/signatureHelp',
      params: {
        textDocument: { uri: `file://${programFile}` },
        position: { line: 17, character: 50 },
        context: { triggerKind: 1, isRetrigger: false }
      }
    });
  },

  // 12. Code Actions
  () => {
    console.log('\n=== TEST 12: Code Actions ===');
    sendMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'textDocument/codeAction',
      params: {
        textDocument: { uri: `file://${programFile}` },
        range: {
          start: { line: 14, character: 16 },
          end: { line: 14, character: 44 }
        },
        context: { diagnostics: [] }
      }
    });
  },

  // 13. Diagnostics
  () => {
    console.log('\n=== TEST 13: Diagnostics ===');
    // Diagnostics are typically pushed by server, but we can request them
    sendMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'textDocument/diagnostic',
      params: {
        textDocument: { uri: `file://${programFile}` }
      }
    });
  },

  // 14. Formatting
  () => {
    console.log('\n=== TEST 14: Formatting ===');
    sendMessage({
      jsonrpc: '2.0',
      id: ++requestId,
      method: 'textDocument/formatting',
      params: {
        textDocument: { uri: `file://${programFile}` },
        options: { tabSize: 4, insertSpaces: true }
      }
    });
  }
];

function runNextTest() {
  if (currentTest < tests.length) {
    tests[currentTest]();
    currentTest++;
  } else {
    console.log('\n✅ ALL TESTS COMPLETED!');
    setTimeout(() => {
      lsp.kill();
      process.exit(0);
    }, 2000);
  }
}

// Handle responses
lsp.stdout.on('data', (data) => {
  buffer += data.toString();
  
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;

    const headers = buffer.substring(0, headerEnd);
    const contentLengthMatch = headers.match(/Content-Length: (\d+)/i);
    
    if (!contentLengthMatch) {
      buffer = buffer.substring(headerEnd + 4);
      continue;
    }

    const contentLength = parseInt(contentLengthMatch[1], 10);
    const messageStart = headerEnd + 4;
    
    if (buffer.length < messageStart + contentLength) break;

    const content = buffer.substring(messageStart, messageStart + contentLength);
    buffer = buffer.substring(messageStart + contentLength);

    try {
      const message = JSON.parse(content);
      
      // Handle responses
      if (message.id && message.result !== undefined) {
        console.log('📥 Response:', 
          Array.isArray(message.result) ? 
            `${message.result.length} items` : 
            (typeof message.result === 'object' ? 
              JSON.stringify(message.result).substring(0, 100) + '...' : 
              message.result));
              
        // Show details for workspace symbols
        if (message.id >= 8 && message.id <= 9 && Array.isArray(message.result)) {
          message.result.slice(0, 3).forEach(symbol => {
            console.log(`   - ${symbol.name} (kind: ${symbol.kind})`);
          });
        }
        
        // Schedule next test
        setTimeout(runNextTest, 1000);
      } else if (message.error) {
        console.log('❌ Error:', message.error.message);
        setTimeout(runNextTest, 1000);
      }
      
    } catch (e) {
      // Ignore parse errors
    }
  }
});

// Monitor stderr for solution loading
lsp.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('Successfully completed')) {
    console.log('✅ Solution loaded successfully');
  } else if (msg.includes('error') && !msg.includes('RazorDynamicFileInfoProvider')) {
    console.log('🔴 Error:', msg.trim().substring(0, 100));
  }
});

// Start tests after initial delay
setTimeout(() => {
  console.log('🚀 Starting test sequence...\n');
  runNextTest();
}, 1000);

// Timeout
setTimeout(() => {
  console.error('\n❌ Test timeout');
  lsp.kill();
  process.exit(1);
}, 60000);