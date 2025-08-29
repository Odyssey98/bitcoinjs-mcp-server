# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Start the MCP server (production)
npm start

# Development with hot reload
npm run dev

# Run all tests
npm test

# Lint TypeScript code
npm run lint

# Format code
npm run format
```

## Project Architecture

This is a **Model Context Protocol (MCP) server** that provides Bitcoin development tools using the bitcoinjs-lib library. It enables Claude Code and other MCP clients to perform Bitcoin operations.

### Core Architecture

- **Main Server**: `src/index.ts` - BitcoinMCPServer class that handles MCP protocol communication
- **Tool Categories**: Each tool category is a separate module in `src/tools/`:
  - `address.ts` - Address generation, validation, and decoding
  - `transaction.ts` - Transaction creation, signing, and analysis  
  - `psbt.ts` - Partially Signed Bitcoin Transaction operations
  - `utility.ts` - Key generation, multisig, script compilation
- **Types**: `src/types/index.ts` - TypeScript interfaces for Bitcoin data structures
- **Utils**: `src/utils/bitcoin.ts` - Common Bitcoin utility functions

### Tool Handler Pattern

Each tool module exports:
- `[category]Tools` array - Tool definitions with JSON schemas
- `handle[Category]Tool()` function - Request router for the category

The main server dynamically imports handlers based on tool name matching.

### Network Support

Supports Bitcoin networks: mainnet, testnet, regtest
- Network configuration in `utils/bitcoin.ts`
- Default network is testnet for safety

### Testing Strategy

- Tests are in `tests/` directory
- Uses Jest with ES modules configuration
- Test individual tool functions and integration scenarios
- Run specific test: `npm test -- --testNamePattern="test_name"`

### MCP Client Configuration

Example configuration for Claude Code in `examples/mcp-settings.json`:
- Requires built JavaScript (`npm run build` first)
- Server communicates via stdio transport
- Tools are automatically discovered by MCP clients