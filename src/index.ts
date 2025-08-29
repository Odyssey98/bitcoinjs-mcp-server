#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool handlers
import { addressTools } from './tools/address.js';
import { transactionTools } from './tools/transaction.js';
import { psbtTools } from './tools/psbt.js';
import { utilityTools } from './tools/utility.js';

class BitcoinMCPServer {
  private server: Server;
  private tools: Map<string, Tool>;

  constructor() {
    this.server = new Server(
      {
        name: 'bitcoinjs-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tools = new Map();
    this.setupTools();
    this.setupHandlers();
  }

  private setupTools() {
    // Collect all tools from different modules
    const allTools = [
      ...addressTools,
      ...transactionTools,
      ...psbtTools,
      ...utilityTools,
    ];

    for (const tool of allTools) {
      this.tools.set(tool.name, tool);
    }
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);

      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        // Find the appropriate handler
        let result;
        
        if (addressTools.find(t => t.name === name)) {
          const { handleAddressTool } = await import('./tools/address.js');
          result = await handleAddressTool(name, args || {});
        } else if (transactionTools.find(t => t.name === name)) {
          const { handleTransactionTool } = await import('./tools/transaction.js');
          result = await handleTransactionTool(name, args || {});
        } else if (psbtTools.find(t => t.name === name)) {
          const { handlePSBTTool } = await import('./tools/psbt.js');
          result = await handlePSBTTool(name, args || {});
        } else if (utilityTools.find(t => t.name === name)) {
          const { handleUtilityTool } = await import('./tools/utility.js');
          result = await handleUtilityTool(name, args || {});
        } else {
          throw new Error(`No handler found for tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: errorMessage }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('BitcoinJS MCP Server started successfully');
  }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new BitcoinMCPServer();
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}