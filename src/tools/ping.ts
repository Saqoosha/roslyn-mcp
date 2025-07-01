/**
 * Ping tool - Basic connectivity test for MCP server
 */

import { z } from 'zod';
import type { MCPTool, ToolContext, MCPResponse } from '../types/index.js';

const PingInputSchema = z.object({
  message: z.string().optional().default('pong'),
});

type PingInput = z.infer<typeof PingInputSchema>;

async function executePing(input: PingInput, context: ToolContext): Promise<MCPResponse> {
  const { message } = input;
  const { logger } = context;

  logger.debug('Ping tool executed', { message });

  const response = `Ping successful! Server responded with: "${message}"`;
  const timestamp = new Date().toISOString();
  const projectInfo = `Project root: ${context.projectRoot}`;

  return {
    content: [{
      type: 'text',
      text: `🏓 ${response}\n\n⏰ Timestamp: ${timestamp}\n📁 ${projectInfo}\n\n✅ Roslyn MCP Server is running and healthy!`
    }]
  };
}

export const pingTool: MCPTool = {
  name: 'ping',
  description: 'Test connectivity and health of the Roslyn MCP server',
  inputSchema: PingInputSchema,
  jsonSchema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Optional message to echo back',
        default: 'pong'
      }
    }
  },
  execute: executePing,
};