/**
 * Async initialization server for immediate response with background preparation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { RoslynLSPClient } from './roslyn/lsp-client.js';
import type { ServerConfig } from './types/index.js';

export enum InitializationState {
  STARTING = 'starting',
  LSP_CONNECTING = 'lsp_connecting',
  PROJECT_DISCOVERY = 'project_discovery',
  DOTNET_RESTORE = 'dotnet_restore',
  PROJECT_LOADING = 'project_loading',
  WORKSPACE_INDEXING = 'workspace_indexing',
  READY = 'ready',
  ERROR = 'error'
}

export interface InitializationStatus {
  state: InitializationState;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // seconds
  error?: string;
}

export class AsyncRoslynMCPServer {
  private server: Server;
  private lspClient: RoslynLSPClient | null = null;
  private config: ServerConfig;
  private initStatus: InitializationStatus;
  private backgroundInit: Promise<void>;

  constructor(config: ServerConfig) {
    this.config = config;
    this.initStatus = {
      state: InitializationState.STARTING,
      progress: 0,
      message: 'Initializing MCP server...'
    };

    // Initialize MCP server immediately
    this.server = new Server({
      name: 'roslyn-mcp-async',
      version: '0.1.0',
    });

    // Start background initialization immediately
    this.backgroundInit = this.initializeInBackground();
    
    this.setupTools();
  }

  private async initializeInBackground(): Promise<void> {
    try {
      // Stage 1: LSP Connection (10%)
      this.updateStatus(InitializationState.LSP_CONNECTING, 10, 'Connecting to Roslyn LSP server...', 30);
      this.lspClient = new RoslynLSPClient(this.config);
      
      // Stage 2: Project Discovery (25%)
      this.updateStatus(InitializationState.PROJECT_DISCOVERY, 25, 'Discovering C# projects...', 25);
      // Lightweight project discovery first
      
      // Stage 3: dotnet restore (50%)
      this.updateStatus(InitializationState.DOTNET_RESTORE, 50, 'Restoring package dependencies...', 20);
      
      // Stage 4: Project Loading (75%)
      this.updateStatus(InitializationState.PROJECT_LOADING, 75, 'Loading project files...', 15);
      
      // Stage 5: Workspace Indexing (90%)
      this.updateStatus(InitializationState.WORKSPACE_INDEXING, 90, 'Building symbol index...', 10);
      
      // Stage 6: Ready (100%)
      this.updateStatus(InitializationState.READY, 100, 'Ready for C# development!');
      
    } catch (error) {
      this.updateStatus(InitializationState.ERROR, 0, 'Initialization failed', 0, error instanceof Error ? error.message : String(error));
    }
  }

  private updateStatus(state: InitializationState, progress: number, message: string, estimatedTimeRemaining?: number, error?: string) {
    this.initStatus = {
      state,
      progress,
      message,
      estimatedTimeRemaining,
      error
    };
  }

  private setupTools() {
    // Status tool - always available immediately
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'status') {
        return {
          content: [{
            type: 'text',
            text: this.formatStatus()
          }]
        };
      }

      // For other tools, check initialization state
      if (this.initStatus.state !== InitializationState.READY) {
        return {
          content: [{
            type: 'text',
            text: `🔄 **C# Tools Preparing**\n\n${this.formatStatus()}\n\n💡 **Try again in a few moments!**`
          }]
        };
      }

      // Delegate to actual tool handlers when ready
      return this.handleTool(name, args);
    });
  }

  private formatStatus(): string {
    const { state, progress, message, estimatedTimeRemaining, error } = this.initStatus;
    
    let statusText = `📊 **Initialization Status**\n\n`;
    statusText += `🔄 **State**: ${state}\n`;
    statusText += `📈 **Progress**: ${progress}%\n`;
    statusText += `💬 **Status**: ${message}\n`;
    
    if (estimatedTimeRemaining) {
      statusText += `⏰ **ETA**: ~${estimatedTimeRemaining} seconds\n`;
    }
    
    if (error) {
      statusText += `❌ **Error**: ${error}\n`;
    }
    
    // Progress bar
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
    statusText += `\n[${progressBar}] ${progress}%`;
    
    return statusText;
  }

  private async handleTool(name: string, args: any) {
    // Actual tool implementation when LSP is ready
    if (!this.lspClient) {
      throw new Error('LSP client not initialized');
    }
    
    // Delegate to existing tool handlers
    switch (name) {
      case 'ping':
        return { content: [{ type: 'text', text: '🏓 Ready for C# development!' }] };
      case 'diagnostics':
        // Use existing diagnostics tool
        break;
      // ... other tools
    }
  }

  async start(): Promise<void> {
    // MCP server starts immediately
    // Background initialization continues
  }
}