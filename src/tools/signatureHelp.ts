/**
 * SignatureHelp tool - Get method signature and parameter hints using Roslyn LSP
 */

import { z } from 'zod';
import type { MCPTool, ToolContext, MCPResponse } from '../types/index.js';

const SignatureHelpInputSchema = z.object({
  filePath: z.string().describe('Path to the C# file (relative to project root)'),
  line: z.number().min(0).describe('Line number (0-based)'),
  character: z.number().min(0).describe('Character position (0-based)'),
});

type SignatureHelpInput = z.infer<typeof SignatureHelpInputSchema>;

function formatSignature(signature: any, activeParameter: number = 0): string {
  let result = `📝 **${signature.label}**\n`;
  
  // Add documentation if available
  if (signature.documentation) {
    let doc = signature.documentation;
    if (typeof doc === 'object' && doc.value) {
      doc = doc.value;
    }
    if (typeof doc === 'string' && doc.trim()) {
      result += `\n📖 ${doc}\n`;
    }
  }
  
  // Format parameters
  if (signature.parameters && signature.parameters.length > 0) {
    result += '\n**Parameters:**\n';
    signature.parameters.forEach((param: any, index: number) => {
      const isActive = index === activeParameter;
      const marker = isActive ? '👉 ' : '   ';
      const emphasis = isActive ? '**' : '';
      
      result += `${marker}${emphasis}${param.label}${emphasis}`;
      
      if (param.documentation) {
        let paramDoc = param.documentation;
        if (typeof paramDoc === 'object' && paramDoc.value) {
          paramDoc = paramDoc.value;
        }
        if (typeof paramDoc === 'string' && paramDoc.trim()) {
          result += ` - ${paramDoc}`;
        }
      }
      result += '\n';
    });
  }
  
  return result;
}

async function executeSignatureHelp(input: SignatureHelpInput, context: ToolContext): Promise<MCPResponse> {
  const { filePath, line, character } = input;
  const { lspClient, projectRoot, logger } = context;

  logger.debug('SignatureHelp tool executed', { filePath, line, character });

  try {
    // Check if LSP client is available
    if (!lspClient || !lspClient.isRunning) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ Signature help requires LSP client to be running.\n\n📍 Location: \`${filePath}:${line}:${character}\`\n\n💡 This is expected in test mode or if LSP initialization failed.`
        }]
      };
    }

    // Call LSP signature help with automatic document synchronization
    const signatureResult = await lspClient.getSignatureHelpWithDocSync(filePath, line, character);

    if (!signatureResult || !signatureResult.signatures || signatureResult.signatures.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `❌ No signature help available at ${filePath}:${line}:${character}\n\n💡 Try positioning cursor:\n• Inside method parentheses: \`method(|\`\n• Between method parameters: \`method(param1, |\`\n• At method call site: \`obj.method(|\``
        }]
      };
    }

    const signatures = signatureResult.signatures;
    const activeSignature = signatureResult.activeSignature || 0;
    const activeParameter = signatureResult.activeParameter || 0;

    let signatureText = '';

    if (signatures.length === 1) {
      // Single signature
      const signature = signatures[0];
      signatureText = formatSignature(signature, activeParameter);
    } else {
      // Multiple overloads
      signatureText = `🔢 **Found ${signatures.length} overload${signatures.length !== 1 ? 's' : ''}**\n\n`;
      
      signatures.forEach((signature: any, index: number) => {
        const isActive = index === activeSignature;
        const marker = isActive ? '👉 ' : '   ';
        const emphasis = isActive ? '**' : '';
        
        signatureText += `${marker}${emphasis}Overload ${index + 1}:${emphasis} ${signature.label}\n`;
        
        if (isActive && signature.documentation) {
          let doc = signature.documentation;
          if (typeof doc === 'object' && doc.value) {
            doc = doc.value;
          }
          if (typeof doc === 'string' && doc.trim()) {
            signatureText += `   📖 ${doc}\n`;
          }
        }
      });
      
      // Show active signature details
      if (signatures[activeSignature]) {
        signatureText += '\n' + formatSignature(signatures[activeSignature], activeParameter);
      }
    }

    return {
      content: [{
        type: 'text',
        text: `📋 **Method Signature Help**\n\n📍 Position: \`${filePath}:${line}:${character}\`\n\n${signatureText}\n💡 *Parameter help for method calls*`
      }]
    };

  } catch (error) {
    logger.error('SignatureHelp tool failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `❌ Signature help failed: ${errorMessage}`
      }],
      isError: true
    };
  }
}

export const signatureHelpTool: MCPTool = {
  name: 'signatureHelp',
  description: 'Get method signature and parameter hints for C# method calls',
  inputSchema: SignatureHelpInputSchema,
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
  execute: executeSignatureHelp,
};