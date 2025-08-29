import * as bitcoin from 'bitcoinjs-lib';
import * as crypto from 'crypto';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getNetworkConfig, validateNetwork, isValidHex, ECPair, BIP32 } from '../utils/bitcoin.js';
import { KeyPair, MultisigInfo, ScriptInfo } from '../types/index.js';

export const utilityTools: Tool[] = [
  {
    name: 'generate_keypair',
    description: 'Generate a new Bitcoin key pair (private/public keys)',
    inputSchema: {
      type: 'object',
      properties: {
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
        },
        compressed: {
          type: 'boolean',
          default: true,
          description: 'Generate compressed public key',
        },
      },
    },
  },
  {
    name: 'create_multisig',
    description: 'Create multisignature address and scripts',
    inputSchema: {
      type: 'object',
      properties: {
        m: {
          type: 'number',
          description: 'Required number of signatures (m-of-n)',
        },
        publicKeys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of public keys in hex format',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
        },
        addressType: {
          type: 'string',
          enum: ['p2sh', 'p2wsh', 'p2sh-p2wsh'],
          default: 'p2sh',
          description: 'Type of multisig address to create',
        },
      },
      required: ['m', 'publicKeys'],
    },
  },
  {
    name: 'compile_script',
    description: 'Compile Bitcoin Script from ASM or create common script types',
    inputSchema: {
      type: 'object',
      properties: {
        scriptAsm: {
          type: 'string',
          description: 'Script in ASM format (e.g., "OP_DUP OP_HASH160 <pubkeyhash> OP_EQUALVERIFY OP_CHECKSIG")',
        },
        scriptType: {
          type: 'string',
          enum: ['p2pk', 'p2pkh', 'p2sh', 'p2wpkh', 'p2wsh', 'multisig', 'nulldata'],
          description: 'Type of script to generate',
        },
        publicKey: {
          type: 'string',
          description: 'Public key for P2PK scripts (hex format)',
        },
        publicKeyHash: {
          type: 'string',
          description: 'Public key hash for P2PKH scripts (hex format)',
        },
        scriptHash: {
          type: 'string',
          description: 'Script hash for P2SH scripts (hex format)',
        },
        data: {
          type: 'string',
          description: 'Data for OP_RETURN scripts (hex format)',
        },
        multisigConfig: {
          type: 'object',
          properties: {
            m: { type: 'number' },
            publicKeys: { type: 'array', items: { type: 'string' } },
          },
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
        },
      },
    },
  },
  {
    name: 'hash_message',
    description: 'Hash messages using Bitcoin-specific hash functions',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to hash',
        },
        hashType: {
          type: 'string',
          enum: ['sha256', 'hash160', 'hash256', 'taggedHash'],
          default: 'sha256',
          description: 'Type of hash to compute',
        },
        tag: {
          type: 'string',
          description: 'Tag for tagged hash (e.g., "TapLeaf", "TapBranch")',
        },
        encoding: {
          type: 'string',
          enum: ['utf8', 'hex'],
          default: 'utf8',
          description: 'Input message encoding',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'derive_child_key',
    description: 'Derive child keys from extended keys (BIP32)',
    inputSchema: {
      type: 'object',
      properties: {
        extendedKey: {
          type: 'string',
          description: 'Extended private or public key (xprv/xpub)',
        },
        derivationPath: {
          type: 'string',
          description: 'Derivation path (e.g., "m/44\'/0\'/0\'/0/0")',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
        },
      },
      required: ['extendedKey', 'derivationPath'],
    },
  },
  {
    name: 'verify_message',
    description: 'Verify a Bitcoin message signature',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Bitcoin address that signed the message',
        },
        message: {
          type: 'string',
          description: 'Original message',
        },
        signature: {
          type: 'string',
          description: 'Base64-encoded signature',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
        },
      },
      required: ['address', 'message', 'signature'],
    },
  },
];

export async function handleUtilityTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case 'generate_keypair':
      return generateKeypair(args as { network?: string; compressed?: boolean; });
    case 'create_multisig':
      return createMultisig(args as { m: number; publicKeys: string[]; network?: string; addressType?: string; });
    case 'compile_script':
      return compileScript(args as any);
    case 'hash_message':
      return hashMessage(args as { message: string; hashType?: string; tag?: string; encoding?: string; });
    case 'derive_child_key':
      return deriveChildKey(args as { extendedKey: string; derivationPath: string; network?: string; });
    case 'verify_message':
      return verifyMessage(args as { address: string; message: string; signature: string; network?: string; });
    default:
      throw new Error(`Unknown utility tool: ${name}`);
  }
}

function generateKeypair(args: { network?: string; compressed?: boolean }): KeyPair {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  const network = getNetworkConfig(networkName);
  const compressed = args.compressed !== false; // Default to true

  const keyPair = ECPair.makeRandom({ 
    network,
    compressed,
  });

  if (!keyPair.privateKey || !keyPair.publicKey) {
    throw new Error('Failed to generate keypair');
  }

  return {
    privateKey: Buffer.from(keyPair.privateKey).toString('hex'),
    publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
    wif: keyPair.toWIF(),
    compressed,
  };
}

