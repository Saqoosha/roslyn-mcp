/**
 * Completion tool - Get code completion suggestions using Roslyn LSP
 */

import { z } from 'zod';
import type { MCPTool, ToolContext, MCPResponse } from '../types/index.js';

const CompletionInputSchema = z.object({
  filePath: z.string().describe('Path to the C# file (relative to project root)'),
  line: z.number().min(0).describe('Line number (0-based)'),
  character: z.number().min(0).describe('Character position (0-based)'),
  maxResults: z.number().min(1).max(50).optional().default(20).describe('Maximum number of completion results to return'),
});

type CompletionInput = z.infer<typeof CompletionInputSchema>;

// LSP CompletionItemKind mapping to readable names and icons
const COMPLETION_KIND_NAMES: Record<number, string> = {
  1: 'Text',
  2: 'Method',
  3: 'Function', 
  4: 'Constructor',
  5: 'Field',
  6: 'Variable',
  7: 'Class',
  8: 'Interface',
  9: 'Module',
  10: 'Property',
  11: 'Unit',
  12: 'Value',
  13: 'Enum',
  14: 'Keyword',
  15: 'Snippet',
  16: 'Color',
  17: 'File',
  18: 'Reference',
  19: 'Folder',
  20: 'EnumMember',
  21: 'Constant',
  22: 'Struct',
  23: 'Event',
  24: 'Operator',
  25: 'TypeParameter',
};

const COMPLETION_KIND_ICONS: Record<number, string> = {
  1: '📝', 2: '🔧', 3: '⚡', 4: '🏗️', 5: '🏷️', 6: '📦', 7: '🏛️', 8: '🔗', 9: '📁', 10: '🔑',
  11: '📏', 12: '💎', 13: '📋', 14: '🔤', 15: '✂️', 16: '🎨', 17: '📄', 18: '🔗', 19: '📁', 20: '🏷️',
  21: '💎', 22: '🏗️', 23: '📡', 24: '⚙️', 25: '🧬'
};

function formatCompletion(item: any): string {
  const kind = item.kind || 1;
  const kindName = COMPLETION_KIND_NAMES[kind] || `Kind${kind}`;
  const icon = COMPLETION_KIND_ICONS[kind] || '❓';
  
  let result = `${icon} **${item.label}** _(${kindName})_`;
  
  // Add detail if available (method signature, type info, etc.)
  if (item.detail) {
    result += `\n   💬 ${item.detail}`;
  }
  
  // Add documentation if available
  if (item.documentation) {
    let doc = item.documentation;
    if (typeof doc === 'object' && doc.value) {
      doc = doc.value;
    }
    if (typeof doc === 'string' && doc.trim()) {
      // Truncate long documentation
      const truncated = doc.length > 100 ? doc.substring(0, 100) + '...' : doc;
      result += `\n   📖 ${truncated}`;
    }
  }
  
  // Add insert text if different from label
  if (item.insertText && item.insertText !== item.label) {
    result += `\n   📝 Insert: \`${item.insertText}\``;
  }
  
  return result;
}

