/**
 * Diagnostics tool - Get errors, warnings, and suggestions for C# files using Roslyn LSP
 */

import { z } from 'zod';
import type { MCPTool, ToolContext, MCPResponse } from '../types/index.js';

const DiagnosticsInputSchema = z.object({
  filePath: z.string().describe('Path to the C# file (relative to project root)'),
  includeSuggestions: z.boolean().optional().default(true).describe('Include suggestion-level diagnostics'),
});

type DiagnosticsInput = z.infer<typeof DiagnosticsInputSchema>;

// LSP DiagnosticSeverity mapping to readable names and icons
const DIAGNOSTIC_SEVERITY_NAMES: Record<number, string> = {
  1: 'Error',
  2: 'Warning', 
  3: 'Information',
  4: 'Hint',
};

const DIAGNOSTIC_SEVERITY_ICONS: Record<number, string> = {
  1: '❌', // Error
  2: '⚠️',  // Warning
  3: 'ℹ️',  // Information
  4: '💡', // Hint/Suggestion
};

function formatDiagnostic(diagnostic: any, index: number): string {
  const severity = diagnostic.severity || 1;
  const severityName = DIAGNOSTIC_SEVERITY_NAMES[severity] || `Severity${severity}`;
  const icon = DIAGNOSTIC_SEVERITY_ICONS[severity] || '❓';
  
  const range = diagnostic.range;
  const line = range?.start?.line !== undefined ? range.start.line + 1 : '?';
  const character = range?.start?.character !== undefined ? range.start.character + 1 : '?';
  
  let result = `${icon} **${severityName}** at line ${line}:${character}`;
  
  // Add diagnostic message
  if (diagnostic.message) {
    result += `\n   📝 ${diagnostic.message}`;
  }
  
  // Add diagnostic code if available
  if (diagnostic.code) {
    result += `\n   🔢 Code: ${diagnostic.code}`;
  }
  
  // Add source if available (e.g., "csharp", "roslyn")
  if (diagnostic.source) {
    result += `\n   📚 Source: ${diagnostic.source}`;
  }
  
  // Add related information if available
  if (diagnostic.relatedInformation && diagnostic.relatedInformation.length > 0) {
    result += `\n   🔗 Related: ${diagnostic.relatedInformation.length} location${diagnostic.relatedInformation.length !== 1 ? 's' : ''}`;
  }
  
  return result;
}

async function executeDiagnostics(input: DiagnosticsInput, context: ToolContext): Promise<MCPResponse> {
  const { filePath, includeSuggestions } = input;
  const { lspClient, projectRoot, logger } = context;

  logger.debug('Diagnostics tool executed', { filePath, includeSuggestions });

  try {
    // Check if LSP client is available
    if (!lspClient || !lspClient.isRunning) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ Diagnostics require LSP client to be running.\n\n📍 File: \`${filePath}\`\n\n💡 This is expected in test mode or if LSP initialization failed.`
        }]
      };
    }

    // Call LSP diagnostics with automatic document synchronization
    const diagnosticsResult = await lspClient.getDiagnosticsWithDocSync(filePath);

    if (!diagnosticsResult) {
      return {
        content: [{
          type: 'text',
          text: `❌ No diagnostics available for ${filePath}\n\n💡 This could mean:\n• The file has no errors or warnings\n• LSP server is still analyzing the file\n• The file is not part of the project`
        }]
      };
    }

    // Handle both direct array and response with items property
    let diagnostics: any[] = [];
    if (Array.isArray(diagnosticsResult)) {
      diagnostics = diagnosticsResult;
    } else if (diagnosticsResult.items && Array.isArray(diagnosticsResult.items)) {
      diagnostics = diagnosticsResult.items;
    } else if (diagnosticsResult.diagnostics && Array.isArray(diagnosticsResult.diagnostics)) {
      diagnostics = diagnosticsResult.diagnostics;
    }

    // Filter by severity if requested
    if (!includeSuggestions) {
      diagnostics = diagnostics.filter(d => (d.severity || 1) <= 2); // Only errors and warnings
    }

    if (diagnostics.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `✅ No ${includeSuggestions ? 'diagnostics' : 'errors or warnings'} found in ${filePath}\n\n🎉 The file appears to be error-free!`
        }]
      };
    }

    // Group by severity for better organization
    const groupedDiagnostics = new Map<number, any[]>();
    diagnostics.forEach(diagnostic => {
      const severity = diagnostic.severity || 1;
      if (!groupedDiagnostics.has(severity)) {
        groupedDiagnostics.set(severity, []);
      }
      groupedDiagnostics.get(severity)!.push(diagnostic);
    });

    let diagnosticsText = `🔍 **Found ${diagnostics.length} diagnostic${diagnostics.length !== 1 ? 's' : ''}**\n\n`;

    // Show grouped results by severity (errors first, then warnings, etc.)
    const sortedGroups = Array.from(groupedDiagnostics.entries())
      .sort(([severityA], [severityB]) => severityA - severityB); // 1=Error, 2=Warning, 3=Info, 4=Hint

    for (const [severity, groupDiagnostics] of sortedGroups) {
      const severityName = DIAGNOSTIC_SEVERITY_NAMES[severity] || `Severity${severity}`;
      const icon = DIAGNOSTIC_SEVERITY_ICONS[severity] || '❓';
      
      if (groupDiagnostics.length > 0) {
        diagnosticsText += `${icon} **${severityName}${groupDiagnostics.length !== 1 ? 's' : ''}** (${groupDiagnostics.length})\n`;
        
        groupDiagnostics.forEach((diagnostic, index) => {
          const range = diagnostic.range;
          const line = range?.start?.line !== undefined ? range.start.line + 1 : '?';
          const character = range?.start?.character !== undefined ? range.start.character + 1 : '?';
          
          diagnosticsText += `   ${index + 1}. Line ${line}:${character} - ${diagnostic.message}`;
          
          if (diagnostic.code) {
            diagnosticsText += ` (${diagnostic.code})`;
          }
          
          diagnosticsText += '\n';
        });
        diagnosticsText += '\n';
      }
    }

    // Add summary
    const errorCount = groupedDiagnostics.get(1)?.length || 0;
    const warningCount = groupedDiagnostics.get(2)?.length || 0;
    const infoCount = groupedDiagnostics.get(3)?.length || 0;
    const hintCount = groupedDiagnostics.get(4)?.length || 0;

    let summary = '📊 Summary: ';
    const parts = [];
    if (errorCount > 0) parts.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
    if (warningCount > 0) parts.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
    if (infoCount > 0) parts.push(`${infoCount} info`);
    if (hintCount > 0) parts.push(`${hintCount} hint${hintCount !== 1 ? 's' : ''}`);
    
    summary += parts.join(', ');
    diagnosticsText += summary;

    return {
      content: [{
        type: 'text',
        text: `🩺 **Diagnostics Report**\n\n📍 File: \`${filePath}\`\n\n${diagnosticsText}\n\n💡 *Real-time analysis from Roslyn LSP*`
      }]
    };

  } catch (error) {
    logger.error('Diagnostics tool failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `❌ Diagnostics failed: ${errorMessage}`
      }],
      isError: true
    };
  }
}

export const diagnosticsTool: MCPTool = {
  name: 'diagnostics',
  description: 'Get real-time diagnostics (errors, warnings, suggestions) for C# files',
  inputSchema: DiagnosticsInputSchema,
  jsonSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the C# file (relative to project root)'
      },
      includeSuggestions: {
        type: 'boolean',
        description: 'Include suggestion-level diagnostics',
        default: true
      }
    },
    required: ['filePath']
  },
  execute: executeDiagnostics,
};