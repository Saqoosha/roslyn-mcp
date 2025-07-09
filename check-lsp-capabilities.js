#!/usr/bin/env node

/**
 * Check what capabilities Roslyn LSP actually provides
 */

import { spawn } from 'child_process';

const PROJECT_ROOT = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/test-projects';
const LSP_PATH = '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer';

console.log('🔍 CHECKING ROSLYN LSP CAPABILITIES');
console.log('='.repeat(50));

let lsp = null;
let responses = [];
let currentId = 1;
let buffer = '';

lsp = spawn(LSP_PATH, [
  '--stdio',
  '--logLevel', 'Information',
  '--extensionLogDirectory', '/tmp'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: PROJECT_ROOT
});

lsp.stdout.on('data', (data) => {
  handleData(data.toString());
});

lsp.stderr.on('data', (data) => {
  // console.log('LSP stderr:', data.toString().trim());
});

function handleData(data) {
  buffer += data;
  
  while (true) {
    const headerEnd = buffer.indexOf('\\r\\n\\r\\n');
    if (headerEnd === -1) break;

    const headers = buffer.substring(0, headerEnd);
    const contentLengthMatch = headers.match(/Content-Length: (\\d+)/i);
    
    if (!contentLengthMatch) {
      buffer = buffer.substring(headerEnd + 4);
      continue;
    }

    const contentLength = parseInt(contentLengthMatch[1], 10);
    const messageStart = headerEnd + 4;
    
    if (buffer.length < messageStart + contentLength) {
      break;
    }

    const content = buffer.substring(messageStart, messageStart + contentLength);
    buffer = buffer.substring(messageStart + contentLength);

    try {
      const message = JSON.parse(content);
      responses.push(message);
    } catch (error) {
      console.error('Failed to parse LSP message:', error);
    }
  }
}

async function sendRequest(method, params = {}) {
  const id = currentId++;
  const request = {
    jsonrpc: '2.0',
    method,
    params,
    id
  };
  
  const content = JSON.stringify(request);
  const message = `Content-Length: ${Buffer.byteLength(content)}\\r\\n\\r\\n${content}`;
  
  lsp.stdin.write(message);
  
  // Wait for response
  const timeout = 10000;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const response = responses.find(r => r.id === id);
    if (response) {
      return response;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  throw new Error(`Timeout waiting for response to ${method}`);
}

async function checkCapabilities() {
  console.log('🔄 Initializing LSP to check capabilities...');
  
  // Give LSP time to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    const initResult = await sendRequest('initialize', {
      processId: process.pid,
      rootUri: `file://${PROJECT_ROOT}`,
      capabilities: {
        textDocument: {
          hover: { dynamicRegistration: false },
          rename: { dynamicRegistration: false },
          completion: { dynamicRegistration: false },
          definition: { dynamicRegistration: false }
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
    
    console.log('\\n🎯 LSP SERVER CAPABILITIES:');
    console.log('='.repeat(30));
    
    const capabilities = initResult.result?.capabilities;
    if (capabilities) {
      console.log('📋 Available capabilities:');
      
      // Check key capabilities
      const keyCapabilities = [
        'hoverProvider',
        'renameProvider', 
        'definitionProvider',
        'referencesProvider',
        'documentSymbolProvider',
        'workspaceSymbolProvider',
        'completionProvider',
        'signatureHelpProvider',
        'codeActionProvider',
        'documentFormattingProvider'
      ];
      
      keyCapabilities.forEach(cap => {
        const value = capabilities[cap];
        const status = value ? '✅' : '❌';
        console.log(`   ${status} ${cap}: ${JSON.stringify(value)}`);
      });
      
      console.log('\\n📄 FULL CAPABILITIES:');
      console.log(JSON.stringify(capabilities, null, 2));
      
    } else {
      console.log('❌ No capabilities found in initialization result');
    }
    
  } catch (error) {
    console.error('❌ Failed to check capabilities:', error.message);
  }
  
  lsp.kill();
  process.exit(0);
}

checkCapabilities().catch(console.error);