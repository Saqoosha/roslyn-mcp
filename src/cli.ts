/**
 * CLI entry point for roslyn-mcp
 */

import { RoslynMCPServer } from './server.js';
import { FastStartRoslynMCPServer } from './server-fast-start.js';
import type { ServerConfig } from './types/index.js';

interface CLIArgs {
  project?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  timeout?: number;
  testMode?: boolean;
  fastStart?: boolean;
  help?: boolean;
  version?: boolean;
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    switch (arg) {
      case '--project':
      case '-p':
        args.project = argv[++i];
        break;
        
      case '--log-level':
      case '-l':
        args.logLevel = argv[++i] as any;
        break;
        
      case '--timeout':
      case '-t':
        args.timeout = parseInt(argv[++i], 10);
        break;

      case '--test-mode':
        args.testMode = true;
        break;

      case '--fast-start':
      case '-f':
        args.fastStart = true;
        break;
        
      case '--help':
      case '-h':
        args.help = true;
        break;
        
      case '--version':
      case '-v':
        args.version = true;
        break;
        
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        // Assume it's a project path
        if (!args.project) {
          args.project = arg;
        }
        break;
    }
  }

  return args;
}

function showHelp(): void {
  console.log(`
🚀 roslyn-mcp - Comprehensive Roslyn LSP to MCP Bridge

USAGE:
  roslyn-mcp [OPTIONS] [PROJECT_PATH]

OPTIONS:
  --project, -p <path>     Path to C# project or solution file
  --log-level, -l <level>  Log level: debug, info, warn, error (default: info)
  --timeout, -t <ms>       LSP request timeout in milliseconds (default: 30000)
  --test-mode              Enable test mode (skip LSP client initialization)
  --fast-start, -f         Enable fast-start mode (respond immediately, init in background)
  --help, -h               Show this help message
  --version, -v            Show version information

EXAMPLES:
  roslyn-mcp ./MyProject.sln
  roslyn-mcp --project ./src --log-level debug
  roslyn-mcp -p ./MyApp.csproj -l warn -t 60000
  roslyn-mcp --fast-start ./LargeUnityProject  # For large projects

For more information, visit: https://github.com/roslyn-mcp/roslyn-mcp
`);
}

function showVersion(): void {
  // Get version from package.json
  console.log('roslyn-mcp version 0.1.0');
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.version) {
    showVersion();
    process.exit(0);
  }

  // Determine project root - prioritize CLI arg, then env var, then current directory
  const projectRoot = args.project || process.env.PROJECT_ROOT || process.cwd();

  // Validate project root
  try {
    const fs = await import('fs');
    if (!fs.existsSync(projectRoot)) {
      console.error(`❌ Project path does not exist: ${projectRoot}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Failed to access project path: ${projectRoot}`);
    process.exit(1);
  }

  // Create server config
  const config: ServerConfig = {
    projectRoot,
    logLevel: args.logLevel || 'info',
    timeout: args.timeout || 30000,
    maxRestartAttempts: 3,
    testMode: args.testMode || false,
  };

  // Create and start server (use fast-start mode for large projects)
  const server = args.fastStart 
    ? new FastStartRoslynMCPServer(config)
    : new RoslynMCPServer(config);

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    // Don't use console.log after server starts - it breaks stdio communication!
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle unhandled errors
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
  });

  try {
    // Don't use console.log after server starts - it breaks stdio communication!
    await server.start();
    // Server is now running and communicating via stdio
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});