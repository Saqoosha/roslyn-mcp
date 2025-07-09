#!/usr/bin/env node
/**
 * Comprehensive test of all Roslyn MCP features
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🧪 ROSLYN MCP - COMPREHENSIVE FEATURE TEST\n');
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
    clientInfo: { name: 'comprehensive-test', version: '1.0.0' }
  }
};

console.log('📤 Initializing server...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

let buffer = '';
let testQueue = [];
let currentTest = 0;

// Define all tests
const tests = [
  {
    name: '🏓 Ping Test',
    request: {
      method: 'tools/call',
      params: { name: 'ping', arguments: {} }
    }
  },
  {
    name: '📋 List Tools',
    request: {
      method: 'tools/list',
      params: {}
    }
  },
  {
    name: '🔍 Hover on Calculator',
    request: {
      method: 'tools/call',
      params: {
        name: 'hover',
        arguments: {
          filePath: 'Program.cs',
          line: 29,
          character: 18
        }
      }
    }
  },
  {
    name: '📍 Go to Definition',
    request: {
      method: 'tools/call',
      params: {
        name: 'definitions',
        arguments: {
          filePath: 'Program.cs',
          line: 14,
          character: 26
        }
      }
    }
  },
  {
    name: '🔗 Find References',
    request: {
      method: 'tools/call',
      params: {
        name: 'references',
        arguments: {
          filePath: 'Program.cs',
          line: 29,
          character: 18
        }
      }
    }
  },
  {
    name: '📄 Document Symbols',
    request: {
      method: 'tools/call',
      params: {
        name: 'documentSymbols',
        arguments: {
          filePath: 'Program.cs'
        }
      }
    }
  },
  {
    name: '🌍 Workspace Symbols - Calculator',
    request: {
      method: 'tools/call',
      params: {
        name: 'workspaceSymbols',
        arguments: {
          query: 'Calculator'
        }
      }
    },
    delay: 5000 // Wait for solution loading
  },
  {
    name: '🌍 Workspace Symbols - All',
    request: {
      method: 'tools/call',
      params: {
        name: 'workspaceSymbols',
        arguments: {
          query: ''
        }
      }
    }
  },
  {
    name: '💡 Code Completion',
    request: {
      method: 'tools/call',
      params: {
        name: 'completion',
        arguments: {
          filePath: 'Program.cs',
          line: 15,
          character: 20
        }
      }
    }
  },
  {
    name: '✏️ Signature Help',
    request: {
      method: 'tools/call',
      params: {
        name: 'signatureHelp',
        arguments: {
          filePath: 'Program.cs',
          line: 17,
          character: 50
        }
      }
    }
  },
  {
    name: '🩺 Diagnostics',
    request: {
      method: 'tools/call',
      params: {
        name: 'diagnostics',
        arguments: {
          filePath: 'BuggyCode.cs'
        }
      }
    }
  },
  {
    name: '🔧 Code Actions',
    request: {
      method: 'tools/call',
      params: {
        name: 'codeActions',
        arguments: {
          filePath: 'BuggyCode.cs',
          line: 9,
          character: 12,
          endLine: 9,
          endCharacter: 30
        }
      }
    }
  },
  {
    name: '📐 Format Document',
    request: {
      method: 'tools/call',
      params: {
        name: 'formatting',
        arguments: {
          filePath: 'Program.cs'
        }
      }
    }
  }
];

function runNextTest() {
  if (currentTest >= tests.length) {
    console.log('\n✅ ALL TESTS COMPLETED!');
    console.log('\n📊 Summary:');
    console.log(`• Total tests: ${tests.length}`);
    console.log('• All major features tested');
    
    setTimeout(() => {
      server.kill();
      process.exit(0);
    }, 1000);
    return;
  }

  const test = tests[currentTest];
  const delay = test.delay || 500;

  setTimeout(() => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n🧪 Test ${currentTest + 1}/${tests.length}: ${test.name}`);
    
    const request = {
      jsonrpc: '2.0',
      id: currentTest + 10,
      ...test.request
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    currentTest++;
  }, delay);
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
          
          // Start tests after a delay for solution loading
          setTimeout(() => {
            console.log('🚀 Starting tests...\n');
            runNextTest();
          }, 3000);
          
        } else if (response.id >= 10) {
          // Test response
          if (response.error) {
            console.log('❌ Error:', response.error.message);
          } else if (response.result) {
            const result = response.result;
            
            // Pretty print results based on test type
            if (result.tools) {
              console.log(`✅ Found ${result.tools.length} tools`);
              result.tools.forEach(t => console.log(`   • ${t.name} - ${t.description}`));
            } else if (result.content) {
              const content = result.content[0]?.text || '';
              
              // Truncate long content
              if (content.length > 500) {
                console.log('✅ Result:', content.substring(0, 200) + '...\n   [truncated]');
              } else {
                console.log('✅ Result:', content);
              }
              
              // Special handling for specific results
              if (content.includes('symbols found')) {
                const match = content.match(/Found (\d+) symbols?/);
                if (match && parseInt(match[1]) > 0) {
                  console.log('🎉 WORKSPACE SYMBOLS WORKING!');
                }
              }
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
  
  // Only show important messages
  if (msg.includes('ERROR') && !msg.includes('RazorDynamicFileInfoProvider')) {
    console.log('🔴 Error:', msg);
  } else if (msg.includes('Solution/project loading completed')) {
    console.log('✅ Solution loaded!');
  }
});

// Timeout protection
setTimeout(() => {
  console.error('\n❌ Test timeout after 60 seconds');
  server.kill();
  process.exit(1);
}, 60000);

process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  server.kill();
  process.exit(0);
});