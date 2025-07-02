/**
 * Phase 1 End-to-End Integration Test
 * Tests actual functionality with a real C# file
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(dirname(__dirname));

describe('Phase 1 E2E Integration', () => {
  let serverProcess: ChildProcess;
  let client: Client;
  let transport: StdioClientTransport;

  // Test C# file content
  const testFilePath = resolve(projectRoot, 'test-projects', 'test-hover.cs');
  const testFileContent = `using System;

namespace TestProject
{
    public class Calculator
    {
        public int Add(int a, int b)
        {
            return a + b;
        }
        
        public static void Main()
        {
            var calc = new Calculator();
            var result = calc.Add(5, 3);
            Console.WriteLine(result);
        }
    }
}`;

  beforeAll(async () => {
    // Create test file
    writeFileSync(testFilePath, testFileContent);

    // Start the MCP server
    const serverPath = resolve(projectRoot, 'dist/cli.js');
    console.log('Starting MCP server:', serverPath);
    
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        PROJECT_ROOT: projectRoot,
        DOTNET_ROOT: process.env.DOTNET_ROOT || '/opt/homebrew/share/dotnet'
      }
    });

    // Create MCP client
    transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env: {
        ...process.env,
        PROJECT_ROOT: projectRoot,
        DOTNET_ROOT: process.env.DOTNET_ROOT || '/opt/homebrew/share/dotnet'
      }
    });

    client = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await client.connect(transport);
    console.log('Client connected');

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  });

  describe('Phase 1.2: MCP Server', () => {
    it('should list available tools', async () => {
      const tools = await client.listTools();
      console.log('Available tools:', tools);
      
      expect(tools.tools).toBeDefined();
      expect(tools.tools.length).toBeGreaterThan(0);
      
      // Should have at least ping and hover tools
      const toolNames = tools.tools.map(t => t.name);
      expect(toolNames).toContain('ping');
      expect(toolNames).toContain('lsp_get_hover');
    });

    it('should execute ping tool', async () => {
      const result = await client.callTool({
        name: 'ping'
      });
      
      console.log('Ping result:', result);
      expect(result.content).toBeDefined();
      expect(result.content[0]).toBeDefined();
      expect(result.content[0].text).toContain('pong');
    });
  });

  describe('Phase 1.4: Hover Tool', () => {
    it('should get hover information for Calculator class', async () => {
      const result = await client.callTool({
        name: 'lsp_get_hover',
        arguments: {
          filePath: 'test-projects/test-hover.cs',
          line: 4,  // Calculator class line
          character: 18  // class name position
        }
      });

      console.log('Hover result:', result);
      expect(result.content).toBeDefined();
      expect(result.content[0]).toBeDefined();
      
      // Should contain information about Calculator class
      const hoverText = result.content[0].text;
      expect(hoverText.toLowerCase()).toContain('calculator');
    }, 30000);

    it('should get hover information for Add method', async () => {
      const result = await client.callTool({
        name: 'lsp_get_hover',
        arguments: {
          filePath: 'test-projects/test-hover.cs',
          line: 6,  // Add method line
          character: 20  // method name position
        }
      });

      console.log('Add method hover:', result);
      expect(result.content).toBeDefined();
      
      const hoverText = result.content[0].text;
      expect(hoverText.toLowerCase()).toContain('add');
    }, 30000);
  });
});