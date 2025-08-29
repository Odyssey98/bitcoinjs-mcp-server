import * as bitcoin from 'bitcoinjs-lib';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getNetworkConfig, validateNetwork, isValidHex } from '../utils/bitcoin.js';
import { PSBTInfo } from '../types/index.js';

export const psbtTools: Tool[] = [
  {
    name: 'create_psbt',
    description: 'Create a new Partially Signed Bitcoin Transaction (PSBT)',
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
              scriptPubKey: { type: 'string', description: 'Output script in hex' },
              redeemScript: { type: 'string', description: 'Redeem script for P2SH (hex)' },
              witnessScript: { type: 'string', description: 'Witness script for P2WSH (hex)' },
              witnessUtxo: { 
                type: 'object',
                properties: {
                  script: { type: 'string' },
                  value: { type: 'number' }
                }
              },
              nonWitnessUtxo: { type: 'string', description: 'Full transaction hex for non-witness inputs' },
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
        version: { type: 'number', default: 2 },
        locktime: { type: 'number', default: 0 },
      },
      required: ['inputs', 'outputs'],
    },
  },
  {
    name: 'decode_psbt',
    description: 'Decode a PSBT to readable format',
    inputSchema: {
      type: 'object',
      properties: {
        psbt: {
          type: 'string',
          description: 'PSBT in base64 or hex format',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
        },
      },
      required: ['psbt'],
    },
  },
  {
    name: 'sign_psbt',
    description: 'Sign a PSBT with private keys',
    inputSchema: {
      type: 'object',
      properties: {
        psbt: {
          type: 'string',
          description: 'PSBT in base64 or hex format',
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
      required: ['psbt', 'privateKeys'],
    },
  },
  {
    name: 'finalize_psbt',
    description: 'Finalize a signed PSBT and extract the transaction',
    inputSchema: {
      type: 'object',
      properties: {
        psbt: {
          type: 'string',
          description: 'PSBT in base64 or hex format',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
        },
      },
      required: ['psbt'],
    },
  },
  {
    name: 'combine_psbts',
    description: 'Combine multiple PSBTs into one',
    inputSchema: {
      type: 'object',
      properties: {
        psbts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of PSBTs in base64 or hex format',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
        },
      },
      required: ['psbts'],
    },
  },
  {
    name: 'update_psbt',
    description: 'Update PSBT with additional information',
    inputSchema: {
      type: 'object',
      properties: {
        psbt: {
          type: 'string',
          description: 'PSBT in base64 or hex format',
        },
        inputIndex: {
          type: 'number',
          description: 'Index of input to update',
        },
        updates: {
          type: 'object',
          properties: {
            witnessUtxo: {
              type: 'object',
              properties: {
                script: { type: 'string' },
                value: { type: 'number' }
              }
            },
            nonWitnessUtxo: { type: 'string' },
            redeemScript: { type: 'string' },
            witnessScript: { type: 'string' },
            bip32Derivation: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  pubkey: { type: 'string' },
                  masterFingerprint: { type: 'string' },
                  path: { type: 'string' }
                }
              }
            }
          }
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'testnet', 'regtest'],
          default: 'testnet',
        },
      },
      required: ['psbt', 'inputIndex', 'updates'],
    },
  },
];

export async function handlePSBTTool(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    case 'create_psbt':
      return createPSBT(args);
    case 'decode_psbt':
      return decodePSBT(args);
    case 'sign_psbt':
      return signPSBT(args);
    case 'finalize_psbt':
      return finalizePSBT(args);
    case 'combine_psbts':
      return combinePSBTs(args);
    case 'update_psbt':
      return updatePSBT(args);
    default:
      throw new Error(`Unknown PSBT tool: ${name}`);
  }
}