async function executeCompletion(input: CompletionInput, context: ToolContext): Promise<MCPResponse> {
  const { filePath, line, character, maxResults } = input;
  const { lspClient, projectRoot, logger } = context;

  logger.debug('Completion tool executed', { filePath, line, character, maxResults });

  try {
    // Check if LSP client is available
    if (!lspClient || !lspClient.isRunning) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ Code completion requires LSP client to be running.\n\n📍 Location: \`${filePath}:${line}:${character}\`\n\n💡 This is expected in test mode or if LSP initialization failed.`
        }]
      };
    }

    // Call LSP completion with automatic document synchronization
    const completionResult = await lspClient.getCompletionWithDocSync(filePath, line, character);

    if (!completionResult) {
      return {
        content: [{
          type: 'text',
          text: `❌ No completion suggestions available at ${filePath}:${line}:${character}\n\n💡 Try placing cursor after a dot (.) or start typing a variable/method name.`
        }]
      };
    }

    // Handle both CompletionList and CompletionItem[] formats
    let items: any[] = [];
    if (Array.isArray(completionResult)) {
      items = completionResult;
    } else if (completionResult.items && Array.isArray(completionResult.items)) {
      items = completionResult.items;
    } else {
      return {
        content: [{
          type: 'text',
          text: `❌ No completion suggestions available at ${filePath}:${line}:${character}`
        }]
      };
    }

    if (items.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `❌ No completion suggestions found at ${filePath}:${line}:${character}\n\n💡 Try:\n• Typing after a dot (.)\n• Starting to type a variable name\n• Typing in a method body`
        }]
      };
    }

    // Limit results and sort by priority
    const limitedItems = items
      .sort((a, b) => {
        // Sort by sortText if available, otherwise by label
        const sortA = a.sortText || a.label || '';
        const sortB = b.sortText || b.label || '';
        return sortA.localeCompare(sortB);
      })
      .slice(0, maxResults);

    // Group by completion kind for better organization
    const groupedItems = new Map<number, any[]>();
    limitedItems.forEach(item => {
      const kind = item.kind || 1;
      if (!groupedItems.has(kind)) {
        groupedItems.set(kind, []);
      }
      groupedItems.get(kind)!.push(item);
    });

    let completionText = `🔢 **Found ${items.length} suggestion${items.length !== 1 ? 's' : ''}** (showing top ${limitedItems.length})\n\n`;

    // Show grouped results
    const sortedGroups = Array.from(groupedItems.entries())
      .sort(([kindA], [kindB]) => {
        // Prioritize common kinds: Class, Method, Property, Field, Variable
        const priority = [7, 2, 10, 5, 6, 4, 8, 13, 20, 21]; // Class, Method, Property, Field, Variable, Constructor, Interface, Enum, EnumMember, Constant
        const indexA = priority.indexOf(kindA);
        const indexB = priority.indexOf(kindB);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return kindA - kindB;
      });

    for (const [kind, groupItems] of sortedGroups) {
      const kindName = COMPLETION_KIND_NAMES[kind] || `Kind${kind}`;
      const icon = COMPLETION_KIND_ICONS[kind] || '❓';
      
      if (groupItems.length > 0) {
        completionText += `${icon} **${kindName}** (${groupItems.length})\n`;
        groupItems.slice(0, 5).forEach(item => { // Show max 5 per group
          completionText += `   • ${item.label}`;
          if (item.detail) {
            completionText += ` - ${item.detail}`;
          }
          completionText += '\n';
        });
        if (groupItems.length > 5) {
          completionText += `   ... and ${groupItems.length - 5} more\n`;
        }
        completionText += '\n';
      }
    }

    return {
      content: [{
        type: 'text',
        text: `💡 **Code Completion**\n\n📍 Position: \`${filePath}:${line}:${character}\`\n\n${completionText}💡 *Use these suggestions to auto-complete your code*`
      }]
    };

  } catch (error) {
    logger.error('Completion tool failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `❌ Code completion failed: ${errorMessage}`
      }],
      isError: true
    };
  }
}

export const completionTool: MCPTool = {
  name: 'completion',
  description: 'Get code completion suggestions (IntelliSense) for C# code',
  inputSchema: CompletionInputSchema,
  jsonSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the C# file (relative to project root)'
      },
      line: {
        type: 'number',
        minimum: 0,
        description: 'Line number (0-based)'
      },
      character: {
        type: 'number',
        minimum: 0,
        description: 'Character position (0-based)'
      },
      maxResults: {
        type: 'number',
        minimum: 1,
        maximum: 50,
        description: 'Maximum number of completion results to return',
        default: 20
      }
    },
    required: ['filePath', 'line', 'character']
  },
  execute: executeCompletion,
};