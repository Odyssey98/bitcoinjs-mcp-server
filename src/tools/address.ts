import * as bitcoin from 'bitcoinjs-lib';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getNetworkConfig, validateNetwork, isValidAddress } from '../utils/bitcoin.js';
import { AddressInfo, KeyPair } from '../types/index.js';

export const addressTools: Tool[] = [
  {
    name: 'generate_address',
    description: 'Generate Bitcoin addresses of various types (P2PKH, P2SH, P2WPKH, P2WSH, P2TR)',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['p2pkh', 'p2sh', 'p2wpkh', 'p2wsh', 'p2tr'],
          description: 'Type of address to generate',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
          description: 'Bitcoin network',
        },
        publicKey: {
          type: 'string',
          description: 'Public key in hex format (optional, will generate if not provided)',
        },
        redeemScript: {
          type: 'string',
          description: 'Redeem script for P2SH addresses (hex format)',
        },
        witnessScript: {
          type: 'string',
          description: 'Witness script for P2WSH addresses (hex format)',
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'validate_address',
    description: 'Validate Bitcoin address format and determine its properties',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Bitcoin address to validate',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          description: 'Expected network (optional)',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'decode_address',
    description: 'Decode Bitcoin address to reveal underlying script and information',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Bitcoin address to decode',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          description: 'Network to use for decoding',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'address_from_script',
    description: 'Generate address from a script',
    inputSchema: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          description: 'Script in hex format',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
          description: 'Bitcoin network',
        },
        type: {
          type: 'string',
          enum: ['p2sh', 'p2wsh'],
          description: 'Address type to generate from script',
        },
      },
      required: ['script', 'type'],
    },
  },
];

export async function handleAddressTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case 'generate_address':
      return generateAddress(args);
    case 'validate_address':
      return validateAddress(args);
    case 'decode_address':
      return decodeAddress(args);
    case 'address_from_script':
      return addressFromScript(args);
    default:
      throw new Error(`Unknown address tool: ${name}`);
  }
}

function generateAddress(args: {
  type: string;
  network?: string;
  publicKey?: string;
  redeemScript?: string;
  witnessScript?: string;
}): AddressInfo {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }
  
  const network = getNetworkConfig(networkName);
  let keyPair: bitcoin.Signer;
  let pubkey: Buffer;

  if (args.publicKey) {
    pubkey = Buffer.from(args.publicKey, 'hex');
    if (pubkey.length !== 33 && pubkey.length !== 65) {
      throw new Error('Invalid public key length');
    }
    // Create a dummy signer with the public key
    keyPair = {
      publicKey: pubkey,
      sign: () => { throw new Error('Private key not available for signing'); }
    };
  } else {
    keyPair = bitcoin.ECPair.makeRandom({ network });
    pubkey = keyPair.publicKey!;
  }

  let payment: bitcoin.Payment;
  let addressInfo: AddressInfo;

  switch (args.type.toLowerCase()) {
    case 'p2pkh':
      payment = bitcoin.payments.p2pkh({ pubkey, network });
      addressInfo = {
        address: payment.address!,
        type: 'p2pkh',
        network: networkName as any,
        script: payment.output!.toString('hex'),
      };
      break;

    case 'p2wpkh':
      payment = bitcoin.payments.p2wpkh({ pubkey, network });
      addressInfo = {
        address: payment.address!,
        type: 'p2wpkh',
        network: networkName as any,
        script: payment.output!.toString('hex'),
      };
      break;

    case 'p2sh':
      if (!args.redeemScript) {
        // Create a simple P2SH-wrapped P2WPKH
        const p2wpkh = bitcoin.payments.p2wpkh({ pubkey, network });
        payment = bitcoin.payments.p2sh({ redeem: p2wpkh, network });
        addressInfo = {
          address: payment.address!,
          type: 'p2sh',
          network: networkName as any,
          script: payment.output!.toString('hex'),
          redeemScript: p2wpkh.output!.toString('hex'),
        };
      } else {
        const redeemScript = Buffer.from(args.redeemScript, 'hex');
        payment = bitcoin.payments.p2sh({ redeem: { output: redeemScript }, network });
        addressInfo = {
          address: payment.address!,
          type: 'p2sh',
          network: networkName as any,
          script: payment.output!.toString('hex'),
          redeemScript: args.redeemScript,
        };
      }
      break;

    case 'p2wsh':
      if (!args.witnessScript) {
        throw new Error('Witness script required for P2WSH address');
      }
      const witnessScript = Buffer.from(args.witnessScript, 'hex');
      payment = bitcoin.payments.p2wsh({ redeem: { output: witnessScript }, network });
      addressInfo = {
        address: payment.address!,
        type: 'p2wsh',
        network: networkName as any,
        script: payment.output!.toString('hex'),
        witnessScript: args.witnessScript,
      };
      break;

    case 'p2tr':
      // For Taproot, we need the x-only public key
      const internalPubkey = pubkey.slice(1, 33); // Remove the 0x02/0x03 prefix
      payment = bitcoin.payments.p2tr({ internalPubkey, network });
      addressInfo = {
        address: payment.address!,
        type: 'p2tr',
        network: networkName as any,
        script: payment.output!.toString('hex'),
      };
      break;

    default:
      throw new Error(`Unsupported address type: ${args.type}`);
  }

  return addressInfo;
}

