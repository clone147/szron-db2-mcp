#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Config } from './config/Config.js';
import { Logger, LogLevel } from './utils/logger.js';
import { GetTablesTool } from './tools/GetTablesTool.js';
import { GetColumnsTool } from './tools/GetColumnsTool.js';
import { RunQueryTool } from './tools/RunQueryTool.js';
import { InsertDataTool } from './tools/InsertDataTool.js';
import { UpdateDataTool } from './tools/UpdateDataTool.js';
import { DeleteDataTool } from './tools/DeleteDataTool.js';
import { CreateTableTool } from './tools/CreateTableTool.js';
import { DropTableTool } from './tools/DropTableTool.js';
import { AlterTableTool } from './tools/AlterTableTool.js';
import { BaseTool } from './tools/BaseTool.js';

class SzronDb2McpServer {
  private server: Server;
  private config: Config;
  private logger: Logger;
  private tools: BaseTool[] = [];

  constructor() {
    this.server = new Server(
      {
        name: 'szron-db2-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.config = new Config();
    this.logger = Logger.getInstance();
  }

  async initialize(configPath: string): Promise<void> {
    try {
      // Load configuration
      await this.config.load(configPath);
      
      // Validate configuration
      const errors = this.config.validate();
      if (errors.length > 0) {
        errors.forEach(error => console.error(error));
        process.exit(1);
      }

      // Configure logging
      const logFile = this.config.getLogFile();
      if (logFile) {
        this.logger.configure(logFile, LogLevel.DEBUG);
        this.logger.info('Logging configured to file: {}', logFile);
      }

      this.logger.info('Szron DB2 MCP Server initialized with prefix: {}', this.config.getPrefix());

      // Initialize tools
      this.tools = [
        new GetTablesTool(this.config),
        new GetColumnsTool(this.config),
        new RunQueryTool(this.config),
        new InsertDataTool(this.config),
        new UpdateDataTool(this.config),
        new DeleteDataTool(this.config),
        new CreateTableTool(this.config),
        new DropTableTool(this.config),
        new AlterTableTool(this.config)
      ];

      // Set up handlers
      this.setupHandlers();

      this.logger.info('Server initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize server:', (error as Error).message);
      process.exit(1);
    }
  }

  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.tools.map(tool => {
        const toolDef = tool.getTool();
        return {
          name: toolDef.name,
          description: toolDef.description,
          inputSchema: toolDef.inputSchema
        };
      });

      this.logger.debug('Returning {} tools', tools.length);
      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      this.logger.info('Tool called: {}', toolName);

      const tool = this.tools.find(t => t.getTool().name === toolName);
      if (!tool) {
        const errorMessage = `Tool not found: ${toolName}`;
        this.logger.error(errorMessage);
        return {
          content: [{ type: 'text', text: `ERROR: ${errorMessage}` }],
          isError: true
        };
      }

      try {
        const result = await tool.getTool().handler(request);
        this.logger.debug('Tool {} completed successfully', toolName);
        return result;
      } catch (error) {
        const errorMessage = (error as Error).message;
        this.logger.error('Tool {} failed: {}', toolName, errorMessage);
        return {
          content: [{ type: 'text', text: `ERROR: ${errorMessage}` }],
          isError: true
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    this.logger.info('Szron DB2 MCP Server running on stdio transport');

    // Handle shutdown gracefully
    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM, shutting down gracefully');
      process.exit(0);
    });
  }
}

async function main(): Promise<void> {
  if (process.argv.length < 3) {
    console.error('Usage: szron-db2-mcp <config-file-path>');
    console.error('');
    console.error('Example: szron-db2-mcp ./db2.prp');
    process.exit(1);
  }

  const configPath = process.argv[2];
  
  const server = new SzronDb2McpServer();
  await server.initialize(configPath);
  await server.run();
}

// Always run main when script is executed
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});