function createPSBT(args: {
  inputs: Array<{
    txid: string;
    vout: number;
    amount: number;
    scriptPubKey?: string;
    redeemScript?: string;
    witnessScript?: string;
    witnessUtxo?: { script: string; value: number };
    nonWitnessUtxo?: string;
  }>;
  outputs: Array<{ address: string; amount: number }>;
  network?: string;
  version?: number;
  locktime?: number;
}): { psbt: string; base64: string } {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  const network = getNetworkConfig(networkName);
  const psbt = new bitcoin.Psbt({ network });

  // Set transaction properties
  if (args.version) psbt.setVersion(args.version);
  if (args.locktime) psbt.setLocktime(args.locktime);

  // Add inputs
  for (const input of args.inputs) {
    if (!isValidHex(input.txid) || input.txid.length !== 64) {
      throw new Error(`Invalid txid: ${input.txid}`);
    }

    const inputData: any = {
      hash: input.txid,
      index: input.vout,
    };

    // Add witness UTXO (preferred for segwit)
    if (input.witnessUtxo) {
      inputData.witnessUtxo = {
        script: Buffer.from(input.witnessUtxo.script, 'hex'),
        value: input.witnessUtxo.value,
      };
    } else if (input.scriptPubKey && input.amount) {
      inputData.witnessUtxo = {
        script: Buffer.from(input.scriptPubKey, 'hex'),
        value: input.amount,
      };
    }

    // Add non-witness UTXO (for legacy inputs)
    if (input.nonWitnessUtxo) {
      inputData.nonWitnessUtxo = Buffer.from(input.nonWitnessUtxo, 'hex');
    }

    // Add redeem script for P2SH
    if (input.redeemScript) {
      inputData.redeemScript = Buffer.from(input.redeemScript, 'hex');
    }

    // Add witness script for P2WSH
    if (input.witnessScript) {
      inputData.witnessScript = Buffer.from(input.witnessScript, 'hex');
    }

    psbt.addInput(inputData);
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

  return {
    psbt: psbt.toHex(),
    base64: psbt.toBase64(),
  };
}

function decodePSBT(args: { psbt: string; network?: string }): any {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  const network = getNetworkConfig(networkName);
  let psbt: bitcoin.Psbt;

  try {
    // Try to parse as base64 first, then hex
    if (args.psbt.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
      psbt = bitcoin.Psbt.fromBase64(args.psbt, { network });
    } else {
      psbt = bitcoin.Psbt.fromHex(args.psbt, { network });
    }
  } catch (error) {
    throw new Error(`Invalid PSBT format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const tx = psbt.extractTransaction(true); // true = allow incomplete

  const inputs = psbt.data.inputs.map((input, index) => {
    const txInput = tx.ins[index];
    return {
      index,
      txid: Buffer.from(txInput.hash).reverse().toString('hex'),
      vout: txInput.index,
      sequence: txInput.sequence,
      witnessUtxo: input.witnessUtxo ? {
        script: input.witnessUtxo.script.toString('hex'),
        value: input.witnessUtxo.value,
      } : undefined,
      nonWitnessUtxo: input.nonWitnessUtxo ? input.nonWitnessUtxo.toString('hex') : undefined,
      redeemScript: input.redeemScript ? input.redeemScript.toString('hex') : undefined,
      witnessScript: input.witnessScript ? input.witnessScript.toString('hex') : undefined,
      partialSig: input.partialSig ? input.partialSig.map(sig => ({
        pubkey: sig.pubkey.toString('hex'),
        signature: sig.signature.toString('hex'),
      })) : [],
      sighashType: input.sighashType,
    };
  });

  const outputs = psbt.data.outputs.map((output, index) => {
    const txOutput = tx.outs[index];
    let address: string | undefined;
    
    try {
      address = bitcoin.address.fromOutputScript(txOutput.script, network);
    } catch {
      // Address cannot be derived
    }

    return {
      index,
      address,
      script: txOutput.script.toString('hex'),
      amount: txOutput.value,
      redeemScript: output.redeemScript ? output.redeemScript.toString('hex') : undefined,
      witnessScript: output.witnessScript ? output.witnessScript.toString('hex') : undefined,
    };
  });

  return {
    version: tx.version,
    locktime: tx.locktime,
    inputs,
    outputs,
    fee: psbt.getFee(),
    feeRate: psbt.getFeeRate(),
    extractable: psbt.extractTransaction() ? true : false,
  };
}

function signPSBT(args: {
  psbt: string;
  privateKeys: string[];
  network?: string;
}): { psbt: string; base64: string; signed: boolean; errors?: string[] } {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  const network = getNetworkConfig(networkName);
  let psbt: bitcoin.Psbt;

  try {
    if (args.psbt.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
      psbt = bitcoin.Psbt.fromBase64(args.psbt, { network });
    } else {
      psbt = bitcoin.Psbt.fromHex(args.psbt, { network });
    }
  } catch (error) {
    throw new Error(`Invalid PSBT format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const errors: string[] = [];
  
  // Convert private keys to ECPair objects
  const keyPairs = args.privateKeys.map((wif, index) => {
    try {
      return bitcoin.ECPair.fromWIF(wif, network);
    } catch (error) {
      errors.push(`Invalid private key at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }).filter(kp => kp !== null) as bitcoin.Signer[];

  if (keyPairs.length === 0) {
    throw new Error('No valid private keys provided');
  }

  // Try to sign each input with each key
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
  let allInputsSigned = true;
  for (let i = 0; i < psbt.inputCount; i++) {
    try {
      psbt.validateSignaturesOfInput(i, () => true);
    } catch (error) {
      allInputsSigned = false;
      continue;
    }
  }

  return {
    psbt: psbt.toHex(),
    base64: psbt.toBase64(),
    signed: allInputsSigned,
    errors: errors.length > 0 ? errors : undefined,
  };
}

function finalizePSBT(args: { psbt: string; network?: string }): {
  finalized: boolean;
  hex?: string;
  txid?: string;
  errors?: string[];
} {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  const network = getNetworkConfig(networkName);
  let psbt: bitcoin.Psbt;

  try {
    if (args.psbt.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
      psbt = bitcoin.Psbt.fromBase64(args.psbt, { network });
    } else {
      psbt = bitcoin.Psbt.fromHex(args.psbt, { network });
    }
  } catch (error) {
    throw new Error(`Invalid PSBT format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const errors: string[] = [];

  try {
    // Validate all inputs first
    for (let i = 0; i < psbt.inputCount; i++) {
      try {
        psbt.validateSignaturesOfInput(i, () => true);
      } catch (error) {
        errors.push(`Input ${i} validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      return {
        finalized: false,
        errors,
      };
    }

    // Finalize all inputs
    psbt.finalizeAllInputs();
    
    // Extract the final transaction
    const tx = psbt.extractTransaction();
    
    return {
      finalized: true,
      hex: tx.toHex(),
      txid: tx.getId(),
    };
  } catch (error) {
    return {
      finalized: false,
      errors: [`Finalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

function combinePSBTs(args: { psbts: string[]; network?: string }): { psbt: string; base64: string } {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  const network = getNetworkConfig(networkName);

  if (args.psbts.length < 2) {
    throw new Error('At least 2 PSBTs are required for combination');
  }

  const psbts = args.psbts.map((psbtStr, index) => {
    try {
      if (psbtStr.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
        return bitcoin.Psbt.fromBase64(psbtStr, { network });
      } else {
        return bitcoin.Psbt.fromHex(psbtStr, { network });
      }
    } catch (error) {
      throw new Error(`Invalid PSBT format at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Use the first PSBT as the base
  const basePsbt = psbts[0];
  const otherPsbts = psbts.slice(1);

  try {
    // Combine all PSBTs
    const combinedPsbt = basePsbt.combine(...otherPsbts);
    
    return {
      psbt: combinedPsbt.toHex(),
      base64: combinedPsbt.toBase64(),
    };
  } catch (error) {
    throw new Error(`Failed to combine PSBTs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function updatePSBT(args: {
  psbt: string;
  inputIndex: number;
  updates: any;
  network?: string;
}): { psbt: string; base64: string } {
  const networkName = args.network || 'testnet';
  if (!validateNetwork(networkName)) {
    throw new Error(`Invalid network: ${networkName}`);
  }

  const network = getNetworkConfig(networkName);
  let psbt: bitcoin.Psbt;

  try {
    if (args.psbt.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
      psbt = bitcoin.Psbt.fromBase64(args.psbt, { network });
    } else {
      psbt = bitcoin.Psbt.fromHex(args.psbt, { network });
    }
  } catch (error) {
    throw new Error(`Invalid PSBT format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (args.inputIndex < 0 || args.inputIndex >= psbt.inputCount) {
    throw new Error(`Invalid input index: ${args.inputIndex}`);
  }

  const updates = args.updates;

  try {
    // Update witness UTXO
    if (updates.witnessUtxo) {
      psbt.updateInput(args.inputIndex, {
        witnessUtxo: {
          script: Buffer.from(updates.witnessUtxo.script, 'hex'),
          value: updates.witnessUtxo.value,
        },
      });
    }

    // Update non-witness UTXO
    if (updates.nonWitnessUtxo) {
      psbt.updateInput(args.inputIndex, {
        nonWitnessUtxo: Buffer.from(updates.nonWitnessUtxo, 'hex'),
      });
    }

    // Update redeem script
    if (updates.redeemScript) {
      psbt.updateInput(args.inputIndex, {
        redeemScript: Buffer.from(updates.redeemScript, 'hex'),
      });
    }

    // Update witness script
    if (updates.witnessScript) {
      psbt.updateInput(args.inputIndex, {
        witnessScript: Buffer.from(updates.witnessScript, 'hex'),
      });
    }

    // Update BIP32 derivation paths
    if (updates.bip32Derivation) {
      const bip32Derivation = updates.bip32Derivation.map((deriv: any) => ({
        pubkey: Buffer.from(deriv.pubkey, 'hex'),
        masterFingerprint: Buffer.from(deriv.masterFingerprint, 'hex'),
        path: deriv.path,
      }));
      
      psbt.updateInput(args.inputIndex, { bip32Derivation });
    }

    return {
      psbt: psbt.toHex(),
      base64: psbt.toBase64(),
    };
  } catch (error) {
    throw new Error(`Failed to update PSBT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}