function createMultisig(args: {
  m: number;
  publicKeys: string[];
  network?: string;
  addressType?: string;
}): MultisigInfo {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  const network = getNetworkConfig(networkName);
  const addressType = args.addressType || 'p2sh';

  if (args.m <= 0 || args.m > args.publicKeys.length) {
    throw new Error('Invalid m value: must be between 1 and number of public keys');
  }

  if (args.publicKeys.length < 1 || args.publicKeys.length > 15) {
    throw new Error('Invalid number of public keys: must be between 1 and 15');
  }

  // Validate and convert public keys
  const pubkeys = args.publicKeys.map((pubkeyHex, index) => {
    if (!/^[0-9a-fA-F]+$/.test(pubkeyHex)) {
      throw new Error(`Invalid public key format at index ${index}: not hex`);
    }
    
    const pubkey = Buffer.from(pubkeyHex, 'hex');
    if (pubkey.length !== 33 && pubkey.length !== 65) {
      throw new Error(`Invalid public key length at index ${index}: got ${pubkey.length}, expected 33 or 65`);
    }
    
    return pubkey;
  });

  // Create the multisig redeem script
  const redeemScript = bitcoin.payments.p2ms({
    m: args.m,
    pubkeys,
    network,
  }).output!;

  let payment: bitcoin.Payment;
  let address: string;
  let witnessScript: string | undefined;
  let p2wsh: string | undefined;

  switch (addressType) {
    case 'p2sh':
      payment = bitcoin.payments.p2sh({ redeem: { output: redeemScript }, network });
      address = payment.address!;
      break;

    case 'p2wsh':
      payment = bitcoin.payments.p2wsh({ redeem: { output: redeemScript }, network });
      address = payment.address!;
      witnessScript = redeemScript.toString('hex');
      break;

    case 'p2sh-p2wsh':
      const p2wshPayment = bitcoin.payments.p2wsh({ redeem: { output: redeemScript }, network });
      payment = bitcoin.payments.p2sh({ redeem: p2wshPayment, network });
      address = payment.address!;
      witnessScript = redeemScript.toString('hex');
      p2wsh = p2wshPayment.address!;
      break;

    default:
      throw new Error(`Unsupported address type: ${addressType}`);
  }

  return {
    m: args.m,
    n: args.publicKeys.length,
    publicKeys: args.publicKeys,
    redeemScript: redeemScript.toString('hex'),
    address,
    witnessScript,
    p2wsh,
  };
}

