import * as bitcoin from 'bitcoinjs-lib';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getNetworkConfig, validateNetwork, isValidHex, estimateTransactionSize, formatSatoshis, parseBTCAmount, ECPair } from '../utils/bitcoin.js';
import { TransactionInfo, TransactionInput, TransactionOutput } from '../types/index.js';

export const transactionTools: Tool[] = [
  {
    name: 'create_transaction',
    description: 'Create a new Bitcoin transaction',
    inputSchema: {
      type: 'object',
      properties: {
        inputs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              txid: { type: 'string' },
              vout: { type: 'number' },
              amount: { type: 'number', description: 'Amount in satoshis' },
              address: { type: 'string', description: 'Address that owns this UTXO' },
              scriptPubKey: { type: 'string', description: 'Script in hex format (optional)' },
            },
            required: ['txid', 'vout', 'amount'],
          },
        },
        outputs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              address: { type: 'string', description: 'Recipient address' },
              amount: { type: 'number', description: 'Amount in satoshis' },
            },
            required: ['address', 'amount'],
          },
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
        },
        locktime: {
          type: 'number',
          default: 0,
          description: 'Transaction locktime',
        },
        version: {
          type: 'number',
          default: 2,
          description: 'Transaction version',
        },
      },
      required: ['inputs', 'outputs'],
    },
  },
  {
    name: 'decode_transaction',
    description: 'Decode a raw transaction hex to readable format',
    inputSchema: {
      type: 'object',
      properties: {
        hex: {
          type: 'string',
          description: 'Transaction hex string',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
        },
      },
      required: ['hex'],
    },
  },
  {
    name: 'sign_transaction',
    description: 'Sign a transaction with provided private keys',
    inputSchema: {
      type: 'object',
      properties: {
        hex: {
          type: 'string',
          description: 'Transaction hex to sign',
        },
        privateKeys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Private keys in WIF format',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
        },
      },
      required: ['hex', 'privateKeys'],
    },
  },
  {
    name: 'estimate_transaction_fee',
    description: 'Estimate transaction size and fee',
    inputSchema: {
      type: 'object',
      properties: {
        inputs: { type: 'number', description: 'Number of inputs' },
        outputs: { type: 'number', description: 'Number of outputs' },
        feeRate: { type: 'number', description: 'Fee rate in sat/vByte' },
        inputType: {
          type: 'string',
          enum: ['legacy', 'segwit', 'taproot'],
          default: 'segwit',
        },
      },
      required: ['inputs', 'outputs', 'feeRate'],
    },
  },
  {
    name: 'broadcast_transaction',
    description: 'Validate transaction format (does not actually broadcast)',
    inputSchema: {
      type: 'object',
      properties: {
        hex: {
          type: 'string',
          description: 'Transaction hex to validate',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
        },
      },
      required: ['hex'],
    },
  },
];

export async function handleTransactionTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case 'create_transaction':
      return createTransaction(args as any);
    case 'decode_transaction':
      return decodeTransaction(args as { hex: string; network?: string; });
    case 'sign_transaction':
      return signTransaction(args as { hex: string; privateKeys: string[]; network?: string; });
    case 'estimate_transaction_fee':
      return estimateTransactionFee(args as { inputs: number; outputs: number; feeRate: number; inputType?: string; });
    case 'broadcast_transaction':
      return validateTransaction(args as { hex: string; network?: string; });
    default:
      throw new Error(`Unknown transaction tool: ${name}`);
  }
}

