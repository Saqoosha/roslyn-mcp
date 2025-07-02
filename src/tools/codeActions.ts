/**
 * CodeActions tool - Get code actions and quick fixes using Roslyn LSP
 */

import { z } from 'zod';
import type { MCPTool, ToolContext, MCPResponse } from '../types/index.js';

const CodeActionsInputSchema = z.object({
  filePath: z.string().describe('Path to the C# file (relative to project root)'),
  line: z.number().min(0).describe('Line number (0-based)'),
  character: z.number().min(0).describe('Character position (0-based)'),
  endLine: z.number().min(0).optional().describe('End line number for selection range (0-based)'),
  endCharacter: z.number().min(0).optional().describe('End character for selection range (0-based)'),
  diagnostics: z.array(z.any()).optional().describe('Diagnostics to include in context'),
});

type CodeActionsInput = z.infer<typeof CodeActionsInputSchema>;

// LSP CodeActionKind mapping to readable names and icons
const CODE_ACTION_KIND_NAMES: Record<string, string> = {
  '': 'Generic',
  'quickfix': 'Quick Fix',
  'refactor': 'Refactor',
  'refactor.extract': 'Extract',
  'refactor.inline': 'Inline',
  'refactor.rewrite': 'Rewrite',
  'source': 'Source Action',
  'source.organizeImports': 'Organize Imports',
  'source.fixAll': 'Fix All',
};

const CODE_ACTION_KIND_ICONS: Record<string, string> = {
  '': '🔧',
  'quickfix': '🩹',
  'refactor': '♻️',
  'refactor.extract': '📤',
  'refactor.inline': '📥',
  'refactor.rewrite': '✍️',
  'source': '⚙️',
  'source.organizeImports': '📋',
  'source.fixAll': '🔧',
};

function getActionIcon(kind: string): string {
  // Try exact match first
  if (CODE_ACTION_KIND_ICONS[kind]) {
    return CODE_ACTION_KIND_ICONS[kind];
  }
  
  // Try prefix match
  for (const [prefix, icon] of Object.entries(CODE_ACTION_KIND_ICONS)) {
    if (kind.startsWith(prefix)) {
      return icon;
    }
  }
  
  return '🔧';
}

function getActionName(kind: string): string {
  // Try exact match first
  if (CODE_ACTION_KIND_NAMES[kind]) {
    return CODE_ACTION_KIND_NAMES[kind];
  }
  
  // Try prefix match
  for (const [prefix, name] of Object.entries(CODE_ACTION_KIND_NAMES)) {
    if (kind.startsWith(prefix)) {
      return name;
    }
  }
  
  return 'Code Action';
}

function formatCodeAction(action: any, index: number): string {
  const kind = action.kind || '';
  const icon = getActionIcon(kind);
  const kindName = getActionName(kind);
  
  let result = `${icon} **${action.title}** _(${kindName})_`;
  
  // Add diagnostics info if this action fixes specific issues
  if (action.diagnostics && action.diagnostics.length > 0) {
    const diagnosticCount = action.diagnostics.length;
    result += `\n   🩺 Fixes ${diagnosticCount} diagnostic${diagnosticCount !== 1 ? 's' : ''}`;
  }
  
  // Add edit preview if available and not too complex
  if (action.edit && action.edit.changes) {
    const fileCount = Object.keys(action.edit.changes).length;
    if (fileCount > 0) {
      result += `\n   📝 Modifies ${fileCount} file${fileCount !== 1 ? 's' : ''}`;
    }
  }
  
  // Add command info if this is a command action
  if (action.command) {
    result += `\n   ⚡ Command: ${action.command.title || action.command.command}`;
  }
  
  return result;
}

