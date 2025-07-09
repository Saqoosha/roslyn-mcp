/**
 * Fast-Start Roslyn MCP Server 
 * Responds immediately, initializes in background
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
import { definitionsTool } from './tools/definitions.js';
import { referencesTool } from './tools/references.js';
import { documentSymbolsTool } from './tools/documentSymbols.js';
import { completionTool } from './tools/completion.js';
// import { signatureHelpTool } from './tools/signatureHelp.js'; // REMOVED: Industry-wide limitation in Unity projects
import { codeActionsTool } from './tools/codeActions.js';
import { workspaceSymbolsTool } from './tools/workspaceSymbols.js';
import { diagnosticsTool } from './tools/diagnostics.js';
import { formattingTool } from './tools/formatting.js';
import { renameTool } from './tools/rename.js';
import type { ServerConfig, MCPTool, ToolContext } from './types/index.js';

enum ReadinessState {
  STARTING = 'starting',
  LSP_CONNECTING = 'connecting',
  PROJECT_LOADING = 'loading',
  INDEXING = 'indexing', 
  READY = 'ready',
  ERROR = 'error'
}

export class FastStartRoslynMCPServer {
  private server: Server;
  private lspClient: RoslynLSPClient | null = null;
  private config: ServerConfig;
  private logger: ReturnType<typeof createLogger>;
  private tools: Map<string, MCPTool> = new Map();
  private readinessState: ReadinessState = ReadinessState.STARTING;
  private initProgress: number = 0;
  private initMessage: string = 'Starting up...';
  private backgroundInit: Promise<void> | null = null;

  constructor(config: ServerConfig) {
    this.config = config;
    this.logger = createLogger(config.logLevel || 'info');
    
    // Initialize MCP server immediately - no LSP initialization yet
    this.server = new Server({
      name: 'roslyn-mcp-fast',
      version: '0.1.0',
    });

    this.setupRequestHandlers();
    this.registerTools();
    
    this.logger.info('Fast-start MCP server created - LSP initialization will begin in background');
  }

  private setupRequestHandlers(): void {
    // Handle tool listing - always available immediately
    this.server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
      const tools = Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.jsonSchema,
      }));

      this.logger.debug(`Listed ${tools.length} tools (readiness: ${this.readinessState})`);
      return { tools };
    });

    // Handle tool execution with readiness check
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
      const { name, arguments: args } = request.params;
      
      this.logger.debug(`Executing tool: ${name} (state: ${this.readinessState})`);

      // Special handling for status/ping tools - always available
      if (name === 'ping' || name === 'status') {
        return this.handlePingTool(name, args);
      }

      // For other tools, check readiness state
      if (this.readinessState !== ReadinessState.READY) {
        return this.handleNotReadyState(name);
      }

      // Normal tool execution when ready
      return this.executeTool(name, args);
    });
  }

  private async handlePingTool(name: string, args: any): Promise<CallToolResult> {
    if (name === 'status') {
      return {
        content: [{
          type: 'text',
          text: this.getStatusReport()
        }]
      };
    }

    // Enhanced ping with readiness info
    const pingResult = await pingTool.execute(args, this.createToolContext());
    const enhancedText = `${pingResult.content[0].text}\n\n📊 **System Status**: ${this.getStatusReport()}`;
    
    return {
      content: [{
        type: 'text',
        text: enhancedText
      }]
    };
  }

  private handleNotReadyState(toolName: string): CallToolResult {
    const progressBar = '█'.repeat(Math.floor(this.initProgress / 10)) + '░'.repeat(10 - Math.floor(this.initProgress / 10));
    
    return {
      content: [{
        type: 'text',
        text: `🔄 **C# Language Server Initializing**

📊 **Progress**: [${progressBar}] ${this.initProgress}%
🔧 **Status**: ${this.initMessage}
🎯 **Requested Tool**: ${toolName}

💡 **What's happening?**
• Large Unity project requires initial analysis
• Dependencies are being restored  
• Symbol index is being built

⏱️ **Estimated time**: ${this.getEstimatedTime()} seconds

🚀 **Try again in a moment!** The \`ping\` and \`status\` tools are always available.`
      }]
    };
  }

  private async executeTool(name: string, args: any): Promise<CallToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const validatedArgs = tool.inputSchema.parse(args);
      const context = this.createToolContext();
      const result = await tool.execute(validatedArgs, context);
      
      this.logger.debug(`Tool ${name} executed successfully`);
      return {
        content: result.content,
        isError: result.isError || false,
        _meta: result._meta,
      };

    } catch (error) {
      this.logger.error(`Tool ${name} failed:`, error);
      throw error;
    }
  }

  private createToolContext(): ToolContext {
    if (!this.lspClient) {
      // For ping tool, create dummy context
      return {
        lspClient: null as any,
        projectRoot: this.config.projectRoot,
        logger: this.logger,
      };
    }

    return {
      lspClient: this.lspClient,
      projectRoot: this.config.projectRoot,
      logger: this.logger,
    };
  }

  private getStatusReport(): string {
    const stateEmojis = {
      [ReadinessState.STARTING]: '🚀',
      [ReadinessState.LSP_CONNECTING]: '🔗',
      [ReadinessState.PROJECT_LOADING]: '📁',
      [ReadinessState.INDEXING]: '🔍',
      [ReadinessState.READY]: '✅',
      [ReadinessState.ERROR]: '❌'
    };

    return `${stateEmojis[this.readinessState]} ${this.readinessState.toUpperCase()} (${this.initProgress}%) - ${this.initMessage}`;
  }

  private getEstimatedTime(): number {
    const remaining = 100 - this.initProgress;
    return Math.max(5, Math.floor(remaining / 10) * 15); // Rough estimate
  }

  private registerTools(): void {
    this.tools.set('ping', pingTool);
    this.tools.set('definitions', definitionsTool);
    this.tools.set('references', referencesTool);
    this.tools.set('documentSymbols', documentSymbolsTool);
    this.tools.set('completion', completionTool);
    // this.tools.set('signatureHelp', signatureHelpTool); // REMOVED: Industry-wide limitation in Unity projects
    this.tools.set('codeActions', codeActionsTool);
    this.tools.set('workspaceSymbols', workspaceSymbolsTool);
    this.tools.set('diagnostics', diagnosticsTool);
    this.tools.set('formatting', formattingTool);
    this.tools.set('rename', renameTool);

    this.logger.info(`Registered ${this.tools.size} tools`);
  }

  // Background initialization
  private async initializeInBackground(): Promise<void> {
    try {
      this.readinessState = ReadinessState.LSP_CONNECTING;
      this.initProgress = 10;
      this.initMessage = 'Connecting to Roslyn LSP...';
      
      this.lspClient = new RoslynLSPClient(this.config);
      
      this.initProgress = 30;
      this.initMessage = 'Starting LSP client...';
      await this.lspClient.start();
      
      this.readinessState = ReadinessState.PROJECT_LOADING;
      this.initProgress = 60;
      this.initMessage = 'Loading C# projects...';
      
      // Give time for project loading
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.readinessState = ReadinessState.INDEXING;
      this.initProgress = 85;
      this.initMessage = 'Building symbol index...';
      
      // Give time for indexing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      this.readinessState = ReadinessState.READY;
      this.initProgress = 100;
      this.initMessage = 'Ready for C# development!';
      
      this.logger.info('🎉 Background initialization completed successfully');
      
    } catch (error) {
      this.readinessState = ReadinessState.ERROR;
      this.initMessage = `Initialization failed: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error('Background initialization failed:', error);
    }
  }

  async start(): Promise<void> {
    this.logger.info('🚀 Starting fast-start MCP server...');
    
    // Start MCP server immediately
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    this.logger.info('✅ MCP server started and ready for connections');
    
    // Start background LSP initialization
    this.backgroundInit = this.initializeInBackground();
    
    this.logger.info('🔄 Background LSP initialization started');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping fast-start MCP server...');
    
    if (this.lspClient) {
      await this.lspClient.stop();
    }
    
    this.logger.info('MCP server stopped');
  }
}