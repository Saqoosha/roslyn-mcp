/**
 * Formatting tool - Format C# code using Roslyn LSP
 */

import { z } from 'zod';
import type { MCPTool, ToolContext, MCPResponse } from '../types/index.js';

const FormattingInputSchema = z.object({
  filePath: z.string().describe('Path to the C# file (relative to project root)'),
  tabSize: z.number().min(1).max(8).optional().default(4).describe('Number of spaces per tab'),
  insertSpaces: z.boolean().optional().default(true).describe('Use spaces instead of tabs'),
  trimTrailingWhitespace: z.boolean().optional().default(true).describe('Remove trailing whitespace'),
  insertFinalNewline: z.boolean().optional().default(true).describe('Insert final newline at end of file'),
});

type FormattingInput = z.infer<typeof FormattingInputSchema>;

async function executeFormatting(input: FormattingInput, context: ToolContext): Promise<MCPResponse> {
  const { filePath, tabSize, insertSpaces, trimTrailingWhitespace, insertFinalNewline } = input;
  const { lspClient, projectRoot, logger } = context;

  logger.debug('Formatting tool executed', { filePath, tabSize, insertSpaces, trimTrailingWhitespace, insertFinalNewline });

  try {
    // Check if LSP client is available
    if (!lspClient || !lspClient.isRunning) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ Document formatting requires LSP client to be running.\n\n📍 File: \`${filePath}\`\n\n💡 This is expected in test mode or if LSP initialization failed.`
        }]
      };
    }

    // Call LSP formatting with automatic document synchronization
    const formattingResult = await lspClient.getFormattingWithDocSync(filePath, {
      tabSize,
      insertSpaces,
      trimTrailingWhitespace,
      insertFinalNewline
    });

    if (!formattingResult || (Array.isArray(formattingResult) && formattingResult.length === 0)) {
      return {
        content: [{
          type: 'text',
          text: `✅ No formatting changes needed for ${filePath}\n\n💡 The file is already properly formatted according to C# coding standards.`
        }]
      };
    }

    // Handle the result (should be an array of TextEdit objects)
    const edits = Array.isArray(formattingResult) ? formattingResult : [formattingResult];

    if (edits.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `✅ No formatting changes needed for ${filePath}\n\n🎨 The code is already well-formatted!`
        }]
      };
    }

    // Count different types of changes
    let lineChanges = 0;
    let addedLines = 0;
    let removedLines = 0;
    let modifiedCharacters = 0;

    edits.forEach(edit => {
      if (edit.range && edit.newText !== undefined) {
        const range = edit.range;
        const startLine = range.start?.line || 0;
        const endLine = range.end?.line || 0;
        
        if (startLine !== endLine) {
          lineChanges += (endLine - startLine);
        }
        
        const newLineCount = (edit.newText.match(/\n/g) || []).length;
        const rangeLineCount = endLine - startLine;
        
        if (newLineCount > rangeLineCount) {
          addedLines += (newLineCount - rangeLineCount);
        } else if (newLineCount < rangeLineCount) {
          removedLines += (rangeLineCount - newLineCount);
        }
        
        modifiedCharacters += edit.newText.length;
      }
    });

    let changesText = `🎨 **Formatting applied successfully!**\n\n`;
    changesText += `📊 **Changes Summary:**\n`;
    changesText += `   • ${edits.length} edit${edits.length !== 1 ? 's' : ''} applied\n`;
    
    if (modifiedCharacters > 0) {
      changesText += `   • ~${modifiedCharacters} characters modified\n`;
    }
    if (addedLines > 0) {
      changesText += `   • ${addedLines} line${addedLines !== 1 ? 's' : ''} added\n`;
    }
    if (removedLines > 0) {
      changesText += `   • ${removedLines} line${removedLines !== 1 ? 's' : ''} removed\n`;
    }

    changesText += `\n⚙️ **Formatting Options:**\n`;
    changesText += `   • Tab size: ${tabSize} ${insertSpaces ? 'spaces' : 'tabs'}\n`;
    changesText += `   • Trim trailing whitespace: ${trimTrailingWhitespace ? 'Yes' : 'No'}\n`;
    changesText += `   • Insert final newline: ${insertFinalNewline ? 'Yes' : 'No'}\n`;

    // Show sample of changes (first few edits)
    if (edits.length > 0) {
      changesText += `\n📝 **Sample Changes:**\n`;
      const sampleEdits = edits.slice(0, 3);
      
      sampleEdits.forEach((edit, index) => {
        if (edit.range) {
          const startLine = (edit.range.start?.line || 0) + 1;
          const endLine = (edit.range.end?.line || 0) + 1;
          const startChar = edit.range.start?.character || 0;
          const endChar = edit.range.end?.character || 0;
          
          changesText += `   ${index + 1}. Line ${startLine}:${startChar}`;
          if (startLine !== endLine) {
            changesText += ` to ${endLine}:${endChar}`;
          }
          
          // Show what's being changed (truncated)
          const newText = edit.newText || '';
          const preview = newText.length > 30 ? newText.substring(0, 30) + '...' : newText;
          const displayText = preview.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
          changesText += ` → "${displayText}"\n`;
        }
      });
      
      if (edits.length > 3) {
        changesText += `   ... and ${edits.length - 3} more edit${edits.length - 3 !== 1 ? 's' : ''}\n`;
      }
    }

    return {
      content: [{
        type: 'text',
        text: `🎨 **Document Formatting**\n\n📍 File: \`${filePath}\`\n\n${changesText}\n\n💡 *Formatted according to C# coding standards*`
      }]
    };

  } catch (error) {
    logger.error('Formatting tool failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `❌ Document formatting failed: ${errorMessage}`
      }],
      isError: true
    };
  }
}

export const formattingTool: MCPTool = {
  name: 'formatting',
  description: 'Format C# code according to language conventions and coding standards',
  inputSchema: FormattingInputSchema,
  jsonSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the C# file (relative to project root)'
      },
      tabSize: {
        type: 'number',
        minimum: 1,
        maximum: 8,
        description: 'Number of spaces per tab',
        default: 4
      },
      insertSpaces: {
        type: 'boolean',
        description: 'Use spaces instead of tabs',
        default: true
      },
      trimTrailingWhitespace: {
        type: 'boolean',
        description: 'Remove trailing whitespace',
        default: true
      },
      insertFinalNewline: {
        type: 'boolean',
        description: 'Insert final newline at end of file',
        default: true
      }
    },
    required: ['filePath']
  },
  execute: executeFormatting,
};