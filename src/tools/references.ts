/**
 * References tool - Find all references to symbols using Roslyn LSP
 */

import { z } from 'zod';
import type { MCPTool, ToolContext, MCPResponse } from '../types/index.js';

const ReferencesInputSchema = z.object({
  filePath: z.string().describe('Path to the C# file (relative to project root)'),
  line: z.number().min(0).describe('Line number (0-based)'),
  character: z.number().min(0).describe('Character position (0-based)'),
  includeDeclaration: z.boolean().optional().default(true).describe('Include symbol declaration in results'),
});

type ReferencesInput = z.infer<typeof ReferencesInputSchema>;

async function executeReferences(input: ReferencesInput, context: ToolContext): Promise<MCPResponse> {
  const { filePath, line, character, includeDeclaration } = input;
  const { lspClient, projectRoot, logger } = context;

  logger.debug('References tool executed', { filePath, line, character, includeDeclaration });

  try {
    // Check if LSP client is available
    if (!lspClient || !lspClient.isRunning) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ References functionality requires LSP client to be running.\n\n📍 Location: \`${filePath}:${line}:${character}\`\n\n💡 This is expected in test mode or if LSP initialization failed.`
        }]
      };
    }

    // Call LSP references with automatic document synchronization
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

    // Call LSP references
    const referencesResult = await lspClient.getReferences(uri, line, character, includeDeclaration);

    if (!referencesResult || (Array.isArray(referencesResult) && referencesResult.length === 0)) {
      return {
        content: [{
          type: 'text',
          text: `❌ No references found at ${filePath}:${line}:${character}`
        }]
      };
    }

    // Format references results
    const references = Array.isArray(referencesResult) ? referencesResult : [referencesResult];
    
    let referencesText = `📊 **Found ${references.length} reference${references.length !== 1 ? 's' : ''}**\n\n`;
    
    // Group references by file
    const referencesByFile = new Map<string, any[]>();
    
    references.forEach(ref => {
      const refUri = ref.uri;
      if (refUri) {
        const relativePath = refUri.replace(`file://${projectRoot}/`, '');
        if (!referencesByFile.has(relativePath)) {
          referencesByFile.set(relativePath, []);
        }
        referencesByFile.get(relativePath)!.push(ref);
      }
    });

    // Format grouped references
    for (const [filePath, fileRefs] of referencesByFile) {
      referencesText += `📁 **${filePath}** (${fileRefs.length} reference${fileRefs.length !== 1 ? 's' : ''})\n`;
      
      fileRefs
        .sort((a, b) => a.range.start.line - b.range.start.line)
        .forEach((ref, index) => {
          const range = ref.range;
          referencesText += `   ${index + 1}. Line ${range.start.line + 1}:${range.start.character + 1}`;
          if (range.start.line !== range.end.line || range.start.character !== range.end.character) {
            referencesText += ` → ${range.end.line + 1}:${range.end.character + 1}`;
          }
          referencesText += '\n';
        });
      
      referencesText += '\n';
    }

    const declarationNote = includeDeclaration 
      ? '💡 *Results include symbol declaration*' 
      : '💡 *Declaration excluded from results*';

    return {
      content: [{
        type: 'text',
        text: `🔍 **Find All References**\n\n📍 Symbol at: \`${filePath}:${line}:${character}\`\n\n${referencesText}${declarationNote}`
      }]
    };

  } catch (error) {
    logger.error('References tool failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `❌ References lookup failed: ${errorMessage}`
      }],
      isError: true
    };
  }
}

export const referencesTool: MCPTool = {
  name: 'references',
  description: 'Find all references to symbols in C# code',
  inputSchema: ReferencesInputSchema,
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
      includeDeclaration: {
        type: 'boolean',
        description: 'Include symbol declaration in results',
        default: true
      }
    },
    required: ['filePath', 'line', 'character']
  },
  execute: executeReferences,
};