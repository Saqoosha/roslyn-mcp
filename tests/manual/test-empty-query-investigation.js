#!/usr/bin/env node
/**
 * TEST: Investigate empty query workspace symbols behavior
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectPath = resolve(__dirname, '../../examples/simple-console-app');
const solutionFile = resolve(projectPath, 'SimpleConsoleApp.sln');
const lspPath = resolve(__dirname, '../../runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer');

console.log('🔍 EMPTY QUERY WORKSPACE SYMBOLS INVESTIGATION\n');
console.log('📁 Project:', projectPath);
console.log('📄 Solution:', solutionFile);
console.log('');

const lsp = spawn(lspPath, ['--stdio', '--logLevel', 'Information'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: projectPath,
});

let buffer = '';
let requestId = 0;
let initializeId = null;

function sendLSPMessage(message) {
  const content = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
  lsp.stdin.write(header + content);
  console.log('📤 Sent:', message.method || `response ${message.id}`);
}

// Initialize
console.log('📤 Initializing LSP...');
initializeId = ++requestId;
sendLSPMessage({
  jsonrpc: '2.0',
  id: initializeId,
  method: 'initialize',
  params: {
    processId: process.pid,
    rootUri: `file://${projectPath}`,
    capabilities: {
      workspace: {
        workspaceFolders: true,
        symbol: { dynamicRegistration: false },
      },
    },
    workspaceFolders: [{
      uri: `file://${projectPath}`,
      name: 'simple-console-app',
    }],
  },
});

// Track various queries to test
const testQueries = [
  { query: 'Calculator', description: 'Specific class name' },
  { query: 'Add', description: 'Method name' },
  { query: 'Program', description: 'Another class' },
  { query: '', description: 'Empty string' },
  { query: '*', description: 'Wildcard' },
  { query: '.', description: 'Dot' },
  { query: '?', description: 'Question mark' },
  { query: ' ', description: 'Single space' },
  { query: null, description: 'Null (will be converted to empty string)' },
];

let currentQueryIndex = 0;
let solutionLoaded = false;

function testNextQuery() {
  if (currentQueryIndex >= testQueries.length) {
    console.log('\n✅ All queries tested');
    lsp.kill();
    process.exit(0);
    return;
  }

  const test = testQueries[currentQueryIndex];
  const query = test.query === null ? '' : test.query;
  
  console.log(`\n🧪 Test ${currentQueryIndex + 1}/${testQueries.length}: "${query}" (${test.description})`);
  
  sendLSPMessage({
    jsonrpc: '2.0',
    id: ++requestId,
    method: 'workspace/symbol',
    params: { query }
  });
  
  currentQueryIndex++;
}

// Handle LSP responses
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
      
      if (message.id === initializeId) {
        console.log('✅ Initialized');
        
        // Send initialized notification
        sendLSPMessage({
          jsonrpc: '2.0',
          method: 'initialized',
          params: {},
        });
        
        // Send solution/open
        console.log('\n📂 Loading solution...');
        sendLSPMessage({
          jsonrpc: '2.0',
          method: 'solution/open',
          params: { solution: `file://${solutionFile}` }
        });
        
        // Wait for solution loading, then start tests
        setTimeout(() => {
          console.log('\n🚀 Starting query tests...');
          testNextQuery();
        }, 10000);
        
      } else if (message.id > initializeId) {
        // Query response
        if (message.result) {
          const count = Array.isArray(message.result) ? message.result.length : 0;
          console.log(`📥 Result: ${count} symbols found`);
          
          if (count > 0) {
            // Show first few results
            message.result.slice(0, 3).forEach(symbol => {
              console.log(`   - ${symbol.name} (${symbol.kind}) in ${symbol.containerName || 'global'}`);
            });
            if (count > 3) {
              console.log(`   ... and ${count - 3} more`);
            }
          }
        } else if (message.error) {
          console.log('❌ Error:', message.error.message);
        }
        
        // Test next query
        setTimeout(testNextQuery, 500);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
});

// Monitor stderr for important messages
lsp.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('solution/open') || msg.includes('Successfully completed')) {
    console.log('📈 LSP:', msg.trim().substring(0, 100) + '...');
    if (msg.includes('Successfully completed')) {
      solutionLoaded = true;
    }
  }
});

// Timeout
setTimeout(() => {
  console.error('\n❌ Test timeout');
  lsp.kill();
  process.exit(1);
}, 45000);

process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  lsp.kill();
  process.exit(0);
});