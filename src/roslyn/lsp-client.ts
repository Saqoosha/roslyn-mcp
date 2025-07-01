/**
 * Roslyn LSP Client - Handles communication with Microsoft.CodeAnalysis.LanguageServer
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import type { ServerConfig, LSPRequest, LSPResponse, Logger } from '../types/index.js';
import { createLogger } from '../infrastructure/logger.js';

export interface InitializeParams {
  processId?: number;
  rootPath?: string | null;
  rootUri?: string | null;
  capabilities: {
    textDocument?: {
      hover?: { dynamicRegistration?: boolean; contentFormat?: string[] };
      completion?: { dynamicRegistration?: boolean };
      signatureHelp?: { dynamicRegistration?: boolean };
      definition?: { dynamicRegistration?: boolean };
      references?: { dynamicRegistration?: boolean };
      documentSymbol?: { dynamicRegistration?: boolean };
      codeAction?: { dynamicRegistration?: boolean };
      rename?: { dynamicRegistration?: boolean };
      publishDiagnostics?: { relatedInformation?: boolean };
    };
    workspace?: {
      workspaceFolders?: boolean;
      symbol?: { dynamicRegistration?: boolean };
    };
  };
  trace?: 'off' | 'messages' | 'verbose';
  workspaceFolders?: Array<{ uri: string; name: string }> | null;
}

export class RoslynLSPClient extends EventEmitter {
  private config: ServerConfig;
  private logger: Logger;
  private process?: ChildProcess;
  private isRunning = false;
  private requestId = 0;
  private pendingRequests = new Map<number | string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private buffer = '';

  constructor(config: ServerConfig) {
    super();
    this.config = config;
    this.logger = createLogger(config.logLevel || 'info');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('LSP client is already running');
      return;
    }

    this.logger.info('Starting Roslyn LSP client...');

    try {
      await this.startLSPProcess();
      
      // Give the LSP process a moment to start up
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.initialize();
      this.logger.info('Roslyn LSP client started successfully');
    } catch (error) {
      this.logger.error('Failed to start LSP client:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping Roslyn LSP client...');
    
    try {
      // Send shutdown request
      if (this.process) {
        await this.sendRequest('shutdown', {});
        await this.sendNotification('exit', {});
      }
    } catch (error) {
      this.logger.warn('Error during shutdown:', error);
    }

    // Kill process if still running
    if (this.process) {
      this.process.kill();
      this.process = undefined;
    }

    // Clear pending requests
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('LSP client stopped'));
    });
    this.pendingRequests.clear();

    this.isRunning = false;
    this.logger.info('Roslyn LSP client stopped');
  }

  private async startLSPProcess(): Promise<void> {
    const lspPath = this.config.roslynLSPPath || this.findRoslynLSP();
    
    this.logger.debug(`Starting LSP process: ${lspPath}`);
    
    this.process = spawn(lspPath, [
      '--stdio',
      '--logLevel', 'Information',
      '--extensionLogDirectory', '/tmp'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: this.config.projectRoot,
    });

    this.process.on('error', (error) => {
      this.logger.error('LSP process error:', error.message, (error as any).code, (error as any).errno);
      this.emit('error', error);
    });

    this.process.on('exit', (code, signal) => {
      this.logger.error(`LSP process exited early with code ${code}, signal ${signal}`);
      this.isRunning = false;
      this.emit('exit', { code, signal });
    });

    // Handle stdout data
    this.process.stdout?.on('data', (data) => {
      this.handleData(data.toString());
    });

    // Handle stderr data
    this.process.stderr?.on('data', (data) => {
      this.logger.debug('LSP stderr:', data.toString());
    });

    // Log when process starts
    this.logger.debug('LSP process started, waiting for initialization...');
    this.isRunning = true;
  }

  private findRoslynLSP(): string {
    // Default path - will be configurable later
    // Try relative path first (from project root), then fallback to absolute
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectDir = dirname(dirname(dirname(__dirname))); // Go up to project root
    const relativePath = resolve(projectDir, 'runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer');
    
    // Fallback to original absolute path if needed
    const fallbackPath = '/Users/hiko/Desktop/csharp-ls-client/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer';
    
    return existsSync(relativePath) ? relativePath : fallbackPath;
  }

  private handleData(data: string): void {
    this.buffer += data;
    
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const headers = this.buffer.substring(0, headerEnd);
      const contentLengthMatch = headers.match(/Content-Length: (\d+)/i);
      
      if (!contentLengthMatch) {
        this.logger.error('Invalid LSP message: missing Content-Length');
        this.buffer = this.buffer.substring(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1], 10);
      const messageStart = headerEnd + 4;
      
      if (this.buffer.length < messageStart + contentLength) {
        break; // Incomplete message
      }

      const content = this.buffer.substring(messageStart, messageStart + contentLength);
      this.buffer = this.buffer.substring(messageStart + contentLength);

      try {
        const message = JSON.parse(content);
        this.handleMessage(message);
      } catch (error) {
        this.logger.error('Failed to parse LSP message:', error, content);
      }
    }
  }

  private handleMessage(message: LSPResponse): void {
    this.logger.debug('Received LSP message:', message);

    if ('id' in message) {
      // Response
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);
        
        if (message.error) {
          pending.reject(new Error(`LSP Error: ${message.error.message}`));
        } else {
          pending.resolve(message.result);
        }
      }
    } else {
      // Notification
      this.emit('notification', message);
    }
  }

  private async initialize(): Promise<void> {
    const initParams: InitializeParams = {
      processId: process.pid,
      rootUri: `file://${this.config.projectRoot}`,
      capabilities: {
        textDocument: {
          hover: { dynamicRegistration: false, contentFormat: ['markdown', 'plaintext'] },
          completion: { dynamicRegistration: false },
          signatureHelp: { dynamicRegistration: false },
          definition: { dynamicRegistration: false },
          references: { dynamicRegistration: false },
          documentSymbol: { dynamicRegistration: false },
          codeAction: { dynamicRegistration: false },
          rename: { dynamicRegistration: false },
          publishDiagnostics: { relatedInformation: true },
        },
        workspace: {
          workspaceFolders: true,
          symbol: { dynamicRegistration: false },
        },
      },
      trace: 'off',
      workspaceFolders: [{
        uri: `file://${this.config.projectRoot}`,
        name: 'root',
      }],
    };

    const result = await this.sendRequest('initialize', initParams);
    this.logger.debug('Initialize result:', result);

    await this.sendNotification('initialized', {});
    this.logger.info('LSP client initialized');
  }

  async sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.isRunning) {
        reject(new Error('LSP client not running'));
        return;
      }

      const id = ++this.requestId;
      const request: LSPRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.config.timeout || 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const message = JSON.stringify(request);
      const content = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`;
      
      this.logger.debug(`Sending LSP request: ${method}`, params);
      this.process.stdin?.write(content);
    });
  }

  async sendNotification(method: string, params: any): Promise<void> {
    if (!this.process || !this.isRunning) {
      throw new Error('LSP client not running');
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    const message = JSON.stringify(notification);
    const content = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`;
    
    this.logger.debug(`Sending LSP notification: ${method}`, params);
    this.process.stdin?.write(content);
  }

  // Convenience methods for common LSP operations
  async getHover(uri: string, line: number, character: number): Promise<any> {
    return this.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async getDefinition(uri: string, line: number, character: number): Promise<any> {
    return this.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async getReferences(uri: string, line: number, character: number, includeDeclaration = false): Promise<any> {
    return this.sendRequest('textDocument/references', {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration },
    });
  }

  async getDocumentSymbols(uri: string): Promise<any> {
    return this.sendRequest('textDocument/documentSymbol', {
      textDocument: { uri },
    });
  }

  async getDiagnostics(uri: string): Promise<any> {
    // Diagnostics are typically sent as notifications, but we can request them
    return this.sendRequest('textDocument/diagnostic', {
      textDocument: { uri },
    });
  }
}