async function executeCodeActions(input: CodeActionsInput, context: ToolContext): Promise<MCPResponse> {
  const { filePath, line, character, endLine, endCharacter, diagnostics } = input;
  const { lspClient, projectRoot, logger } = context;

  logger.debug('CodeActions tool executed', { filePath, line, character, endLine, endCharacter });

  try {
    // Check if LSP client is available
    if (!lspClient || !lspClient.isRunning) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ Code actions require LSP client to be running.\n\n📍 Location: \`${filePath}:${line}:${character}\`\n\n💡 This is expected in test mode or if LSP initialization failed.`
        }]
      };
    }

    // Call LSP code actions with automatic document synchronization
    const codeActionsResult = await lspClient.getCodeActionsWithDocSync(
      filePath, 
      line, 
      character, 
      endLine || line, 
      endCharacter || character,
      diagnostics
    );

    if (!codeActionsResult || (Array.isArray(codeActionsResult) && codeActionsResult.length === 0)) {
      return {
        content: [{
          type: 'text',
          text: `❌ No code actions available at ${filePath}:${line}:${character}\n\n💡 Try:\n• Positioning cursor on an error or warning\n• Selecting a code block to refactor\n• Right-clicking on a symbol for refactoring options`
        }]
      };
    }

    // Handle the result (should be an array of CodeAction or Command objects)
    const actions = Array.isArray(codeActionsResult) ? codeActionsResult : [codeActionsResult];

    if (actions.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `❌ No code actions found at ${filePath}:${line}:${character}\n\n💡 Code actions are available for:\n• Error and warning fixes\n• Refactoring operations\n• Code generation\n• Import organization`
        }]
      };
    }

    // Group actions by kind for better organization
    const groupedActions = new Map<string, any[]>();
    actions.forEach(action => {
      const kind = action.kind || '';
      const baseKind = kind.split('.')[0] || 'other';
      
      if (!groupedActions.has(baseKind)) {
        groupedActions.set(baseKind, []);
      }
      groupedActions.get(baseKind)!.push(action);
    });

    let actionsText = `🔧 **Found ${actions.length} code action${actions.length !== 1 ? 's' : ''}**\n\n`;

    // Show grouped results
    const sortedGroups = Array.from(groupedActions.entries())
      .sort(([kindA], [kindB]) => {
        // Prioritize quickfix, then refactor, then source actions
        const priority = ['quickfix', 'refactor', 'source', 'other'];
        const indexA = priority.indexOf(kindA);
        const indexB = priority.indexOf(kindB);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return kindA.localeCompare(kindB);
      });

    for (const [baseKind, groupActions] of sortedGroups) {
      const icon = getActionIcon(baseKind);
      const kindName = getActionName(baseKind);
      
      if (groupActions.length > 0) {
        actionsText += `${icon} **${kindName}** (${groupActions.length})\n`;
        groupActions.forEach((action, index) => {
          actionsText += `   ${index + 1}. ${action.title}`;
          
          if (action.diagnostics && action.diagnostics.length > 0) {
            actionsText += ` _(fixes ${action.diagnostics.length} issue${action.diagnostics.length !== 1 ? 's' : ''})_`;
          }
          
          actionsText += '\n';
        });
        actionsText += '\n';
      }
    }

    // Add usage note
    actionsText += '💡 *These actions can be applied to fix issues or refactor code*';

    return {
      content: [{
        type: 'text',
        text: `🔧 **Code Actions & Quick Fixes**\n\n📍 Position: \`${filePath}:${line}:${character}\`${endLine !== undefined ? ` to ${endLine}:${endCharacter}` : ''}\n\n${actionsText}`
      }]
    };

  } catch (error) {
    logger.error('CodeActions tool failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `❌ Code actions failed: ${errorMessage}`
      }],
      isError: true
    };
  }
}

export const codeActionsTool: MCPTool = {
  name: 'codeActions',
  description: 'Get code actions and quick fixes for C# code issues and refactoring',
  inputSchema: CodeActionsInputSchema,
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
      endLine: {
        type: 'number',
        minimum: 0,
        description: 'End line number for selection range (0-based)'
      },
      endCharacter: {
        type: 'number',
        minimum: 0,
        description: 'End character for selection range (0-based)'
      },
      diagnostics: {
        type: 'array',
        description: 'Diagnostics to include in context',
        items: { type: 'object' }
      }
    },
    required: ['filePath', 'line', 'character']
  },
  execute: executeCodeActions,
};