function validateAddress(args: { address: string; network?: string }): {
  valid: boolean;
  network?: string;
  type?: string;
  error?: string;
} {
  try {
    const address = args.address;
    
    if (args.network) {
      const network = getNetworkConfig(args.network);
      const valid = isValidAddress(address, network);
      if (valid) {
        const type = getAddressType(address, network);
        return {
          valid: true,
          network: args.network,
          type,
        };
      } else {
        return {
          valid: false,
          error: `Invalid address for ${args.network}`,
        };
      }
    } else {
      // Try all networks
      for (const [networkName, network] of Object.entries({
        mainnet: bitcoin.networks.bitcoin,
        testnet: bitcoin.networks.testnet,
        regtest: bitcoin.networks.regtest,
      })) {
        if (isValidAddress(address, network)) {
          const type = getAddressType(address, network);
          return {
            valid: true,
            network: networkName,
            type,
          };
        }
      }
      return {
        valid: false,
        error: 'Invalid address format or unsupported network',
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function decodeAddress(args: { address: string; network?: string }): any {
  try {
    const address = args.address;
    let network: bitcoin.Network;
    let detectedNetwork: string;

    if (args.network) {
      network = getNetworkConfig(args.network);
      detectedNetwork = args.network;
    } else {
      // Detect network
      for (const [networkName, net] of Object.entries({
        mainnet: bitcoin.networks.bitcoin,
        testnet: bitcoin.networks.testnet,
        regtest: bitcoin.networks.regtest,
      })) {
        if (isValidAddress(address, net)) {
          network = net;
          detectedNetwork = networkName;
          break;
        }
      }
      if (!network!) {
        throw new Error('Cannot detect network for address');
      }
    }

    const outputScript = bitcoin.address.toOutputScript(address, network);
    const type = getAddressType(address, network);

    return {
      address,
      network: detectedNetwork,
      type,
      script: outputScript.toString('hex'),
      scriptAsm: bitcoin.script.toASM(outputScript),
    };
  } catch (error) {
    throw new Error(`Failed to decode address: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function addressFromScript(args: { script: string; network?: string; type: string }): AddressInfo {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  const network = getNetworkConfig(networkName);
  const script = Buffer.from(args.script, 'hex');

  let payment: bitcoin.Payment;
  let addressInfo: AddressInfo;

  switch (args.type.toLowerCase()) {
    case 'p2sh':
      payment = bitcoin.payments.p2sh({ redeem: { output: script }, network });
      addressInfo = {
        address: payment.address!,
        type: 'p2sh',
        network: networkName as any,
        script: payment.output!.toString('hex'),
        redeemScript: args.script,
      };
      break;

    case 'p2wsh':
      payment = bitcoin.payments.p2wsh({ redeem: { output: script }, network });
      addressInfo = {
        address: payment.address!,
        type: 'p2wsh',
        network: networkName as any,
        script: payment.output!.toString('hex'),
        witnessScript: args.script,
      };
      break;

    default:
      throw new Error(`Unsupported script-to-address type: ${args.type}`);
  }

  return addressInfo;
}

function getAddressType(address: string, network: bitcoin.Network): string {
  try {
    const outputScript = bitcoin.address.toOutputScript(address, network);
    
    if (bitcoin.payments.p2pkh({ output: outputScript, network }).address === address) {
      return 'p2pkh';
    }
    if (bitcoin.payments.p2sh({ output: outputScript, network }).address === address) {
      return 'p2sh';
    }
    if (bitcoin.payments.p2wpkh({ output: outputScript, network }).address === address) {
      return 'p2wpkh';
    }
    if (bitcoin.payments.p2wsh({ output: outputScript, network }).address === address) {
      return 'p2wsh';
    }
    if (bitcoin.payments.p2tr({ output: outputScript, network }).address === address) {
      return 'p2tr';
    }
    
    return 'unknown';
  } catch {
    return 'unknown';
  }
}