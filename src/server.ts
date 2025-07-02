/**
 * Main Roslyn MCP Server Implementation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  CallToolResult,
  ListToolsResult 
} from '@modelcontextprotocol/sdk/types.js';
import { RoslynLSPClient } from './roslyn/lsp-client.js';
import { createLogger } from './infrastructure/logger.js';
import { pingTool } from './tools/ping.js';
import { hoverTool } from './tools/hover.js';
import { definitionsTool } from './tools/definitions.js';
import { referencesTool } from './tools/references.js';
import { documentSymbolsTool } from './tools/documentSymbols.js';
import { completionTool } from './tools/completion.js';
import { signatureHelpTool } from './tools/signatureHelp.js';
import { codeActionsTool } from './tools/codeActions.js';
import { workspaceSymbolsTool } from './tools/workspaceSymbols.js';
import { diagnosticsTool } from './tools/diagnostics.js';
import { formattingTool } from './tools/formatting.js';
import type { ServerConfig, MCPTool, ToolContext } from './types/index.js';

export class RoslynMCPServer {
  private server: Server;
  private lspClient: RoslynLSPClient;
  private config: ServerConfig;
  private logger: ReturnType<typeof createLogger>;
  private tools: Map<string, MCPTool> = new Map();

  constructor(config: ServerConfig) {
    this.config = config;
    this.logger = createLogger(config.logLevel || 'info');
    
    // Initialize MCP server
    this.server = new Server({
      name: 'roslyn-mcp',
      version: '0.1.0',
    });

    // Initialize LSP client
    this.lspClient = new RoslynLSPClient(config);

    this.setupRequestHandlers();
    this.registerTools();
  }

  private setupRequestHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
      const tools = Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.jsonSchema,
      }));

      this.logger.debug(`Listed ${tools.length} tools`);
      return { tools };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
      const { name, arguments: args } = request.params;
      
      this.logger.debug(`Executing tool: ${name}`, args);

      const tool = this.tools.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        // Validate arguments
        const validatedArgs = tool.inputSchema.parse(args);
        
        // Create tool context
        const context: ToolContext = {
          lspClient: this.lspClient,
          projectRoot: this.config.projectRoot,
          logger: this.logger,
        };

        // Execute tool
        const result = await tool.execute(validatedArgs, context);
        
        this.logger.debug(`Tool ${name} executed successfully`);
        return {
          content: result.content,
          isError: result.isError || false,
          _meta: result._meta,
        };

      } catch (error) {
        this.logger.error(`Tool ${name} failed:`, error);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{
            type: 'text',
            text: `Error executing ${name}: ${errorMessage}`
          }],
          isError: true
        };
      }
    });
  }

  private registerTools(): void {
    // Register core tools
    this.registerTool(pingTool);
    this.registerTool(hoverTool);
    
    // Register LSP navigation tools
    this.registerTool(definitionsTool);
    this.registerTool(referencesTool);
    this.registerTool(documentSymbolsTool);
    
    // Register IDE features
    this.registerTool(completionTool);
    this.registerTool(signatureHelpTool);
    this.registerTool(codeActionsTool);
    this.registerTool(workspaceSymbolsTool);
    this.registerTool(diagnosticsTool);
    this.registerTool(formattingTool);
    
    this.logger.info(`Registered ${this.tools.size} tools`);
  }

  private registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    this.logger.debug(`Registered tool: ${tool.name}`);
  }

  async start(): Promise<void> {
    try {
      this.logger.info('Starting Roslyn MCP Server...');
      
      // Start LSP client first (skip in test mode)
      if (!this.config.testMode) {
        await this.lspClient.start();
        this.logger.info('LSP client started successfully');
      } else {
        this.logger.info('Test mode: Skipping LSP client initialization');
      }

      // Connect to stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      this.logger.info('MCP server started successfully');
      this.logger.info(`Project root: ${this.config.projectRoot}`);
      this.logger.info(`Tools available: ${Array.from(this.tools.keys()).join(', ')}`);
      this.logger.info(`Test mode: ${this.config.testMode ? 'enabled' : 'disabled'}`);

    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Roslyn MCP Server...');
    
    try {
      if (!this.config.testMode) {
        await this.lspClient.stop();
      }
      await this.server.close();
      this.logger.info('Server stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping server:', error);
      throw error;
    }
  }
}