function compileScript(args: {
  scriptAsm?: string;
  scriptType?: string;
  publicKey?: string;
  publicKeyHash?: string;
  scriptHash?: string;
  data?: string;
  multisigConfig?: { m: number; publicKeys: string[] };
  network?: string;
}): ScriptInfo {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  const network = getNetworkConfig(networkName);

  // If ASM is provided, compile it directly
  if (args.scriptAsm) {
    try {
      const script = bitcoin.script.fromASM(args.scriptAsm);
      return {
        type: 'custom',
        hex: script.toString('hex'),
        asm: args.scriptAsm,
      };
    } catch (error) {
      throw new Error(`Failed to compile ASM script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate script based on type
  let script: Buffer;
  let scriptType = args.scriptType || 'p2pkh';
  let addresses: string[] | undefined;
  let p2sh: string | undefined;
  let p2wsh: string | undefined;

  switch (scriptType) {
    case 'p2pk':
      if (!args.publicKey) throw new Error('Public key required for P2PK script');
      script = bitcoin.payments.p2pk({ 
        pubkey: Buffer.from(args.publicKey, 'hex'),
        network 
      }).output!;
      break;

    case 'p2pkh':
      if (!args.publicKeyHash) throw new Error('Public key hash required for P2PKH script');
      script = bitcoin.payments.p2pkh({ 
        hash: Buffer.from(args.publicKeyHash, 'hex'),
        network 
      }).output!;
      break;

    case 'p2sh':
      if (!args.scriptHash) throw new Error('Script hash required for P2SH script');
      script = bitcoin.payments.p2sh({ 
        hash: Buffer.from(args.scriptHash, 'hex'),
        network 
      }).output!;
      break;

    case 'p2wpkh':
      if (!args.publicKeyHash) throw new Error('Public key hash required for P2WPKH script');
      script = bitcoin.payments.p2wpkh({ 
        hash: Buffer.from(args.publicKeyHash, 'hex'),
        network 
      }).output!;
      break;

    case 'p2wsh':
      if (!args.scriptHash) throw new Error('Script hash required for P2WSH script');
      script = bitcoin.payments.p2wsh({ 
        hash: Buffer.from(args.scriptHash, 'hex'),
        network 
      }).output!;
      break;

    case 'multisig':
      if (!args.multisigConfig) throw new Error('Multisig configuration required for multisig script');
      const pubkeys = args.multisigConfig.publicKeys.map(pk => {
        const buf = Buffer.from(pk, 'hex');
        // Ensure the public key is in the correct format for bitcoinjs-lib
        if (buf.length !== 33 && buf.length !== 65) {
          throw new Error(`Invalid public key length: ${buf.length}`);
        }
        return buf;
      });
      const multisig = bitcoin.payments.p2ms({ 
        m: args.multisigConfig.m, 
        pubkeys,
        network 
      });
      script = multisig.output!;
      
      // Also provide P2SH and P2WSH addresses
      const p2shPayment = bitcoin.payments.p2sh({ redeem: multisig, network });
      const p2wshPayment = bitcoin.payments.p2wsh({ redeem: multisig, network });
      p2sh = p2shPayment.address!;
      p2wsh = p2wshPayment.address!;
      break;

    case 'nulldata':
      if (!args.data) throw new Error('Data required for OP_RETURN script');
      const data = Buffer.from(args.data, 'hex');
      if (data.length > 80) throw new Error('OP_RETURN data too large (max 80 bytes)');
      script = bitcoin.payments.embed({ data: [data] }).output!;
      break;

    default:
      throw new Error(`Unsupported script type: ${scriptType}`);
  }

  return {
    type: scriptType,
    hex: script.toString('hex'),
    asm: bitcoin.script.toASM(script),
    addresses,
    p2sh,
    p2wsh,
  };
}

function hashMessage(args: {
  message: string;
  hashType?: string;
  tag?: string;
  encoding?: string;
}): { hash: string; hashType: string } {
  const hashType = args.hashType || 'sha256';
  const encoding = args.encoding || 'utf8';

  let messageBuffer: Buffer;
  if (encoding === 'hex') {
    if (!isValidHex(args.message)) {
      throw new Error('Invalid hex message');
    }
    messageBuffer = Buffer.from(args.message, 'hex');
  } else {
    messageBuffer = Buffer.from(args.message, 'utf8');
  }

  let hash: Buffer;

  switch (hashType) {
    case 'sha256':
      hash = bitcoin.crypto.sha256(messageBuffer);
      break;

    case 'hash160':
      hash = bitcoin.crypto.hash160(messageBuffer);
      break;

    case 'hash256':
      hash = bitcoin.crypto.hash256(messageBuffer);
      break;

    case 'taggedHash':
      if (!args.tag) throw new Error('Tag required for tagged hash');
      hash = bitcoin.crypto.taggedHash(args.tag as any, messageBuffer);
      break;

    default:
      throw new Error(`Unsupported hash type: ${hashType}`);
  }

  return {
    hash: hash.toString('hex'),
    hashType,
  };
}

function deriveChildKey(args: {
  extendedKey: string;
  derivationPath: string;
  network?: string;
}): { extendedKey: string; publicKey: string; privateKey?: string; address: string } {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  const network = getNetworkConfig(networkName);

  try {
    // Parse the extended key
    const node = BIP32.fromBase58(args.extendedKey, network);
    
    // Parse derivation path
    const path = args.derivationPath.replace(/^m\//, '').split('/');
    let derivedNode = node;

    for (const segment of path) {
      if (segment === '') continue;
      
      const hardened = segment.endsWith("'") || segment.endsWith('h');
      const index = parseInt(hardened ? segment.slice(0, -1) : segment, 10);
      
      if (isNaN(index) || index < 0 || index >= 0x80000000) {
        throw new Error(`Invalid derivation index: ${segment}`);
      }
      
      const derivationIndex = hardened ? index + 0x80000000 : index;
      derivedNode = derivedNode.derive(derivationIndex);
    }

    // Generate address (P2WPKH by default)
    const payment = bitcoin.payments.p2wpkh({ 
      pubkey: Buffer.from(derivedNode.publicKey), 
      network 
    });

    return {
      extendedKey: derivedNode.toBase58(),
      publicKey: Buffer.from(derivedNode.publicKey).toString('hex'),
      privateKey: derivedNode.privateKey ? Buffer.from(derivedNode.privateKey).toString('hex') : undefined,
      address: payment.address!,
    };
  } catch (error) {
    throw new Error(`Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function verifyMessage(args: {
  address: string;
  message: string;
  signature: string;
  network?: string;
}): { valid: boolean; recovered?: string; error?: string } {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  const network = getNetworkConfig(networkName);

  try {
    // This is a simplified implementation
    // Full message verification requires handling Bitcoin's message signing format
    const messageBuffer = Buffer.from(args.message, 'utf8');
    const signatureBuffer = Buffer.from(args.signature, 'base64');

    if (signatureBuffer.length !== 65) {
      return {
        valid: false,
        error: 'Invalid signature length',
      };
    }

    // Bitcoin message verification is complex and requires proper message formatting
    // This is a basic implementation that would need to be enhanced for production use
    return {
      valid: false,
      error: 'Message verification not fully implemented - use specialized libraries',
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}