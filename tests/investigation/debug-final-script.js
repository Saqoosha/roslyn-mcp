#!/usr/bin/env node

/**
 * Final debugging script to check dependency resolution and implement fixes
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectRoot = '/Users/hiko/Documents/everies/everies';
const logFile = '/tmp/roslyn-dependency-debug.log';

console.log('🔍 Final Dependency Resolution Debug');
console.log('━'.repeat(60));
console.log(`📁 Project: ${projectRoot}`);
console.log(`📋 Log file: ${logFile}`);
console.log('━'.repeat(60));

// Clear previous log
if (fs.existsSync(logFile)) {
  fs.unlinkSync(logFile);
}

// First, let's check the actual project structure
console.log('\n📊 Analyzing project structure...');

// Check .csproj files
const csprojFiles = [
  'Assembly-CSharp.csproj',
  'Assembly-CSharp-Editor.csproj',
  'everies-runtime.csproj'
];

for (const file of csprojFiles) {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ Found: ${file}`);
    
    // Check for common dependency issues
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('Unity.Logging')) {
      console.log(`  📦 Unity.Logging referenced in ${file}`);
    }
    if (content.includes('UnityEngine')) {
      console.log(`  📦 UnityEngine referenced in ${file}`);
    }
  } else {
    console.log(`❌ Missing: ${file}`);
  }
}

// Check solution file
const solutionPath = path.join(projectRoot, 'everies.sln');
if (fs.existsSync(solutionPath)) {
  console.log('✅ Found: everies.sln');
  const solutionContent = fs.readFileSync(solutionPath, 'utf8');
  const projectCount = (solutionContent.match(/\.csproj/g) || []).length;
  console.log(`  📊 Solution references ${projectCount} projects`);
} else {
  console.log('❌ Missing: everies.sln');
}

console.log('\n🚀 Starting MCP server with dependency monitoring...');

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
const startTime = Date.now();

// Monitor ALL stderr for dependency issues
mcp.stderr.on('data', (data) => {
  const logText = data.toString();
  fs.appendFileSync(logFile, logText);
  
  const lines = logText.split('\n');
  for (const line of lines) {
    if (line.includes('unresolved dependencies')) {
      console.log('🚨 DEPENDENCY ISSUE:', line);
    }
    if (line.includes('Successfully completed load')) {
      console.log('✅ PROJECT LOADED:', line.match(/\/([^\/]+\.csproj)/)?.[1] || 'Unknown');
    }
    if (line.includes('Background initialization completed')) {
      initComplete = true;
      console.log('✅ Background initialization completed');
      
      // Wait longer before testing to ensure dependencies are resolved
      setTimeout(() => {
        console.log('\n🧪 Testing with extended wait for dependency resolution...');
        testAfterDependencyWait();
      }, 10000); // Wait 10 seconds for dependencies
    }
  }
});

function testAfterDependencyWait() {
  console.log('📤 Testing hover after dependency resolution wait...');
  
  // Test hover on a simple Unity type that should definitely work
  const request = {
    jsonrpc: '2.0',
    id: 500,
    method: 'tools/call',
    params: {
      name: 'hover',
      arguments: {
        filePath: 'Assets/Scripts/Runtime/MainController.cs',
        line: 20, // [RequireComponent(typeof(VirtualTextureSource))]
        character: 5  // Hover on "RequireComponent"
      }
    }
  };
  
  mcp.stdin.write(JSON.stringify(request) + '\n');
  
  // Also test workspace symbols for Unity types
  setTimeout(() => {
    console.log('📤 Testing workspace symbols for Unity types...');
    const wsRequest = {
      jsonrpc: '2.0',
      id: 501,
      method: 'tools/call',
      params: {
        name: 'workspaceSymbols',
        arguments: {
          query: 'MonoBehaviour'
        }
      }
    };
    mcp.stdin.write(JSON.stringify(wsRequest) + '\n');
  }, 2000);
  
  // Test definitions after more time
  setTimeout(() => {
    console.log('📤 Testing definitions after extended wait...');
    const defRequest = {
      jsonrpc: '2.0',
      id: 502,
      method: 'tools/call',
      params: {
        name: 'definitions',
        arguments: {
          filePath: 'Assets/Scripts/Runtime/MainController.cs',
          line: 21, // public sealed class MainController : MonoBehaviour
          character: 39 // Hover on "MonoBehaviour"
        }
      }
    };
    mcp.stdin.write(JSON.stringify(defRequest) + '\n');
  }, 4000);
  
  // Close after all tests
  setTimeout(() => {
    console.log('\n📊 All dependency tests completed');
    mcp.kill();
  }, 8000);
}

// Handle responses with detailed analysis
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      const elapsed = Date.now() - startTime;
      
      if (response.id >= 500) {
        const testName = ['hover-unity', 'workspace-unity', 'definitions-unity'][response.id - 500];
        const text = response.result?.content?.[0]?.text || 'No content';
        
        console.log(`\n📊 ${testName.toUpperCase()} Result (${elapsed}ms):`);
        console.log('═'.repeat(60));
        
        if (text.includes('No hover information') || text.includes('No definitions') || text.includes('No symbols found')) {
          console.log('❌ FAILED: Dependencies still unresolved');
          console.log(`💡 Response: ${text.substring(0, 100)}...`);
        } else if (text.includes('C# Language Server Initializing')) {
          console.log('⚠️ WARNING: LSP still initializing');
        } else if (text.includes('Hover Information') || text.includes('Workspace Symbols') || text.includes('Definitions')) {
          console.log('🎉 SUCCESS: Dependencies resolved!');
          console.log(`📋 Preview: ${text.substring(0, 200)}...`);
        } else {
          console.log('❓ UNCLEAR: Unexpected response');
          console.log(`📋 Full: ${text.substring(0, 300)}...`);
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
  const elapsed = Date.now() - startTime;
  console.log(`\n🔚 Dependency debug completed (${elapsed}ms)`);
  console.log(`📋 Full log: ${logFile}`);
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Check log for "unresolved dependencies" messages');
  console.log('2. Look for project loading completion order');
  console.log('3. Verify Unity assemblies are being loaded');
  console.log('4. Check if dotnet restore is working properly');
  
  // Show file size
  if (fs.existsSync(logFile)) {
    const stats = fs.statSync(logFile);
    console.log(`📊 Log file size: ${(stats.size / 1024).toFixed(1)}KB`);
  }
});

// Safety timeout
setTimeout(() => {
  console.log('\n⏰ Debug timeout - killing process');
  mcp.kill();
}, 120000); // 2 minutes