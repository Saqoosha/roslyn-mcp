/**
 * DocumentSymbols tool - Get all symbols in a C# file using Roslyn LSP
 */

import { z } from 'zod';
import type { MCPTool, ToolContext, MCPResponse } from '../types/index.js';

const DocumentSymbolsInputSchema = z.object({
  filePath: z.string().describe('Path to the C# file (relative to project root)'),
});

type DocumentSymbolsInput = z.infer<typeof DocumentSymbolsInputSchema>;

// LSP SymbolKind mapping to readable names
const SYMBOL_KIND_NAMES: Record<number, string> = {
  1: 'File',
  2: 'Module', 
  3: 'Namespace',
  4: 'Package',
  5: 'Class',
  6: 'Method',
  7: 'Property',
  8: 'Field',
  9: 'Constructor',
  10: 'Enum',
  11: 'Interface',
  12: 'Function',
  13: 'Variable',
  14: 'Constant',
  15: 'String',
  16: 'Number',
  17: 'Boolean',
  18: 'Array',
  19: 'Object',
  20: 'Key',
  21: 'Null',
  22: 'EnumMember',
  23: 'Struct',
  24: 'Event',
  25: 'Operator',
  26: 'TypeParameter',
};

function formatSymbol(symbol: any, depth = 0): string {
  const indent = '  '.repeat(depth);
  const kindName = SYMBOL_KIND_NAMES[symbol.kind] || `Kind${symbol.kind}`;
  
  // Handle both DocumentSymbol and SymbolInformation formats
  const range = symbol.selectionRange || symbol.range || symbol.location?.range;
  let location = 'unknown';
  
  if (range && range.start) {
    location = `${range.start.line + 1}:${range.start.character + 1}`;
  } else if (symbol.location && symbol.location.range && symbol.location.range.start) {
    const r = symbol.location.range;
    location = `${r.start.line + 1}:${r.start.character + 1}`;
  }
  
  let result = `${indent}📍 **${symbol.name}** _(${kindName})_ @ Line ${location}\n`;
  
  // Add detail if available
  if (symbol.detail) {
    result += `${indent}   💬 ${symbol.detail}\n`;
  }
  
  // Add children recursively
  if (symbol.children && symbol.children.length > 0) {
    result += `${indent}   └─ Contains ${symbol.children.length} member${symbol.children.length !== 1 ? 's' : ''}:\n`;
    symbol.children.forEach((child: any) => {
      result += formatSymbol(child, depth + 2);
    });
  }
  
  return result;
}

async function executeDocumentSymbols(input: DocumentSymbolsInput, context: ToolContext): Promise<MCPResponse> {
  const { filePath } = input;
  const { lspClient, projectRoot, logger } = context;

  logger.debug('DocumentSymbols tool executed', { filePath });

  try {
    // Check if LSP client is available
    if (!lspClient || !lspClient.isRunning) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ DocumentSymbols functionality requires LSP client to be running.\n\n📄 File: \`${filePath}\`\n\n💡 This is expected in test mode or if LSP initialization failed.`
        }]
      };
    }

    // Call LSP documentSymbols with automatic document synchronization
    const { resolve: resolvePath } = await import('path');
    const { readFileSync } = await import('fs');
    
    // Convert relative path to absolute URI
    const absolutePath = resolvePath(projectRoot, filePath);
    const uri = `file://${absolutePath}`;

    // Open document if not already open
    if (!lspClient.isDocumentOpen(uri)) {
      try {
        const content = readFileSync(absolutePath, 'utf8');
        await lspClient.openDocument(uri, 'csharp', content);
        
        // Give LSP time to process the document
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        throw new Error(`Failed to read file: ${absolutePath} - ${error}`);
      }
    }

    // Call LSP documentSymbols
    const symbolsResult = await lspClient.getDocumentSymbols(uri);

    if (!symbolsResult || (Array.isArray(symbolsResult) && symbolsResult.length === 0)) {
      return {
        content: [{
          type: 'text',
          text: `❌ No symbols found in ${filePath}\n\n💡 File may be empty or contain syntax errors.`
        }]
      };
    }

    // Format symbols results
    const symbols = Array.isArray(symbolsResult) ? symbolsResult : [symbolsResult];
    
    let symbolsText = `📊 **Found ${symbols.length} top-level symbol${symbols.length !== 1 ? 's' : ''}**\n\n`;
    
    // Count total symbols including nested ones
    function countSymbols(symbolList: any[]): number {
      let count = symbolList.length;
      symbolList.forEach(symbol => {
        if (symbol.children) {
          count += countSymbols(symbol.children);
        }
      });
      return count;
    }
    
    const totalSymbols = countSymbols(symbols);
    symbolsText += `🔢 **Total symbols**: ${totalSymbols} (including nested)\n\n`;

    // Format all symbols hierarchically
    symbols.forEach(symbol => {
      symbolsText += formatSymbol(symbol);
      symbolsText += '\n';
    });

    return {
      content: [{
        type: 'text',
        text: `🗂️ **Document Symbols**\n\n📄 File: \`${filePath}\`\n\n${symbolsText}`
      }]
    };

  } catch (error) {
    logger.error('DocumentSymbols tool failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `❌ Document symbols lookup failed: ${errorMessage}`
      }],
      isError: true
    };
  }
}

export const documentSymbolsTool: MCPTool = {
  name: 'documentSymbols',
  description: 'Get all symbols (classes, methods, properties, etc.) in a C# file',
  inputSchema: DocumentSymbolsInputSchema,
  jsonSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the C# file (relative to project root)'
      }
    },
    required: ['filePath']
  },
  execute: executeDocumentSymbols,
};