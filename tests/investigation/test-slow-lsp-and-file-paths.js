#!/usr/bin/env node

/**
 * Investigate LSP slowness and file path resolution issues
 */

import { spawn } from 'child_process';

const projectRoot = '/Users/hiko/Documents/everies/everies';

console.log('🔬 INVESTIGATING LSP SLOWNESS AND FILE PATH ISSUES');
console.log('━'.repeat(80));

const mcp = spawn('node', [
  '/Users/hiko/Desktop/csharp-ls-client/roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', projectRoot,
  '--log-level', 'debug'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client'
});

let initComplete = false;
let testStartTime = Date.now();

// Track stderr for initialization
mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  
  if (logText.includes('Background initialization completed')) {
    initComplete = true;
    console.log('✅ Background initialization completed');
    
    // Test with proper patience for slow responses
    setTimeout(() => {
      console.log('\n🔬 TESTING FILE PATH RESOLUTION AND RESPONSE TIMES...');
      testFilePathsAndTiming();
    }, 5000);
  }
});

function testFilePathsAndTiming() {
  console.log('\n1️⃣ Testing different file path formats...');
  
  // Test different file path formats
  const filePaths = [
    'Program.cs',                                    // Simple file (known to fail)
    'Assets/Scripts/Runtime/MainController.cs',      // Relative path
    '/Users/hiko/Documents/everies/everies/Assets/Scripts/Runtime/MainController.cs',  // Absolute path
    './Assets/Scripts/Runtime/MainController.cs'     // Explicit relative
  ];
  
  let requestId = 1;
  
  filePaths.forEach((filePath, index) => {
    setTimeout(() => {
      const requestTime = Date.now();
      console.log(`\n📁 Testing path ${index + 1}: "${filePath}"`);
      console.log(`   ⏰ Request sent at: ${requestTime - testStartTime}ms`);
      
      const diagnosticsRequest = {
        jsonrpc: '2.0',
        id: requestId++,
        method: 'tools/call',
        params: {
          name: 'diagnostics',
          arguments: { filePath }
        }
      };
      
      mcp.stdin.write(JSON.stringify(diagnosticsRequest) + '\n');
    }, index * 15000); // 15 seconds apart to avoid overlap
  });
  
  // Test workspace symbols with extended patience
  setTimeout(() => {
    console.log('\n2️⃣ Testing workspace symbols with extended patience...');
    
    const workspaceRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'tools/call',
      params: {
        name: 'workspaceSymbols',
        arguments: { query: 'Every' }
      }
    };
    
    const requestTime = Date.now();
    console.log(`   ⏰ Workspace symbols request sent at: ${requestTime - testStartTime}ms`);
    mcp.stdin.write(JSON.stringify(workspaceRequest) + '\n');
  }, 60000); // 60 seconds after start
  
  // Test document symbols (should be faster)
  setTimeout(() => {
    console.log('\n3️⃣ Testing document symbols (should be faster)...');
    
    const docSymbolsRequest = {
      jsonrpc: '2.0',
      id: requestId++,
      method: 'tools/call',
      params: {
        name: 'documentSymbols',
        arguments: { filePath: 'Assets/Scripts/Runtime/MainController.cs' }
      }
    };
    
    const requestTime = Date.now();
    console.log(`   ⏰ Document symbols request sent at: ${requestTime - testStartTime}ms`);
    mcp.stdin.write(JSON.stringify(docSymbolsRequest) + '\n');
  }, 80000); // 80 seconds after start
  
  // Final analysis
  setTimeout(() => {
    console.log('\n📊 FINAL ANALYSIS...');
    analyzeResults();
  }, 120000); // 2 minutes total
}

let responses = [];