function createTransaction(args: {
  inputs: Array<{ txid: string; vout: number; amount: number; address?: string; scriptPubKey?: string }>;
  outputs: Array<{ address: string; amount: number }>;
  network?: string;
  locktime?: number;
  version?: number;
}): { hex: string; txid: string; size: number; weight: number; vsize: number } {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  const network = getNetworkConfig(networkName);
  const psbt = new bitcoin.Psbt({ network });

  // Set version and locktime
  psbt.setVersion(args.version || 2);
  psbt.setLocktime(args.locktime || 0);

  // Add inputs
  for (const input of args.inputs) {
    if (!isValidHex(input.txid) || input.txid.length !== 64) {
      throw new Error(`Invalid txid: ${input.txid}`);
    }

    if (input.vout < 0) {
      throw new Error(`Invalid vout: ${input.vout}`);
    }

    if (input.amount <= 0) {
      throw new Error(`Invalid amount: ${input.amount}`);
    }

    // Create a minimal witness UTXO for SegWit compatibility
    const witnessUtxo = {
      script: input.scriptPubKey ? Buffer.from(input.scriptPubKey, 'hex') : Buffer.alloc(0),
      value: input.amount,
    };

    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      witnessUtxo,
    });
  }

  // Add outputs
  for (const output of args.outputs) {
    if (output.amount <= 0) {
      throw new Error(`Invalid output amount: ${output.amount}`);
    }

    try {
      bitcoin.address.toOutputScript(output.address, network);
    } catch {
      throw new Error(`Invalid address: ${output.address}`);
    }

    psbt.addOutput({
      address: output.address,
      value: output.amount,
    });
  }

  // Extract the unsigned transaction
  const tx = psbt.extractTransaction(true); // true = allow incomplete
  const hex = tx.toHex();
  const txid = tx.getId();

  return {
    hex,
    txid,
    size: tx.byteLength(),
    weight: tx.weight(),
    vsize: tx.virtualSize(),
  };
}

function decodeTransaction(args: { hex: string; network?: string }): TransactionInfo {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  if (!isValidHex(args.hex)) {
    throw new Error('Invalid hex format');
  }

  const network = getNetworkConfig(networkName);
  const tx = bitcoin.Transaction.fromHex(args.hex);

  const inputs: TransactionInput[] = tx.ins.map((input, index) => ({
    txid: Buffer.from(input.hash).reverse().toString('hex'),
    vout: input.index,
    scriptSig: input.script.toString('hex'),
    sequence: input.sequence,
    witness: input.witness.map(w => w.toString('hex')),
  }));

  const outputs: TransactionOutput[] = tx.outs.map((output, index) => {
    let address: string | undefined;
    try {
      address = bitcoin.address.fromOutputScript(output.script, network);
    } catch {
      // Address cannot be derived from script
    }

    return {
      address,
      script: output.script.toString('hex'),
      amount: output.value,
    };
  });

  return {
    txid: tx.getId(),
    version: tx.version,
    locktime: tx.locktime,
    inputs,
    outputs,
    size: tx.byteLength(),
    weight: tx.weight(),
    vsize: tx.virtualSize(),
    hex: args.hex,
  };
}

