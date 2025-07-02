/**
 * WorkspaceSymbols tool - Search for symbols across the entire project using Roslyn LSP
 */

import { z } from 'zod';
import type { MCPTool, ToolContext, MCPResponse } from '../types/index.js';

const WorkspaceSymbolsInputSchema = z.object({
  query: z.string().describe('Search query for symbols (class names, method names, etc.)'),
  maxResults: z.number().min(1).max(100).optional().default(50).describe('Maximum number of results to return'),
});

type WorkspaceSymbolsInput = z.infer<typeof WorkspaceSymbolsInputSchema>;

// LSP SymbolKind mapping to readable names and icons
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

const SYMBOL_KIND_ICONS: Record<number, string> = {
  1: '📄', 2: '📦', 3: '📁', 4: '📦', 5: '🏛️', 6: '🔧', 7: '🔑', 8: '🏷️', 9: '🏗️', 10: '📋',
  11: '🔗', 12: '⚡', 13: '📦', 14: '💎', 15: '📝', 16: '🔢', 17: '✅', 18: '📚', 19: '🗂️', 20: '🔑',
  21: '❌', 22: '🏷️', 23: '🏗️', 24: '📡', 25: '⚙️', 26: '🧬'
};

function formatSymbol(symbol: any): string {
  const kind = symbol.kind || 1;
  const kindName = SYMBOL_KIND_NAMES[kind] || `Kind${kind}`;
  const icon = SYMBOL_KIND_ICONS[kind] || '❓';
  
  let result = `${icon} **${symbol.name}** _(${kindName})_`;
  
  // Add container info if available
  if (symbol.containerName) {
    result += `\n   📁 In: ${symbol.containerName}`;
  }
  
  // Add location info
  if (symbol.location && symbol.location.uri) {
    const uri = symbol.location.uri;
    const fileName = uri.substring(uri.lastIndexOf('/') + 1);
    const range = symbol.location.range;
    
    if (range && range.start) {
      result += `\n   📍 ${fileName}:${range.start.line + 1}:${range.start.character + 1}`;
    } else {
      result += `\n   📍 ${fileName}`;
    }
  }
  
  return result;
}

async function executeWorkspaceSymbols(input: WorkspaceSymbolsInput, context: ToolContext): Promise<MCPResponse> {
  const { query, maxResults } = input;
  const { lspClient, projectRoot, logger } = context;

  logger.debug('WorkspaceSymbols tool executed', { query, maxResults });

  try {
    // Check if LSP client is available
    if (!lspClient || !lspClient.isRunning) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ Workspace symbol search requires LSP client to be running.\n\n🔍 Query: "${query}"\n\n💡 This is expected in test mode or if LSP initialization failed.`
        }]
      };
    }

    // Call LSP workspace symbols
    const symbolsResult = await lspClient.getWorkspaceSymbols(query);

    if (!symbolsResult || (Array.isArray(symbolsResult) && symbolsResult.length === 0)) {
      return {
        content: [{
          type: 'text',
          text: `❌ No symbols found for query: "${query}"\n\n💡 Try:\n• Searching for class names (e.g., "Calculator")\n• Searching for method names (e.g., "Add")\n• Using partial names (e.g., "Calc" for Calculator)\n• Checking spelling and case sensitivity`
        }]
      };
    }

    // Handle the result (should be an array of WorkspaceSymbol objects)
    const symbols = Array.isArray(symbolsResult) ? symbolsResult : [symbolsResult];

    if (symbols.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `❌ No symbols found matching "${query}"\n\n💡 Workspace symbol search looks for:\n• Class names\n• Method names\n• Property names\n• Field names\n• Namespaces\n• Interfaces and enums`
        }]
      };
    }

    // Limit results
    const limitedSymbols = symbols.slice(0, maxResults);

    // Group by symbol kind for better organization
    const groupedSymbols = new Map<number, any[]>();
    limitedSymbols.forEach(symbol => {
      const kind = symbol.kind || 1;
      if (!groupedSymbols.has(kind)) {
        groupedSymbols.set(kind, []);
      }
      groupedSymbols.get(kind)!.push(symbol);
    });

    let symbolsText = `🔍 **Found ${symbols.length} symbol${symbols.length !== 1 ? 's' : ''}** matching "${query}"${symbols.length > maxResults ? ` (showing top ${limitedSymbols.length})` : ''}\n\n`;

    // Show grouped results
    const sortedGroups = Array.from(groupedSymbols.entries())
      .sort(([kindA], [kindB]) => {
        // Prioritize common kinds: Class, Interface, Method, Property, Field
        const priority = [5, 11, 6, 7, 8, 9, 10, 3, 23, 24]; // Class, Interface, Method, Property, Field, Constructor, Enum, Namespace, Struct, Event
        const indexA = priority.indexOf(kindA);
        const indexB = priority.indexOf(kindB);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return kindA - kindB;
      });

    for (const [kind, groupSymbols] of sortedGroups) {
      const kindName = SYMBOL_KIND_NAMES[kind] || `Kind${kind}`;
      const icon = SYMBOL_KIND_ICONS[kind] || '❓';
      
      if (groupSymbols.length > 0) {
        symbolsText += `${icon} **${kindName}** (${groupSymbols.length})\n`;
        
        // Show each symbol in the group
        groupSymbols.forEach(symbol => {
          symbolsText += `   • **${symbol.name}**`;
          
          if (symbol.containerName) {
            symbolsText += ` _(in ${symbol.containerName})_`;
          }
          
          if (symbol.location && symbol.location.uri) {
            const uri = symbol.location.uri;
            const fileName = uri.substring(uri.lastIndexOf('/') + 1);
            const range = symbol.location.range;
            
            if (range && range.start) {
              symbolsText += ` - ${fileName}:${range.start.line + 1}`;
            } else {
              symbolsText += ` - ${fileName}`;
            }
          }
          
          symbolsText += '\n';
        });
        symbolsText += '\n';
      }
    }

    return {
      content: [{
        type: 'text',
        text: `🔍 **Workspace Symbol Search**\n\n🎯 Query: "${query}"\n📁 Project: ${projectRoot}\n\n${symbolsText}💡 *Search across all files in the project workspace*`
      }]
    };

  } catch (error) {
    logger.error('WorkspaceSymbols tool failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `❌ Workspace symbol search failed: ${errorMessage}`
      }],
      isError: true
    };
  }
}

export const workspaceSymbolsTool: MCPTool = {
  name: 'workspaceSymbols',
  description: 'Search for symbols (classes, methods, properties) across the entire project workspace',
  inputSchema: WorkspaceSymbolsInputSchema,
  jsonSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for symbols (class names, method names, etc.)'
      },
      maxResults: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Maximum number of results to return',
        default: 50
      }
    },
    required: ['query']
  },
  execute: executeWorkspaceSymbols,
};