function analyzeResults() {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 PERFORMANCE AND FILE PATH ANALYSIS');
  console.log('═'.repeat(80));
  
  console.log(`📥 Total responses received: ${responses.length}`);
  
  if (responses.length > 0) {
    console.log('\n⏱️  Response times analysis:');
    responses.forEach((response, index) => {
      console.log(`   ${index + 1}. ID=${response.id}, Time=${response.responseTime}ms, Success=${response.success}`);
      if (response.error) {
        console.log(`      ❌ Error: ${response.error}`);
      }
    });
    
    // Find patterns
    const successfulPaths = responses.filter(r => r.success && r.type === 'diagnostics');
    const failedPaths = responses.filter(r => !r.success && r.type === 'diagnostics');
    
    console.log('\n📁 File path analysis:');
    console.log(`   ✅ Successful paths: ${successfulPaths.length}`);
    console.log(`   ❌ Failed paths: ${failedPaths.length}`);
    
    if (successfulPaths.length > 0) {
      console.log('\n✅ Working file path patterns:');
      successfulPaths.forEach(r => console.log(`   • ${r.filePath}`));
    }
    
    if (failedPaths.length > 0) {
      console.log('\n❌ Failed file path patterns:');
      failedPaths.forEach(r => console.log(`   • ${r.filePath} - ${r.error}`));
    }
    
    // Performance analysis
    const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
    console.log(`\n⏱️  Average response time: ${avgResponseTime.toFixed(0)}ms`);
    
    if (avgResponseTime > 10000) {
      console.log('\n🚨 PERFORMANCE ISSUE CONFIRMED:');
      console.log('   • Response times are extremely slow (>10 seconds)');
      console.log('   • This explains why previous tests appeared to fail');
      console.log('   • LSP is working but performing poorly');
    }
    
    // Root cause identification
    console.log('\n🎯 ROOT CAUSE IDENTIFICATION:');
    if (failedPaths.length > 0 && failedPaths[0].error.includes('Failed to read file')) {
      console.log('   1. 📁 File path resolution issue: MCP wrapper cannot find files');
      console.log('   2. ⏱️  Extreme performance degradation: LSP takes 10+ seconds per request');
      console.log('   3. 🔧 This is not a communication failure - it is a performance/path issue');
      
      console.log('\n💡 SOLUTION RECOMMENDATIONS:');
      console.log('   • Fix file path resolution in MCP wrapper');
      console.log('   • Investigate why LSP is so slow (possibly Unity project complexity)');
      console.log('   • Consider timeout adjustments for slow responses');
      console.log('   • Test with simpler C# projects to confirm performance issue');
    }
  }
  
  mcp.kill();
}

// Track stdout for responses with timing
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const responseTime = Date.now() - testStartTime;
      
      console.log(`   📥 Response received: ID=${response.id}, Time=${responseTime}ms`);
      
      let responseInfo = {
        id: response.id,
        responseTime: responseTime,
        success: false,
        error: null,
        type: 'unknown',
        filePath: null
      };
      
      if (response.result) {
        const text = response.result.content?.[0]?.text || '';
        responseInfo.success = !text.includes('failed') && !text.includes('error');
        
        if (text.includes('diagnostics')) {
          responseInfo.type = 'diagnostics';
        } else if (text.includes('symbol')) {
          responseInfo.type = 'symbols';
        }
        
        if (!responseInfo.success) {
          responseInfo.error = text.substring(0, 100) + '...';
        }
        
        console.log(`      ${responseInfo.success ? '✅' : '❌'} ${responseInfo.success ? 'Success' : 'Failed'}`);
      } else if (response.error) {
        responseInfo.error = response.error.message;
        console.log(`      ❌ Error: ${response.error.message}`);
      }
      
      responses.push(responseInfo);
    } catch (e) {
      console.log(`   📥 Non-JSON response: ${line.substring(0, 50)}...`);
    }
  }
});

// Error handling
mcp.on('error', (error) => {
  console.error('❌ MCP Process Error:', error);
});

mcp.on('exit', (code, signal) => {
  console.log(`\n🔚 Analysis completed (exit code: ${code}, signal: ${signal})`);
});

// Extended timeout for slow responses
setTimeout(() => {
  console.log('\n⏰ Extended timeout reached');
  analyzeResults();
}, 180000); // 3 minutes total