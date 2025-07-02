/**
 * Definitions tool - Get symbol definitions using Roslyn LSP
 */

import { z } from 'zod';
import type { MCPTool, ToolContext, MCPResponse } from '../types/index.js';

const DefinitionsInputSchema = z.object({
  filePath: z.string().describe('Path to the C# file (relative to project root)'),
  line: z.number().min(0).describe('Line number (0-based)'),
  character: z.number().min(0).describe('Character position (0-based)'),
});

type DefinitionsInput = z.infer<typeof DefinitionsInputSchema>;

async function executeDefinitions(input: DefinitionsInput, context: ToolContext): Promise<MCPResponse> {
  const { filePath, line, character } = input;
  const { lspClient, projectRoot, logger } = context;

  logger.debug('Definitions tool executed', { filePath, line, character });

  try {
    // Check if LSP client is available
    if (!lspClient || !lspClient.isRunning) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ Definitions functionality requires LSP client to be running.\n\n📍 Location: \`${filePath}:${line}:${character}\`\n\n💡 This is expected in test mode or if LSP initialization failed.`
        }]
      };
    }

    // Call LSP definitions with automatic document synchronization
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

    // Call LSP definitions
    const definitionsResult = await lspClient.getDefinition(uri, line, character);

    if (!definitionsResult || (Array.isArray(definitionsResult) && definitionsResult.length === 0)) {
      return {
        content: [{
          type: 'text',
          text: `❌ No definitions found at ${filePath}:${line}:${character}`
        }]
      };
    }

    // Format definitions results
    let definitionsText = '';
    const definitions = Array.isArray(definitionsResult) ? definitionsResult : [definitionsResult];
    
    if (definitions.length === 1) {
      const def = definitions[0];
      const defUri = def.uri || def.targetUri;
      const range = def.range || def.targetRange || def.targetSelectionRange;
      
      if (defUri && range) {
        const relativePath = defUri.replace(`file://${projectRoot}/`, '');
        definitionsText = `📍 **Definition Location**\n\n\`${relativePath}:${range.start.line}:${range.start.character}\``;
        
        // Add line preview if available
        if (def.originSelectionRange || range) {
          definitionsText += `\n\n**Range**: Line ${range.start.line}-${range.end.line}, Characters ${range.start.character}-${range.end.character}`;
        }
      }
    } else {
      definitionsText = `📍 **Multiple Definitions Found (${definitions.length})**\n\n`;
      definitions.forEach((def, index) => {
        const defUri = def.uri || def.targetUri;
        const range = def.range || def.targetRange || def.targetSelectionRange;
        
        if (defUri && range) {
          const relativePath = defUri.replace(`file://${projectRoot}/`, '');
          definitionsText += `${index + 1}. \`${relativePath}:${range.start.line}:${range.start.character}\`\n`;
        }
      });
    }

    if (!definitionsText.trim()) {
      return {
        content: [{
          type: 'text',
          text: `❌ No valid definitions found at ${filePath}:${line}:${character}`
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: `🔍 **Go to Definition**\n\n📍 Symbol at: \`${filePath}:${line}:${character}\`\n\n${definitionsText}`
      }]
    };

  } catch (error) {
    logger.error('Definitions tool failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `❌ Definitions lookup failed: ${errorMessage}`
      }],
      isError: true
    };
  }
}

export const definitionsTool: MCPTool = {
  name: 'definitions',
  description: 'Get symbol definitions (Go to Definition) for symbols in C# code',
  inputSchema: DefinitionsInputSchema,
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
  execute: executeDefinitions,
};