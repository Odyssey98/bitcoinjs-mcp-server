# Usage Examples

This document provides examples of how to use the BitcoinJS MCP Server tools.

## Address Generation

### Generate a P2WPKH (Native SegWit) Address
```json
{
  "tool": "generate_address",
  "arguments": {
    "type": "p2wpkh",
    "network": "testnet"
  }
}
```

### Generate a Taproot Address
```json
{
  "tool": "generate_address",
  "arguments": {
    "type": "p2tr",
    "network": "testnet"
  }
}
```

### Generate P2SH Address from Custom Script
```json
{
  "tool": "address_from_script",
  "arguments": {
    "script": "5221038282263212c609d9ea2a6e3e172de238d8c39cabd5ac1ca10646e23fd5f51508f24321032f2f5c3c15ba69b8ac4b6a4c7a7f9f3e7d2a8b5c7f1e2d3a4b6f8e7c9d1a2b3c4d52ae",
    "type": "p2sh",
    "network": "testnet"
  }
}
```

## Transaction Creation

### Create a Simple Transaction
```json
{
  "tool": "create_transaction",
  "arguments": {
    "inputs": [
      {
        "txid": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
        "vout": 0,
        "amount": 100000,
        "scriptPubKey": "0014abcdef1234567890abcdef1234567890abcdef12"
      }
    ],
    "outputs": [
      {
        "address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
        "amount": 95000
      }
    ],
    "network": "testnet"
  }
}
```

### Estimate Transaction Fee
```json
{
  "tool": "estimate_transaction_fee",
  "arguments": {
    "inputs": 2,
    "outputs": 2,
    "feeRate": 10,
    "inputType": "segwit"
  }
}
```

## PSBT Operations

### Create a PSBT
```json
{
  "tool": "create_psbt",
  "arguments": {
    "inputs": [
      {
        "txid": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
        "vout": 0,
        "amount": 100000,
        "witnessUtxo": {
          "script": "0014abcdef1234567890abcdef1234567890abcdef12",
          "value": 100000
        }
      }
    ],
    "outputs": [
      {
        "address": "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
        "amount": 95000
      }
    ],
    "network": "testnet"
  }
}
```

### Sign a PSBT
```json
{
  "tool": "sign_psbt",
  "arguments": {
    "psbt": "cHNidP8BAH0CAAAAASaBcTce3/KF6Tet7qSze3gADAVmy7OtZGQXE8pCFxv2AAAAAAD+////AtPf9QUAAAAAGXapFNDFmQPFusKGh2DpD9UhpGZap2UgiKwgxNOCAAAAABl2qRRQUOJvt8LJNV0QIlTsR7KLU4XgdYisAAAAA",
    "privateKeys": ["cTpB4YiyKiBcPxnefsDpbnDxFDffjqJob1tkUF7PSuTjSM3jxM4o"],
    "network": "testnet"
  }
}
```

## Utility Functions

### Generate Key Pair
```json
{
  "tool": "generate_keypair",
  "arguments": {
    "network": "testnet",
    "compressed": true
  }
}
```

### Create Multisig Address
```json
{
  "tool": "create_multisig",
  "arguments": {
    "m": 2,
    "publicKeys": [
      "02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9388",
      "03389ffce9cd9ae88dcc0631e88a821ffdbe9bfe26381143ffdb63a3e2369b4e1df7",
      "02d20b322326f8b02f9e82c4ef3a0a7d88c2e80b11e6c93a98b0c3a6f7e5a1f2d6e"
    ],
    "network": "testnet",
    "addressType": "p2sh"
  }
}
```

### Hash a Message
```json
{
  "tool": "hash_message",
  "arguments": {
    "message": "Hello Bitcoin",
    "hashType": "sha256",
    "encoding": "utf8"
  }
}
```

### Compile Script
```json
{
  "tool": "compile_script",
  "arguments": {
    "scriptAsm": "OP_DUP OP_HASH160 6f1a4b2e8c4e7a5b3e4c6f7a8b9c0d1e2f3a4b5c OP_EQUALVERIFY OP_CHECKSIG"
  }
}
```

## Error Handling

All tools return error information when operations fail:

```json
{
  "error": "Invalid network: invalid_network"
}
```

## Tips

1. **Network Selection**: Always specify the correct network (mainnet/testnet/regtest) for your use case
2. **Input Validation**: The server performs extensive input validation and will return descriptive error messages
3. **Hex Encoding**: All binary data (scripts, hashes, etc.) should be provided in hexadecimal format
4. **Amount Units**: All amounts are specified in satoshis (1 BTC = 100,000,000 satoshis)
5. **Address Types**: Choose the appropriate address type for your use case:
   - P2PKH: Legacy addresses (highest fees)
   - P2SH: Script addresses, can wrap SegWit
   - P2WPKH: Native SegWit (lower fees)
   - P2WSH: Native SegWit scripts (lowest fees for complex scripts)
   - P2TR: Taproot (most private, flexible)