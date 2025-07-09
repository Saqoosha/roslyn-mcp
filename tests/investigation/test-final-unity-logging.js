#!/usr/bin/env node

/**
 * Final test: Check if Unity.Logging errors are resolved
 */

import { spawn } from 'child_process';

const everiesProjectRoot = '/Users/hiko/Documents/everies/everies';
console.log('🔬 Final test: Unity.Logging error resolution...\n');

const server = spawn('node', [
  'roslyn-mcp/dist/cli.js',
  '--fast-start',
  '--project', everiesProjectRoot,
  '--log-level', 'info'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: '/Users/hiko/Desktop/csharp-ls-client',
  env: { ...process.env, PROJECT_ROOT: everiesProjectRoot }
});

const startTime = Date.now();
let testDone = false;

server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      if (response.id === 999 && response.result?.content?.[0]?.text) {
        const text = response.result.content[0].text;
        const elapsed = Date.now() - startTime;
        
        console.log(`\n📊 Unity.Logging Diagnostics Result (${elapsed}ms):`);
        console.log('━'.repeat(60));
        
        if (text.includes("The name 'Log' does not exist")) {
          console.log('❌ Unity.Logging still not resolved - Log class not found');
          console.log('   This indicates assembly references are not properly loaded');
        } else if (text.includes('CS0103') && text.includes('Log')) {
          console.log('❌ Unity.Logging errors persist - compiler cannot find Log');
        } else if (text.includes('No diagnostics found') || text.includes('No errors')) {
          console.log('✅ No Unity.Logging errors found - SUCCESS!');
          console.log('   Unity.Logging class is properly resolved');
        } else if (text.includes('Found') && text.includes('diagnostics') && !text.includes('Log')) {
          console.log('✅ Unity.Logging errors resolved - no Log-related errors found');
        } else {
          console.log('📋 Diagnostic summary:');
          // Extract error summary
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.includes('❌') || line.includes('Error') || line.includes('CS0103')) {
              console.log(`   ${line.trim()}`);
            }
          }
        }
        
        console.log('━'.repeat(60));
        testDone = true;
        
        // Now test workspace symbols for Log
        setTimeout(() => {
          console.log('\n🔍 Testing workspace symbols for Unity.Logging...');
          server.stdin.write(JSON.stringify({
            "jsonrpc": "2.0", 
            "id": 998, 
            "method": "tools/call", 
            "params": { 
              "name": "workspaceSymbols", 
              "arguments": { 
                "query": "Log",
                "maxResults": 10
              } 
            }
          }) + '\n');
        }, 1000);
      }
      
      if (response.id === 998 && response.result?.content?.[0]?.text) {
        const text = response.result.content[0].text;
        
        console.log('\n🔍 Workspace Symbol Search Results:');
        console.log('━'.repeat(60));
        
        if (text.includes('Found') && text.includes('symbols')) {
          console.log('✅ Found symbols containing "Log"');
          
          // Look for Unity.Logging specifically
          if (text.includes('Unity.Logging') || text.includes('UnityEngine.Debug')) {
            console.log('🎯 Unity logging symbols detected in workspace!');
          }
        } else if (text.includes('No symbols found')) {
          console.log('⚠️  No symbols found for "Log" - workspace indexing may be incomplete');
        }
        
        console.log('━'.repeat(60));
        
        setTimeout(() => {
          server.kill();
          process.exit(0);
        }, 2000);
      }
    } catch (e) {
      // Ignore non-JSON output
    }
  }
});

server.stderr.on('data', (data) => {
  const logLine = data.toString().trim();
  
  if (logLine.includes('Background initialization completed')) {
    console.log('🎉 Unity project ready - testing diagnostics...');
    
    // Wait a few seconds for indexing to complete, then test
    setTimeout(() => {
      console.log('📡 Requesting Unity.Logging diagnostics...');
      server.stdin.write(JSON.stringify({
        "jsonrpc": "2.0", 
        "id": 999, 
        "method": "tools/call", 
        "params": { 
          "name": "diagnostics", 
          "arguments": { 
            "filePath": "Assets/Scripts/Runtime/Every.cs" 
          } 
        }
      }) + '\n');
    }, 3000);
  }
});

// Start server
setTimeout(() => {
  console.log('🚀 Starting Unity project analysis...');
  server.stdin.write(JSON.stringify({
    "jsonrpc": "2.0", 
    "id": 1, 
    "method": "tools/call", 
    "params": { 
      "name": "ping", 
      "arguments": {} 
    }
  }) + '\n');
}, 1000);

// Timeout after 90 seconds
setTimeout(() => {
  if (!testDone) {
    console.log('\n⏰ Test timed out after 90 seconds');
    console.log('Large Unity projects may require more time for complete initialization');
  }
  server.kill();
  process.exit(0);
}, 90000);

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});