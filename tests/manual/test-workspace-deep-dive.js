#!/usr/bin/env node
/**
 * DEEP DIVE: Workspace Symbol Search Investigation
 * Why isn't Workspace Symbol Search working?
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🔍 WORKSPACE SYMBOL SEARCH DEEP DIVE\n');

const server = spawn('node', [mcpPath, projectPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PROJECT_ROOT: resolve(projectPath)
  }
});

// Initialize
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'workspace-debug', version: '1.0.0' }
  }
};

console.log('📤 Initializing server...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

// WORKSPACE SYMBOL INVESTIGATION
const searches = [
  { query: '', description: 'Empty query (should return all symbols)' },
  { query: '*', description: 'Wildcard query' },
  { query: 'Program', description: 'Search for Program class' },
  { query: 'Main', description: 'Search for Main method' },
  { query: 'Calculator', description: 'Search for Calculator class' },
  { query: 'Add', description: 'Search for Add method' },
  { query: 'C', description: 'Single character search' },
  { query: 'Calc', description: 'Partial name search' },
  { query: 'SimpleConsoleApp', description: 'Namespace search' },
  { query: 'string', description: 'Built-in type search' },
];

let buffer = '';
let currentSearch = 0;

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim() && line.startsWith('{')) {
      try {
        const response = JSON.parse(line);
        
        if (response.id === 1) {
          console.log('✅ Server initialized');
          console.log('⏳ Waiting 10 seconds for full LSP workspace indexing...');
          
          // Wait longer for complete workspace indexing
          setTimeout(runNextSearch, 10000);
          
        } else if (response.id >= 10) {
          const searchIndex = response.id - 10;
          const search = searches[searchIndex];
          
          console.log(`\n🔍 Query: "${search.query}" (${search.description})`);
          console.log('─'.repeat(60));
          
          if (response.result && response.result.content) {
            response.result.content.forEach(content => {
              console.log(content.text);
            });
          } else if (response.error) {
            console.log('❌ Error:', response.error.message || response.error);
          }
          
          setTimeout(runNextSearch, 1500);
        }
        
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }
});

function runNextSearch() {
  if (currentSearch >= searches.length) {
    console.log('\n🏁 WORKSPACE SEARCH INVESTIGATION COMPLETE');
    console.log('\n💭 ANALYSIS:');
    console.log('• If ALL queries return "No symbols found"');
    console.log('• Then workspace indexing is not working properly');
    console.log('• This could be a Roslyn LSP configuration issue');
    console.log('• Or the LSP server needs more time to index the workspace');
    
    server.kill();
    process.exit(0);
    return;
  }
  
  const search = searches[currentSearch];
  const request = {
    jsonrpc: '2.0',
    id: 10 + currentSearch,
    method: 'tools/call',
    params: {
      name: 'workspaceSymbols',
      arguments: { query: search.query, maxResults: 10 }
    }
  };
  
  server.stdin.write(JSON.stringify(request) + '\n');
  currentSearch++;
}

server.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  console.log('🔴 LSP:', msg);
});

// Extended timeout
setTimeout(() => {
  console.error('\n❌ Investigation timeout');
  server.kill();
  process.exit(1);
}, 45000);

process.on('SIGINT', () => {
  console.log('\n🛑 Investigation interrupted');
  server.kill();
  process.exit(0);
});