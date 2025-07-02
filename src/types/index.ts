/**
 * Type definitions for roslyn-mcp
 */

import { z } from 'zod';
import type { RoslynLSPClient } from '../roslyn/lsp-client.js';

// MCP Tool definition interface
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  jsonSchema: {
    type: 'object';
    properties?: Record<string, any>;
  };
  execute: (args: any, context: ToolContext) => Promise<MCPResponse>;
}

// Tool execution context
export interface ToolContext {
  lspClient: RoslynLSPClient;
  projectRoot: string;
  logger: Logger;
}

// MCP Response format (matches MCP SDK CallToolResult)
export interface MCPResponse {
  content: Array<{
    type: 'text';
    text: string;
  } | {
    type: 'image';
    data: string;
    mimeType: string;
  } | {
    type: 'resource';
    resource: {
      uri: string;
      mimeType?: string;
      text: string;
    };
  }>;
  isError?: boolean;
  _meta?: Record<string, any>;
}

// Logger interface
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// LSP Message types
export interface LSPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

export interface LSPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// Server configuration
export interface ServerConfig {
  projectRoot: string;
  roslynLSPPath?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  timeout?: number;
  maxRestartAttempts?: number;
  testMode?: boolean; // Skip LSP client initialization for testing
}