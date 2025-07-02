#!/usr/bin/env node
/**
 * REALISTIC C# DEVELOPMENT SCENARIOS TEST
 * Tests with actual errors, incomplete code, and real development situations
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const projectPath = process.argv[2] || 'examples/simple-console-app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mcpPath = resolve(__dirname, '../../dist/cli.js');

console.log('🚀 REALISTIC C# DEVELOPMENT SCENARIOS TEST\n');
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
    clientInfo: { name: 'realistic-test', version: '1.0.0' }
  }
};

console.log('📤 Initializing server...');
server.stdin.write(JSON.stringify(initRequest) + '\n');

// REALISTIC TEST SCENARIOS
const scenarios = [
  {
    name: '🩺 Error Detection',
    tool: 'diagnostics',
    args: { filePath: 'BuggyCode.cs' },
    description: 'Detect actual C# compilation errors'
  },
  {
    name: '🔍 Workspace Search - Calculator',
    tool: 'workspaceSymbols', 
    args: { query: 'Calculator' },
    description: 'Find Calculator class in workspace'
  },
  {
    name: '🔍 Workspace Search - Add',
    tool: 'workspaceSymbols',
    args: { query: 'Add' },
    description: 'Find Add method across files'
  },
  {
    name: '💡 Completion on Console',
    tool: 'completion',
    args: { filePath: 'BuggyCode.cs', line: 22, character: 20 }, // After "Console."
    description: 'Get Console.* methods'
  },
  {
    name: '🔧 Code Actions for type error',
    tool: 'codeActions',
    args: { filePath: 'BuggyCode.cs', line: 9, character: 12 }, // On type error line
    description: 'Quick fixes for type mismatch'
  },
  {
    name: '📝 Hover on Console.WritLine',
    tool: 'hover',
    args: { filePath: 'BuggyCode.cs', line: 12, character: 16 }, // On misspelled method
    description: 'Hover on misspelled method'
  },
  {
    name: '🎯 Go to Calculator definition',
    tool: 'definitions',
    args: { filePath: 'BuggyCode.cs', line: 15, character: 20 }, // On "Calculator"
    description: 'Navigate to Calculator class'
  },
  {
    name: '📋 Signature help for Add method',
    tool: 'signatureHelp',
    args: { filePath: 'BuggyCode.cs', line: 18, character: 25 }, // Inside Add() call
    description: 'Method signature with wrong parameters'
  }
];

let buffer = '';
let currentScenario = 0;

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim() && line.startsWith('{')) {
      try {
        const response = JSON.parse(line);
        
        if (response.id === 1) {
          console.log('✅ Server initialized, waiting for LSP processing...');
          // Give more time for LSP to analyze the buggy code
          setTimeout(runNextScenario, 5000);
          
        } else if (response.id >= 10) {
          const scenarioIndex = response.id - 10;
          const scenario = scenarios[scenarioIndex];
          
          console.log(`\n${scenario.name}:`);
          console.log(`📋 ${scenario.description}`);
          
          if (response.result && response.result.content) {
            response.result.content.forEach(content => {
              console.log('\n' + content.text);
            });
          } else if (response.error) {
            console.log('\n❌ Error:', response.error.message || response.error);
          } else {
            console.log('\n⚠️ Unexpected response format');
          }
          
          console.log('\n' + '='.repeat(80));
          setTimeout(runNextScenario, 2000);
        }
        
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }
});

function runNextScenario() {
  if (currentScenario >= scenarios.length) {
    console.log('\n🎉 ALL REALISTIC SCENARIOS TESTED!');
    console.log('\n📊 SUMMARY:');
    console.log('• Tested real C# compilation errors');
    console.log('• Tested incomplete/broken code scenarios');  
    console.log('• Tested workspace symbol search');
    console.log('• Tested IDE features with actual problems');
    
    server.kill();
    process.exit(0);
    return;
  }
  
  const scenario = scenarios[currentScenario];
  const request = {
    jsonrpc: '2.0',
    id: 10 + currentScenario,
    method: 'tools/call',
    params: {
      name: scenario.tool,
      arguments: scenario.args
    }
  };
  
  console.log(`\n🚀 Running: ${scenario.name}...`);
  server.stdin.write(JSON.stringify(request) + '\n');
  currentScenario++;
}

server.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('ERROR')) {
    console.error('🔴 ERROR:', msg.trim());
  } else if (msg.includes('WARN')) {
    console.error('🟡 WARN:', msg.trim());
  }
});

// Extended timeout for realistic scenarios
setTimeout(() => {
  console.error('\n❌ REALISTIC TEST TIMEOUT');
  server.kill();
  process.exit(1);
}, 60000);

// Handle exit
process.on('SIGINT', () => {
  console.log('\n🛑 Realistic test interrupted');
  server.kill();
  process.exit(0);
});