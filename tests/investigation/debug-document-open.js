#!/usr/bin/env node

/**
 * Debug document opening specifically
 * Test if textDocument/didOpen is working properly
 */

import { spawn } from 'child_process';

const simpleProjectRoot = '/Users/hiko/Desktop/csharp-ls-client/SimpleTest';

console.log('📄 Document Opening Debug');
console.log('━'.repeat(40));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start', 
  '--project', simpleProjectRoot,
  '--log-level', 'debug'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client',
  env: { ...process.env, PROJECT_ROOT: simpleProjectRoot }
});

const startTime = Date.now();
let lspReady = false;

function sendHoverRequest() {
  const request = {
    jsonrpc: '2.0',
    id: 200,
    method: 'tools/call',
    params: {
      name: 'hover',
      arguments: {
        filePath: 'Program.cs',
        line: 9,  // line with "var calc = new Calculator();"
        character: 15  // on "Calculator"
      }
    }
  };
  
  console.log(`📤 Testing hover on Calculator class...`);
  mcp.stdin.write(JSON.stringify(request) + '\n');
}

// Handle responses
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      
      if (response.id === 200) {
        const elapsed = Date.now() - startTime;
        const text = response.result?.content?.[0]?.text || '';
        
        console.log(`\n🔍 Hover Result (${elapsed}ms):`);
        console.log('━'.repeat(60));
        console.log(text);
        console.log('━'.repeat(60));
        
        if (text.includes('Hover Information')) {
          console.log('🎉 SUCCESS! Hover is working!');
        } else if (text.includes('No hover information')) {
          console.log('❌ Document sync issue - checking what went wrong...');
        }
        
        // Exit after test
        setTimeout(() => {
          mcp.kill();
          process.exit(0);
        }, 2000);
      }
    } catch (e) {
      // Ignore non-JSON output
    }
  }
});

// Monitor stderr for document operations
mcp.stderr.on('data', (data) => {
  const logLines = data.toString().trim().split('\n');
  
  for (const line of logLines) {
    const elapsed = Date.now() - startTime;
    
    // Watch for document-related operations
    if (line.includes('textDocument/didOpen') || 
        line.includes('openDocument') || 
        line.includes('Document already open') ||
        line.includes('Opened document')) {
      console.log(`📄 [${elapsed}ms] DOCUMENT: ${line}`);
    } else if (line.includes('readFileSync') || line.includes('Failed to read file')) {
      console.log(`📁 [${elapsed}ms] FILE: ${line}`);
    } else if (line.includes('getHoverWithDocSync') || line.includes('getHover')) {
      console.log(`🔍 [${elapsed}ms] HOVER: ${line}`);
    } else if (line.includes('Background initialization completed')) {
      console.log(`🎉 [${elapsed}ms] LSP ready - waiting 3 seconds then testing...`);
      lspReady = true;
      
      setTimeout(() => {
        sendHoverRequest();
      }, 3000);
    } else if (line.includes('System Status') && line.includes('READY')) {
      if (!lspReady) {
        console.log(`🎉 [${elapsed}ms] System reports ready - testing hover...`);
        lspReady = true;
        setTimeout(() => sendHoverRequest(), 1000);
      }
    } else if (line.includes('ERROR') || line.includes('error')) {
      console.log(`🚨 [${elapsed}ms] ${line}`);
    }
  }
});

// Fallback test after 40 seconds
setTimeout(() => {
  if (!lspReady) {
    console.log('\n⏰ 40 seconds - testing anyway...');
    sendHoverRequest();
  }
}, 40000);

// Error handling
mcp.on('error', (error) => {
  console.error('❌ MCP server error:', error);
});

mcp.on('exit', (code, signal) => {
  const elapsed = Date.now() - startTime;
  console.log(`\n🔚 MCP server exited at ${elapsed}ms: code ${code}, signal ${signal}`);
});

// Final timeout
setTimeout(() => {
  console.log('\n⏰ Final timeout');
  mcp.kill();
  process.exit(1);
}, 50000);