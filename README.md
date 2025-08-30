# BitcoinJS MCP Server

A Model Context Protocol (MCP) server that provides Bitcoin development tools using the bitcoinjs-lib library. This server enables Claude Code and other MCP clients to perform Bitcoin-related operations like address generation, transaction creation, and script compilation.

## Features

- **Address Generation**: Generate all types of Bitcoin addresses (P2PKH, P2SH, P2WPKH, P2WSH, P2TR)
- **Transaction Processing**: Create, sign, and analyze Bitcoin transactions
- **PSBT Support**: Handle Partially Signed Bitcoin Transactions
- **Script Operations**: Compile and analyze Bitcoin scripts
- **Network Support**: Mainnet, Testnet, and Regtest configurations
- **Validation**: Comprehensive input validation and error handling

## Installation & Usage

### For MCP Clients (Claude Code, etc.)

Add to your MCP settings (`.claude.json` or `.mcp.json`):

```json
{
  "mcpServers": {
    "bitcoinjs": {
      "command": "npx",
      "args": ["-y", "bitcoinjs-mcp-server"]
    }
  }
}
```

That's it! The server will be automatically installed and started when needed.

**Alternative installations:**

<details>
<summary>Global Installation</summary>

```bash
npm install -g bitcoinjs-mcp-server
```

Then use:
```json
{
  "mcpServers": {
    "bitcoinjs": {
      "command": "bitcoinjs-mcp-server"
    }
  }
}
```
</details>

<details>
<summary>Development Setup</summary>

```bash
git clone https://github.com/Odyssey98/bitcoinjs-mcp-server.git
cd bitcoinjs-mcp-server
npm install && npm run build
```

Then use:
```json
{
  "mcpServers": {
    "bitcoinjs": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/bitcoinjs-mcp-server"
    }
  }
}
```
</details>

### For Development

```bash
# Clone and install
git clone https://github.com/Odyssey98/bitcoinjs-mcp-server.git
cd bitcoinjs-mcp-server
npm install
npm run build

# Start the server
npm start
```

## Available Tools

### Address Tools

- `generate_address`: Generate Bitcoin addresses of various types
- `validate_address`: Validate Bitcoin address format and network
- `decode_address`: Decode address to script and other details

### Transaction Tools

- `create_transaction`: Create new Bitcoin transactions
- `sign_transaction`: Sign transactions with private keys
- `decode_transaction`: Decode raw transaction hex
- `estimate_tx_size`: Estimate transaction size and fees

### PSBT Tools

- `create_psbt`: Create Partially Signed Bitcoin Transaction
- `update_psbt`: Add inputs/outputs to existing PSBT
- `sign_psbt`: Sign PSBT with keys
- `finalize_psbt`: Finalize and extract transaction

### Utility Tools

- `generate_keypair`: Generate new key pairs
- `create_multisig`: Create multisignature addresses
- `compile_script`: Compile Bitcoin scripts
- `hash_message`: Hash messages for signing

## Example Usage

Once configured in your MCP client, you can use these tools:

- Generate a new Bitcoin address: "Generate a P2WPKH testnet address"
- Create a transaction: "Create a transaction sending 0.001 BTC from [address] to [address]"
- Work with multisig: "Create a 2-of-3 multisig address with these public keys: [...]"
- Sign transactions: "Sign this transaction hex with the private key"

## Development

```bash
# Development mode with hot reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## License

MIT
