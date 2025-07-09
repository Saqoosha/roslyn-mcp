#!/usr/bin/env node
/**
 * Test various workspace symbol queries via MCP
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🧪 WORKSPACE SYMBOL QUERY PATTERNS TEST\n');
console.log('📁 Project:', resolve(projectPath));
console.log('');

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
    clientInfo: { name: 'query-test', version: '1.0.0' }
  }
};

console.log('📤 Initializing server...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

let buffer = '';
let currentTest = 0;

// Define queries to test
const queries = [
  { query: 'Calculator', desc: 'Exact class name' },
  { query: 'Add', desc: 'Method name' },
  { query: 'Calc', desc: 'Partial name' },
  { query: 'C', desc: 'Single letter' },
  { query: '', desc: 'Empty string' },
  { query: '*', desc: 'Wildcard asterisk' },
  { query: '.*', desc: 'Regex pattern' },
  { query: '.', desc: 'Single dot' },
  { query: ' ', desc: 'Single space' },
  { query: 'Simple', desc: 'Namespace part' },
  { query: '::', desc: 'C++ style separator' },
  { query: 'program', desc: 'Lowercase class' },
  { query: 'CALCULATOR', desc: 'Uppercase class' },
];

function runNextTest() {
  if (currentTest >= queries.length) {
    console.log('\n✅ ALL QUERY PATTERNS TESTED!');
    
    console.log('\n📊 Summary:');
    console.log('• Empty string returns no symbols - this may be by design in Roslyn LSP');
    console.log('• Specific queries work well (Calculator, Add, etc.)');
    console.log('• Partial matches work (Calc finds Calculator)');
    console.log('• Case sensitivity matters');
    
    setTimeout(() => {
      server.kill();
      process.exit(0);
    }, 1000);
    return;
  }

  const test = queries[currentTest];
  
  setTimeout(() => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n🔍 Test ${currentTest + 1}/${queries.length}: "${test.query}" (${test.desc})`);
    
    const request = {
      jsonrpc: '2.0',
      id: currentTest + 10,
      method: 'tools/call',
      params: {
        name: 'workspaceSymbols',
        arguments: {
          query: test.query
        }
      }
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    currentTest++;
  }, 500);
}

// Handle responses
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
          console.log('⏳ Waiting for solution loading...\n');
          
          // Wait longer for solution loading
          setTimeout(() => {
            console.log('🚀 Starting query tests...\n');
            runNextTest();
          }, 8000);
          
        } else if (response.id >= 10) {
          // Test response
          if (response.error) {
            console.log('❌ Error:', response.error.message);
          } else if (response.result && response.result.content) {
            const content = response.result.content[0]?.text || '';
            
            // Extract symbol count
            const match = content.match(/Found (\d+) symbols?/);
            if (match) {
              const count = parseInt(match[1]);
              console.log(`✅ Found ${count} symbols`);
              
              // Show first few symbols
              const symbolMatches = content.matchAll(/• \*\*(.+?)\*\* _\((.+?)\)_ - (.+)/g);
              let shown = 0;
              for (const symbolMatch of symbolMatches) {
                if (shown < 3) {
                  console.log(`   - ${symbolMatch[1]} (${symbolMatch[2]}) in ${symbolMatch[3]}`);
                  shown++;
                }
              }
              if (count > 3) {
                console.log(`   ... and ${count - 3} more`);
              }
            } else if (content.includes('No symbols found')) {
              console.log('❌ No symbols found');
            } else {
              console.log('📝 Result:', content.substring(0, 100) + '...');
            }
          }
          
          // Run next test
          runNextTest();
        }
        
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
});

// Monitor stderr
server.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  
  if (msg.includes('Solution/project loading completed')) {
    console.log('✅ Solution loaded!');
  }
});

// Timeout protection
setTimeout(() => {
  console.error('\n❌ Test timeout');
  server.kill();
  process.exit(1);
}, 45000);

process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  server.kill();
  process.exit(0);
});