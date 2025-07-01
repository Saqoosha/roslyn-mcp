/**
 * Hover tool - Get hover information for symbols using Roslyn LSP
 */

import { z } from 'zod';
import { resolve } from 'path';
import type { MCPTool, ToolContext, MCPResponse } from '../types/index.js';

const HoverInputSchema = z.object({
  filePath: z.string().describe('Path to the C# file (relative to project root)'),
  line: z.number().min(0).describe('Line number (0-based)'),
  character: z.number().min(0).describe('Character position (0-based)'),
});

type HoverInput = z.infer<typeof HoverInputSchema>;

async function executeHover(input: HoverInput, context: ToolContext): Promise<MCPResponse> {
  const { filePath, line, character } = input;
  const { lspClient, projectRoot, logger } = context;

  logger.debug('Hover tool executed', { filePath, line, character });

  try {
    // Check if LSP client is available
    if (!lspClient || !lspClient.isRunning) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ Hover functionality requires LSP client to be running.\n\n📍 Location: \`${filePath}:${line}:${character}\`\n\n💡 This is expected in test mode or if LSP initialization failed.`
        }]
      };
    }

    // Resolve file path
    const absolutePath = resolve(projectRoot, filePath);
    const fileUri = `file://${absolutePath}`;

    // Call LSP hover
    const hoverResult = await lspClient.getHover(fileUri, line, character);

    if (!hoverResult || !hoverResult.contents) {
      return {
        content: [{
          type: 'text',
          text: `❌ No hover information available at ${filePath}:${line}:${character}`
        }]
      };
    }

    // Format hover contents
    let hoverText = '';
    if (Array.isArray(hoverResult.contents)) {
      hoverText = hoverResult.contents
        .map((content: any) => {
          if (typeof content === 'string') {
            return content;
          } else if (content.language && content.value) {
            return `\`\`\`${content.language}\n${content.value}\n\`\`\``;
          } else if (content.value) {
            return content.value;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n\n');
    } else if (typeof hoverResult.contents === 'string') {
      hoverText = hoverResult.contents;
    } else if (hoverResult.contents.value) {
      hoverText = hoverResult.contents.value;
    }

    if (!hoverText.trim()) {
      return {
        content: [{
          type: 'text',
          text: `❌ No hover information available at ${filePath}:${line}:${character}`
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: `🔍 **Hover Information**\n\n📍 Location: \`${filePath}:${line}:${character}\`\n\n${hoverText}`
      }]
    };

  } catch (error) {
    logger.error('Hover tool failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `❌ Hover failed: ${errorMessage}`
      }],
      isError: true
    };
  }
}

export const hoverTool: MCPTool = {
  name: 'hover',
  description: 'Get hover information (type signatures, documentation) for symbols in C# code',
  inputSchema: HoverInputSchema,
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
      }
    },
    required: ['filePath', 'line', 'character']
  },
  execute: executeHover,
};