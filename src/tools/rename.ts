/**
 * Rename tool - Rename symbols across the codebase using Roslyn LSP
 */

import { z } from 'zod';
import { resolve } from 'path';
import type { MCPTool, ToolContext, MCPResponse } from '../types/index.js';

const RenameInputSchema = z.object({
  filePath: z.string().describe('Path to the C# file (relative to project root)'),
  line: z.number().min(0).describe('Line number (0-based)'),
  character: z.number().min(0).describe('Character position (0-based)'),
  newName: z.string().min(1).describe('New name for the symbol'),
});

type RenameInput = z.infer<typeof RenameInputSchema>;

async function executeRename(input: RenameInput, context: ToolContext): Promise<MCPResponse> {
  const { filePath, line, character, newName } = input;
  const { lspClient, projectRoot, logger } = context;

  logger.debug('Rename tool executed', { filePath, line, character, newName });

  try {
    // Check if LSP client is available
    if (!lspClient || !lspClient.isRunning) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ Rename functionality requires LSP client to be running.\n\n📍 Location: \`${filePath}:${line}:${character}\`\n🏷️ New name: \`${newName}\`\n\n💡 This is expected in test mode or if LSP initialization failed.`
        }]
      };
    }

    // Validate new name
    if (!newName.trim()) {
      return {
        content: [{
          type: 'text',
          text: `❌ Invalid new name: "${newName}"\n\n📍 Location: \`${filePath}:${line}:${character}\`\n\n💡 The new name cannot be empty or contain only whitespace.`
        }]
      };
    }

    // Call LSP rename with automatic document synchronization
    const renameResult = await lspClient.getRenameWithDocSync(filePath, line, character, newName);

    // Check for errors from LSP client
    if (renameResult && renameResult.error) {
      const errorDetails = renameResult.error.details ? `\n\n🔧 **Debug details:**\n${JSON.stringify(renameResult.error.details, null, 2)}` : '';
      
      return {
        content: [{
          type: 'text',
          text: `❌ Rename failed: ${renameResult.error.message}\n\n📍 Location: ${filePath}:${line}:${character}\n🏷️ Target name: ${newName}${errorDetails}\n\n🔍 **Common causes:**\n• Symbol is not renameable (built-in types, external libraries)\n• Position doesn't contain a valid symbol\n• Symbol is read-only or from external assembly\n• LSP server doesn't support renaming for this symbol type\n\n💡 Try positioning the cursor directly on a user-defined symbol (variable, method, class, etc.).`
        }]
      };
    }

    // Handle both LSP result formats: 'changes' (older) and 'documentChanges' (newer)
    const changes = renameResult.changes;
    const documentChanges = renameResult.documentChanges;
    
    if (!renameResult || (!changes && !documentChanges)) {
      return {
        content: [{
          type: 'text',
          text: `❌ No rename edits available at ${filePath}:${line}:${character}\n\n🔍 **Possible reasons:**\n• Symbol is not renameable (e.g., built-in types)\n• Position doesn't contain a valid symbol\n• Symbol is read-only or external\n• LSP server doesn't support renaming for this symbol type\n\n💡 Try positioning the cursor directly on a variable, method, class, or other user-defined symbol.`
        }]
      };
    }

    let fileCount = 0;
    let totalEdits = 0;
    let formattedResults = '';

    // Handle new 'documentChanges' format (preferred by newer LSP servers)
    if (documentChanges && Array.isArray(documentChanges)) {
      fileCount = documentChanges.length;
      
      for (const docChange of documentChanges) {
        const uri = docChange.textDocument?.uri || '';
        const edits = docChange.edits || [];
        const editCount = edits.length;
        totalEdits += editCount;
        
        // Convert file URI back to relative path
        const relativeFilePath = uri.replace('file://', '').replace(projectRoot, '').replace(/^\//, '');
        formattedResults += `\n📄 **${relativeFilePath}**: ${editCount} edit${editCount !== 1 ? 's' : ''}\n`;
        
        edits.forEach((edit: any, index: number) => {
          const startLine = edit.range?.start?.line ?? 0;
          const startChar = edit.range?.start?.character ?? 0;
          const endLine = edit.range?.end?.line ?? startLine;
          const endChar = edit.range?.end?.character ?? startChar;
          
          formattedResults += `   ${index + 1}. Line ${startLine + 1}:${startChar + 1}`;
          if (endLine !== startLine || endChar !== startChar) {
            formattedResults += ` to ${endLine + 1}:${endChar + 1}`;
          }
          formattedResults += ` → "${edit.newText}"\n`;
        });
      }
    }
    // Handle older 'changes' format (map of URI to edits)
    else if (changes) {
      fileCount = Object.keys(changes).length;
      
      for (const [uri, edits] of Object.entries(changes)) {
        // Convert file URI back to relative path
        const relativeFilePath = uri.replace('file://', '').replace(projectRoot, '').replace(/^\//, '');
        const editCount = Array.isArray(edits) ? edits.length : 0;
        totalEdits += editCount;

        formattedResults += `\n📄 **${relativeFilePath}**: ${editCount} edit${editCount !== 1 ? 's' : ''}\n`;
        
        if (Array.isArray(edits)) {
          edits.forEach((edit: any, index: number) => {
            const startLine = edit.range?.start?.line ?? 0;
            const startChar = edit.range?.start?.character ?? 0;
            const endLine = edit.range?.end?.line ?? startLine;
            const endChar = edit.range?.end?.character ?? startChar;
            
            formattedResults += `   ${index + 1}. Line ${startLine + 1}:${startChar + 1}`;
            if (endLine !== startLine || endChar !== startChar) {
              formattedResults += ` to ${endLine + 1}:${endChar + 1}`;
            }
            formattedResults += ` → "${edit.newText}"\n`;
          });
        }
      }
    }

    return {
      content: [{
        type: 'text',
        text: `🔄 **Rename Operation Results**\n\n📍 Original location: \`${filePath}:${line + 1}:${character + 1}\`\n🏷️ New name: \`${newName}\`\n\n📊 **Summary:**\n• Files affected: ${fileCount}\n• Total edits: ${totalEdits}\n\n📝 **Changes:**${formattedResults}\n\n✨ **Next steps:**\n• Review the changes carefully\n• Apply the edits to complete the rename\n• Test your code to ensure the rename worked correctly`
      }]
    };

  } catch (error) {
    logger.error('Rename tool failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `❌ Rename failed: ${errorMessage}\n\n📍 Location: \`${filePath}:${line}:${character}\`\n🏷️ Target name: \`${newName}\``
      }],
      isError: true
    };
  }
}

export const renameTool: MCPTool = {
  name: 'rename',
  description: 'Rename symbols (variables, methods, classes, etc.) across the entire codebase',
  inputSchema: RenameInputSchema,
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
      newName: {
        type: 'string',
        minLength: 1,
        description: 'New name for the symbol'
      }
    },
    required: ['filePath', 'line', 'character', 'newName']
  },
  execute: executeRename,
};