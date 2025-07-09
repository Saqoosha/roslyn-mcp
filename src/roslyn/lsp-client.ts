/**
 * Roslyn LSP Client - Handles communication with Microsoft.CodeAnalysis.LanguageServer
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { resolve, dirname } from 'path';
import { existsSync, readdirSync } from 'fs';
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
  
  // Document synchronization state
  private openDocuments = new Map<string, {
    uri: string;
    languageId: string;
    version: number;
    content: string;
  }>();

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
      
      // CRITICAL FIX: Load solution/projects for workspace symbols
      await this.loadSolutionOrProjects();
      
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
    
    // When compiled, this is in dist/index.js, so we only need to go up 1 level to project root
    const projectDir = dirname(__dirname); // dist -> roslyn-mcp
    const relativePath = resolve(projectDir, 'runtime/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer');
    
    // Fallback to original absolute path if needed
    const fallbackPath = '/Users/hiko/Desktop/csharp-ls-client/roslyn-lsp/content/LanguageServer/osx-arm64/Microsoft.CodeAnalysis.LanguageServer';
    
    const result = existsSync(relativePath) ? relativePath : fallbackPath;
    this.logger.debug(`Using LSP path: ${result}`);
    return result;
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
      // Notification - log important ones
      const notification = message as any; // Fix TypeScript issue
      
      // MICROSOFT C# EXTENSION COMPATIBILITY: Log critical notifications
      if (notification.method === 'workspace/projectInitializationComplete') {
        this.logger.info('🎉 RECEIVED: workspace/projectInitializationComplete notification');
      } else if (notification.method === 'window/logMessage') {
        const logLevel = notification.params?.type || 0;
        const logMessage = notification.params?.message || '';
        const levelName = ['', 'ERROR', 'WARN', 'INFO', 'LOG'][logLevel] || 'UNKNOWN';
        this.logger.info(`LSP ${levelName}: ${logMessage}`);
      } else if (notification.method === 'window/showMessage') {
        this.logger.info(`LSP Message: ${notification.params?.message || ''}`);
      }
      
      this.emit('notification', notification);
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

  async getCompletion(uri: string, line: number, character: number): Promise<any> {
    return this.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position: { line, character },
      context: {
        triggerKind: 1, // Invoked - completion was triggered by typing
        triggerCharacter: undefined
      }
    });
  }

  async getSignatureHelp(uri: string, line: number, character: number): Promise<any> {
    return this.sendRequest('textDocument/signatureHelp', {
      textDocument: { uri },
      position: { line, character },
      context: {
        triggerKind: 1, // Invoked - signature help was triggered by typing
        triggerCharacter: undefined,
        isRetrigger: false
      }
    });
  }

  async getCodeActions(uri: string, line: number, character: number, endLine: number, endCharacter: number, diagnostics?: any[]): Promise<any> {
    return this.sendRequest('textDocument/codeAction', {
      textDocument: { uri },
      range: {
        start: { line, character },
        end: { line: endLine, character: endCharacter }
      },
      context: {
        diagnostics: diagnostics || [],
        only: undefined, // Request all types of code actions
        triggerKind: 1 // Invoked
      }
    });
  }

  async getWorkspaceSymbols(query: string): Promise<any> {
    return this.sendRequest('workspace/symbol', {
      query
    });
  }

  async getFormatting(uri: string, options: any): Promise<any> {
    return this.sendRequest('textDocument/formatting', {
      textDocument: { uri },
      options: {
        tabSize: options.tabSize || 4,
        insertSpaces: options.insertSpaces !== false,
        trimTrailingWhitespace: options.trimTrailingWhitespace !== false,
        insertFinalNewline: options.insertFinalNewline !== false,
        ...options
      }
    });
  }

  // Document synchronization methods
  async openDocument(uri: string, languageId: string, content: string): Promise<void> {
    // Check if document is already open
    if (this.openDocuments.has(uri)) {
      this.logger.debug(`Document already open: ${uri}`);
      return;
    }

    const version = 1;
    
    // Store document state
    this.openDocuments.set(uri, {
      uri,
      languageId,
      version,
      content,
    });

    // Send textDocument/didOpen notification to LSP
    await this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId,
        version,
        text: content,
      },
    });

    this.logger.debug(`Opened document: ${uri} (version ${version})`);
  }

  async changeDocument(uri: string, content: string, changes?: any[]): Promise<void> {
    const doc = this.openDocuments.get(uri);
    if (!doc) {
      throw new Error(`Document not open: ${uri}`);
    }

    // Increment version
    doc.version++;
    doc.content = content;

    // Send textDocument/didChange notification to LSP
    const changeEvent = changes || [{
      text: content, // Full document sync for simplicity
    }];

    await this.sendNotification('textDocument/didChange', {
      textDocument: {
        uri: doc.uri,
        version: doc.version,
      },
      contentChanges: changeEvent,
    });

    this.logger.debug(`Changed document: ${uri} (version ${doc.version})`);
  }

  async closeDocument(uri: string): Promise<void> {
    const doc = this.openDocuments.get(uri);
    if (!doc) {
      this.logger.debug(`Document not open: ${uri}`);
      return;
    }

    // Remove from tracking
    this.openDocuments.delete(uri);

    // Send textDocument/didClose notification to LSP
    await this.sendNotification('textDocument/didClose', {
      textDocument: { uri },
    });

    this.logger.debug(`Closed document: ${uri}`);
  }

  // Utility methods for document management
  isDocumentOpen(uri: string): boolean {
    return this.openDocuments.has(uri);
  }

  getOpenDocuments(): string[] {
    return Array.from(this.openDocuments.keys());
  }

  getDocumentVersion(uri: string): number | undefined {
    return this.openDocuments.get(uri)?.version;
  }

  // Enhanced hover method with automatic document opening
  async getHoverWithDocSync(filePath: string, line: number, character: number): Promise<any> {
    const { resolve: resolvePath } = await import('path');
    const { readFileSync } = await import('fs');
    
    // Convert relative path to absolute URI
    const absolutePath = resolvePath(this.config.projectRoot, filePath);
    const uri = `file://${absolutePath}`;

    // Open document if not already open
    if (!this.isDocumentOpen(uri)) {
      try {
        const content = readFileSync(absolutePath, 'utf8');
        await this.openDocument(uri, 'csharp', content);
        
        // Give LSP time to process the document
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        throw new Error(`Failed to read file: ${absolutePath} - ${error}`);
      }
    }

    // Now perform hover request
    return this.getHover(uri, line, character);
  }

  // Enhanced completion method with automatic document opening
  async getCompletionWithDocSync(filePath: string, line: number, character: number): Promise<any> {
    const { resolve: resolvePath } = await import('path');
    const { readFileSync } = await import('fs');
    
    // Convert relative path to absolute URI
    const absolutePath = resolvePath(this.config.projectRoot, filePath);
    const uri = `file://${absolutePath}`;

    // Open document if not already open
    if (!this.isDocumentOpen(uri)) {
      try {
        const content = readFileSync(absolutePath, 'utf8');
        await this.openDocument(uri, 'csharp', content);
        
        // Give LSP time to process the document
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        throw new Error(`Failed to read file: ${absolutePath} - ${error}`);
      }
    }

    // Now perform completion request
    return this.getCompletion(uri, line, character);
  }

  // Enhanced signature help method with automatic document opening
  async getSignatureHelpWithDocSync(filePath: string, line: number, character: number): Promise<any> {
    const { resolve: resolvePath } = await import('path');
    const { readFileSync } = await import('fs');
    
    // Convert relative path to absolute URI
    const absolutePath = resolvePath(this.config.projectRoot, filePath);
    const uri = `file://${absolutePath}`;

    // Open document if not already open
    if (!this.isDocumentOpen(uri)) {
      try {
        const content = readFileSync(absolutePath, 'utf8');
        await this.openDocument(uri, 'csharp', content);
        
        // Give LSP time to process the document
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        throw new Error(`Failed to read file: ${absolutePath} - ${error}`);
      }
    }

    // Now perform signature help request
    return this.getSignatureHelp(uri, line, character);
  }

  // Enhanced code actions method with automatic document opening
  async getCodeActionsWithDocSync(filePath: string, line: number, character: number, endLine: number, endCharacter: number, diagnostics?: any[]): Promise<any> {
    const { resolve: resolvePath } = await import('path');
    const { readFileSync } = await import('fs');
    
    // Convert relative path to absolute URI
    const absolutePath = resolvePath(this.config.projectRoot, filePath);
    const uri = `file://${absolutePath}`;

    // Open document if not already open
    if (!this.isDocumentOpen(uri)) {
      try {
        const content = readFileSync(absolutePath, 'utf8');
        await this.openDocument(uri, 'csharp', content);
        
        // Give LSP time to process the document
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        throw new Error(`Failed to read file: ${absolutePath} - ${error}`);
      }
    }

    // Now perform code actions request
    return this.getCodeActions(uri, line, character, endLine, endCharacter, diagnostics);
  }

  // Enhanced diagnostics method with automatic document opening
  async getDiagnosticsWithDocSync(filePath: string): Promise<any> {
    const { resolve: resolvePath } = await import('path');
    const { readFileSync } = await import('fs');
    
    // Convert relative path to absolute URI
    const absolutePath = resolvePath(this.config.projectRoot, filePath);
    const uri = `file://${absolutePath}`;

    // Open document if not already open
    if (!this.isDocumentOpen(uri)) {
      try {
        const content = readFileSync(absolutePath, 'utf8');
        await this.openDocument(uri, 'csharp', content);
        
        // Give LSP time to process the document and generate diagnostics
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        throw new Error(`Failed to read file: ${absolutePath} - ${error}`);
      }
    }

    // Now perform diagnostics request
    return this.getDiagnostics(uri);
  }

  // Enhanced formatting method with automatic document opening
  async getFormattingWithDocSync(filePath: string, options: any): Promise<any> {
    const { resolve: resolvePath } = await import('path');
    const { readFileSync } = await import('fs');
    
    // Convert relative path to absolute URI
    const absolutePath = resolvePath(this.config.projectRoot, filePath);
    const uri = `file://${absolutePath}`;

    // Open document if not already open
    if (!this.isDocumentOpen(uri)) {
      try {
        const content = readFileSync(absolutePath, 'utf8');
        await this.openDocument(uri, 'csharp', content);
        
        // Give LSP time to process the document
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        throw new Error(`Failed to read file: ${absolutePath} - ${error}`);
      }
    }

    // Now perform formatting request
    return this.getFormatting(uri, options);
  }

  // ===== RENAME METHODS =====

  /**
   * Prepare rename - check if position is renameable
   */
  async getPrepareRename(uri: string, line: number, character: number): Promise<any> {
    return this.sendRequest('textDocument/prepareRename', {
      textDocument: { uri },
      position: { line, character }
    });
  }

  /**
   * Get rename edits for a symbol at a specific position
   */
  async getRename(uri: string, line: number, character: number, newName: string): Promise<any> {
    return this.sendRequest('textDocument/rename', {
      textDocument: { uri },
      position: { line, character },
      newName
    });
  }

  /**
   * Enhanced rename method with automatic document opening and prepare rename validation
   */
  async getRenameWithDocSync(filePath: string, line: number, character: number, newName: string): Promise<any> {
    const { resolve: resolvePath } = await import('path');
    const { readFileSync } = await import('fs');
    
    // Convert relative path to absolute URI
    const absolutePath = resolvePath(this.config.projectRoot, filePath);
    const uri = `file://${absolutePath}`;

    // Open document if not already open
    if (!this.isDocumentOpen(uri)) {
      try {
        const content = readFileSync(absolutePath, 'utf8');
        await this.openDocument(uri, 'csharp', content);
        
        // Give LSP time to process the document
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        throw new Error(`Failed to read file: ${absolutePath} - ${error}`);
      }
    }

    // CRITICAL: First call prepareRename to validate the position
    let prepareResult;
    try {
      prepareResult = await this.getPrepareRename(uri, line, character);
      this.logger.info('🔍 Prepare rename result:', JSON.stringify(prepareResult, null, 2));
      
      // If prepareRename fails or returns nothing, the position is not renameable
      if (!prepareResult) {
        this.logger.info('❌ prepareRename returned null/undefined');
        return {
          error: {
            code: -32600,
            message: 'Position is not renameable - prepareRename returned no result',
            details: { prepareResult: null }
          }
        };
      }
      
      if (prepareResult.error) {
        this.logger.info('❌ prepareRename returned error:', prepareResult.error);
        return {
          error: {
            code: -32600,
            message: `Position is not renameable - prepareRename error: ${prepareResult.error.message}`,
            details: { prepareResult }
          }
        };
      }
    } catch (error) {
      this.logger.info('❌ prepareRename threw exception:', error);
      return {
        error: {
          code: -32600,
          message: `Prepare rename failed: ${error instanceof Error ? error.message : String(error)}`,
          details: { exception: error }
        }
      };
    }

    // Now perform actual rename request
    try {
      const renameResult = await this.getRename(uri, line, character, newName);
      this.logger.info('🔄 Rename result:', JSON.stringify(renameResult, null, 2));
      return renameResult;
    } catch (error) {
      this.logger.info('❌ getRename threw exception:', error);
      return {
        error: {
          code: -32600,
          message: `Rename failed: ${error instanceof Error ? error.message : String(error)}`,
          details: { exception: error, prepareResult }
        }
      };
    }
  }

  // ===== SOLUTION/PROJECT LOADING METHODS (WORKSPACE SYMBOLS FIX) =====

  /**
   * Load solution or projects to enable workspace symbols
   * This implements the same approach as VS Code C# extension
   */
  private async loadSolutionOrProjects(): Promise<void> {
    try {
      this.logger.info(`Starting solution/project discovery in: ${this.config.projectRoot}`);
      
      // Discover solution and project files
      const solutionFile = this.findSolutionFile();
      const projectFiles = this.findProjectFiles();

      this.logger.info(`Discovery results - Solution: ${solutionFile}, Projects: ${projectFiles.length}`);

      // CRITICAL: Run dotnet restore before loading solution/projects
      // This ensures proper hover information and dependency resolution
      if (solutionFile || projectFiles.length > 0) {
        await this.runDotnetRestore(solutionFile || projectFiles[0]);
      }

      if (solutionFile) {
        this.logger.info(`Loading solution: ${solutionFile}`);
        await this.sendNotification('solution/open', {
          solution: `file://${solutionFile}`
        });
      } else if (projectFiles.length > 0) {
        this.logger.info(`Loading ${projectFiles.length} project(s): ${projectFiles.join(', ')}`);
        await this.sendNotification('project/open', {
          projects: projectFiles.map(f => `file://${f}`)
        });
      } else {
        this.logger.warn('No solution or project files found - workspace symbols may not work');
        return;
      }

      // CRITICAL: Wait for projectInitializationComplete notification FROM server
      // Microsoft's C# extension waits for this notification from Roslyn LSP
      this.logger.info('Waiting for workspace/projectInitializationComplete notification from server...');
      
      // Wait for project initialization to complete
      await this.waitForProjectInitialization();
      this.logger.info('Solution/project loading completed');

    } catch (error) {
      this.logger.error('Failed to load solution/projects:', error);
      this.logger.error('Error details:', JSON.stringify(error, null, 2));
      // Don't throw - workspace symbols simply won't work
    }
  }

  /**
   * Find solution file recursively in workspace (like C# Dev Kit)
   */
  private findSolutionFile(): string | null {
    try {
      this.logger.info(`Scanning for solution files recursively in: ${this.config.projectRoot}`);
      const solutionFiles = this.findFilesRecursively(this.config.projectRoot, /\.(sln|slnf)$/);
      this.logger.info(`Solution files: ${solutionFiles.join(', ')}`);
      
      if (solutionFiles.length > 0) {
        const solutionFile = solutionFiles[0]; // Take first solution file found
        this.logger.info(`Found solution file: ${solutionFile}`);
        return solutionFile;
      } else {
        this.logger.info('No solution files found');
      }
    } catch (error) {
      this.logger.error('Error scanning for solution files:', error);
      throw error; // Re-throw to see what's happening
    }

    return null;
  }

  /**
   * Find project files recursively in workspace (like C# Dev Kit)
   */
  private findProjectFiles(): string[] {
    try {
      this.logger.info(`Scanning for project files recursively in: ${this.config.projectRoot}`);
      const projectFiles = this.findFilesRecursively(this.config.projectRoot, /\.(csproj|vbproj|fsproj)$/);
      
      this.logger.info(`Found ${projectFiles.length} project file(s): ${projectFiles.join(', ')}`);
      return projectFiles;
    } catch (error) {
      this.logger.error('Error scanning for project files:', error);
      throw error; // Re-throw to see what's happening
    }
  }

  /**
   * Recursively find files matching pattern (mimics VS Code workspace.findFiles)
   */
  private findFilesRecursively(dir: string, pattern: RegExp, maxDepth: number = 10): string[] {
    const results: string[] = [];
    
    if (maxDepth <= 0) return results;
    
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = resolve(dir, entry.name);
        
        // Skip common excluded directories (like C# Dev Kit does)
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === 'bin' || entry.name === 'obj' || 
              entry.name === '.git' || entry.name === 'Temp' || entry.name === 'Library') {
            continue;
          }
          results.push(...this.findFilesRecursively(fullPath, pattern, maxDepth - 1));
        } else if (entry.isFile() && pattern.test(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore directories we can't read
      this.logger.debug(`Cannot read directory: ${dir}, ${error}`);
    }
    
    return results;
  }

  /**
   * Wait for project initialization complete notification
   */
  private async waitForProjectInitialization(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener('notification', handler);
        this.logger.warn('Project initialization timeout - continuing anyway');
        resolve(); // Don't fail, just continue
      }, this.config.timeout || 120000); // Use config timeout or 120 second default for large projects

      const handler = (notification: any) => {
        if (notification.method === 'workspace/projectInitializationComplete') {
          clearTimeout(timeout);
          this.removeListener('notification', handler);
          this.logger.info('🎉 Project initialization completed - workspace symbols should now work');
          resolve();
        }
      };

      this.on('notification', handler);
    });
  }

  /**
   * Run dotnet restore to ensure project dependencies are available
   * This is critical for proper hover information and IntelliSense
   */
  private async runDotnetRestore(solutionOrProjectPath: string): Promise<void> {
    try {
      this.logger.info(`Running dotnet restore for: ${solutionOrProjectPath}`);
      
      const projectDir = dirname(solutionOrProjectPath);
      const fileName = solutionOrProjectPath.split('/').pop() || '';
      
      return new Promise((resolve, reject) => {
        const restoreProcess = spawn('dotnet', ['restore', fileName], {
          cwd: projectDir,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        restoreProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        restoreProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        restoreProcess.on('close', (code) => {
          if (code === 0) {
            this.logger.info(`✅ dotnet restore completed successfully`);
            this.logger.debug(`Restore output: ${stdout.trim()}`);
            resolve();
          } else {
            this.logger.warn(`⚠️ dotnet restore failed with code ${code}`);
            this.logger.warn(`Restore error: ${stderr.trim()}`);
            this.logger.warn(`Restore output: ${stdout.trim()}`);
            this.logger.info('Continuing without restore - hover functionality may be limited');
            // Don't reject - continue without restore
            resolve();
          }
        });

        restoreProcess.on('error', (error) => {
          this.logger.warn(`⚠️ Failed to run dotnet restore: ${error.message}`);
          this.logger.info('Continuing without restore - hover functionality may be limited');
          // Don't reject - continue without restore
          resolve();
        });

        // Set timeout for restore operation
        setTimeout(() => {
          if (!restoreProcess.killed) {
            restoreProcess.kill();
            this.logger.warn('⚠️ dotnet restore timed out after 60 seconds');
            this.logger.info('Continuing without restore - hover functionality may be limited');
            resolve();
          }
        }, 60000); // 60 second timeout
      });

    } catch (error) {
      this.logger.warn(`Failed to run dotnet restore: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.info('Continuing without restore - hover functionality may be limited');
      // Don't throw - continue without restore
    }
  }
}