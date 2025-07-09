#!/usr/bin/env node

/**
 * Analyze detailed logging from LSP client for everies project
 */

import { spawn } from 'child_process';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('🔍 Analyzing LSP Client Detailed Logging');
console.log('━'.repeat(60));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', projectRoot,
  '--log-level', 'debug'  // Enable debug logging for detailed information
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client'
});

let initComplete = false;
let loggedMessages = [];

// Capture ALL stderr output for analysis
mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  loggedMessages.push(logText);
  
  // Show important milestones
  if (logText.includes('Starting solution/project discovery')) {
    console.log('📁 Project discovery started');
  }
  if (logText.includes('Discovery results')) {
    console.log('📁 Discovery completed');
  }
  if (logText.includes('Running dotnet restore')) {
    console.log('🔧 Running dotnet restore');
  }
  if (logText.includes('dotnet restore completed')) {
    console.log('✅ Dotnet restore completed');
  }
  if (logText.includes('Successfully completed load')) {
    console.log('📦 Project loaded');
  }
  if (logText.includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Background initialization completed');
    
    // Wait then try a simple test
    setTimeout(() => {
      console.log('\n🧪 Testing simple workspace symbol query...');
      testWorkspaceSymbols();
    }, 3000);
  }
});

function testWorkspaceSymbols() {
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'workspaceSymbols',
      arguments: { query: 'Every' }
    }
  };
  
  mcp.stdin.write(JSON.stringify(request) + '\n');
  
  setTimeout(() => {
    console.log('\n📊 DETAILED LOG ANALYSIS');
    console.log('━'.repeat(60));
    
    // Analyze key phases
    const discoveryLogs = loggedMessages.filter(msg => 
      msg.includes('Discovery results') || 
      msg.includes('Found') && msg.includes('project file') ||
      msg.includes('Solution files')
    );
    
    const restoreLogs = loggedMessages.filter(msg => 
      msg.includes('dotnet restore') || 
      msg.includes('Restore')
    );
    
    const loadingLogs = loggedMessages.filter(msg => 
      msg.includes('Successfully completed load') ||
      msg.includes('Project loaded')
    );
    
    const initLogs = loggedMessages.filter(msg => 
      msg.includes('initialization') ||
      msg.includes('Background')
    );
    
    console.log(`📁 Discovery logs: ${discoveryLogs.length}`);
    discoveryLogs.forEach(log => console.log(`   ${log.trim()}`));
    
    console.log(`\n🔧 Restore logs: ${restoreLogs.length}`);
    restoreLogs.forEach(log => console.log(`   ${log.trim()}`));
    
    console.log(`\n📦 Loading logs: ${loadingLogs.length}`);
    loadingLogs.forEach(log => console.log(`   ${log.trim()}`));
    
    console.log(`\n⚡ Init logs: ${initLogs.length}`);
    initLogs.forEach(log => console.log(`   ${log.trim()}`));
    
    // Look for error patterns
    const errorLogs = loggedMessages.filter(msg => 
      msg.toLowerCase().includes('error') ||
      msg.toLowerCase().includes('failed') ||
      msg.toLowerCase().includes('timeout')
    );
    
    if (errorLogs.length > 0) {
      console.log(`\n❌ Error logs: ${errorLogs.length}`);
      errorLogs.forEach(log => console.log(`   ${log.trim()}`));
    }
    
    mcp.kill();
  }, 5000);
}

// Handle workspace symbol response
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      
      if (response.id === 1) {
        // Workspace symbols response
        const text = response.result?.content?.[0]?.text || '';
        if (text.includes('Found') && text.includes('symbol')) {
          console.log('✅ Workspace symbols: Working');
        } else if (text.includes('No symbols found')) {
          console.log('❌ Workspace symbols: No symbols found');
        } else {
          console.log('❓ Workspace symbols: Unexpected response');
        }
      }
    } catch (e) {
      // Ignore non-JSON
    }
  }
});

// Error handling
mcp.on('error', (error) => {
  console.error('❌ MCP Error:', error);
});

mcp.on('exit', (code, signal) => {
  console.log(`\n🔚 Analysis completed`);
});

// Safety timeout
setTimeout(() => {
  console.log('\n⏰ Analysis timeout');
  mcp.kill();
}, 60000);