function signTransaction(args: {
  hex: string;
  privateKeys: string[];
  network?: string;
}): { hex: string; signed: boolean; errors?: string[] } {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  if (!isValidHex(args.hex)) {
    throw new Error('Invalid hex format');
  }

  const network = getNetworkConfig(networkName);
  const psbt = bitcoin.Psbt.fromHex(args.hex, { network });
  const errors: string[] = [];

  // Convert private keys to ECPair objects
  const keyPairs = args.privateKeys.map((wif, index) => {
    try {
      return ECPair.fromWIF(wif, network);
    } catch (error) {
      errors.push(`Invalid private key at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }).filter(kp => kp !== null) as any[];

  if (keyPairs.length === 0) {
    throw new Error('No valid private keys provided');
  }

  // Try to sign with each key pair
  for (let i = 0; i < psbt.inputCount; i++) {
    for (const keyPair of keyPairs) {
      try {
        psbt.signInput(i, keyPair);
      } catch (error) {
        // Key doesn't match this input, continue
        continue;
      }
    }
  }

  // Validate signatures
  let signed = true;
  for (let i = 0; i < psbt.inputCount; i++) {
    try {
      psbt.validateSignaturesOfInput(i, () => true);
    } catch (error) {
      signed = false;
      errors.push(`Failed to validate input ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Try to finalize if fully signed
  if (signed) {
    try {
      psbt.finalizeAllInputs();
      const finalTx = psbt.extractTransaction();
      return {
        hex: finalTx.toHex(),
        signed: true,
      };
    } catch (error) {
      errors.push(`Failed to finalize transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      signed = false;
    }
  }

  return {
    hex: psbt.toHex(),
    signed,
    errors: errors.length > 0 ? errors : undefined,
  };
}

function estimateTransactionFee(args: {
  inputs: number;
  outputs: number;
  feeRate: number;
  inputType?: string;
}): {
  size: number;
  vsize: number;
  weight: number;
  fee: number;
  feeRate: number;
  feeFormatted: string;
} {
  if (args.inputs <= 0 || args.outputs <= 0) {
    throw new Error('Inputs and outputs must be positive numbers');
  }

  if (args.feeRate <= 0) {
    throw new Error('Fee rate must be positive');
  }

  const inputType = args.inputType || 'segwit';
  const hasWitness = inputType === 'segwit' || inputType === 'taproot';

  let inputSize: number;
  let witnessSize = 0;

  switch (inputType) {
    case 'legacy':
      inputSize = 148; // 32 (prev tx) + 4 (vout) + 1 (script len) + 107 (script sig) + 4 (sequence)
      break;
    case 'segwit':
      inputSize = 68; // 32 (prev tx) + 4 (vout) + 1 (empty script) + 4 (sequence) + witness discount
      witnessSize = 107; // witness stack size
      break;
    case 'taproot':
      inputSize = 68;
      witnessSize = 65; // single signature witness
      break;
    default:
      throw new Error(`Unknown input type: ${inputType}`);
  }

  const outputSize = 34; // 8 (value) + 1 (script len) + 25 (script)
  const baseSize = 10; // 4 (version) + 1 (input count) + 1 (output count) + 4 (locktime)
  
  const size = baseSize + (args.inputs * inputSize) + (args.outputs * outputSize);
  
  let weight: number;
  if (hasWitness) {
    const witnessData = args.inputs * witnessSize + 2; // +2 for witness marker and flag
    weight = (size - (args.inputs * witnessSize)) * 4 + witnessData;
  } else {
    weight = size * 4;
  }

  const vsize = Math.ceil(weight / 4);
  const fee = Math.ceil(vsize * args.feeRate);

  return {
    size: hasWitness ? size - (args.inputs * witnessSize) + Math.ceil((args.inputs * witnessSize) / 4) : size,
    vsize,
    weight,
    fee,
    feeRate: args.feeRate,
    feeFormatted: formatSatoshis(fee),
  };
}

function validateTransaction(args: { hex: string; network?: string }): {
  valid: boolean;
  txid?: string;
  size?: number;
  errors?: string[];
} {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  if (!isValidHex(args.hex)) {
    return {
      valid: false,
      errors: ['Invalid hex format'],
    };
  }

  try {
    const tx = bitcoin.Transaction.fromHex(args.hex);
    const errors: string[] = [];

    // Basic validation checks
    if (tx.ins.length === 0) {
      errors.push('Transaction has no inputs');
    }

    if (tx.outs.length === 0) {
      errors.push('Transaction has no outputs');
    }

    // Check for duplicate inputs
    const inputIds = tx.ins.map(input => 
      Buffer.from(input.hash).reverse().toString('hex') + ':' + input.index
    );
    const uniqueInputs = new Set(inputIds);
    if (inputIds.length !== uniqueInputs.size) {
      errors.push('Transaction has duplicate inputs');
    }

    // Check output values
    let totalOutput = 0;
    for (const output of tx.outs) {
      if (output.value < 0) {
        errors.push('Negative output value found');
      }
      totalOutput += output.value;
    }

    if (totalOutput > 21000000 * 100000000) { // 21M BTC in satoshis
      errors.push('Total output exceeds maximum Bitcoin supply');
    }

    return {
      valid: errors.length === 0,
      txid: tx.getId(),
      size: tx.byteLength(),
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to parse transaction: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}