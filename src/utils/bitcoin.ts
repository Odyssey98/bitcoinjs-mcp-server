import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';
import BIP32Factory from 'bip32';
import { NetworkConfig } from '../types/index.js';

// Initialize ECC library
bitcoin.initEccLib(ecc);

// Initialize ECPair and BIP32 factories
export const ECPair = ECPairFactory(ecc);
export const BIP32 = BIP32Factory(ecc);

export const networks = {
  mainnet: bitcoin.networks.bitcoin,
  testnet: bitcoin.networks.testnet,
  regtest: bitcoin.networks.regtest,
};

export function getNetworkConfig(networkName: string): bitcoin.Network {
  switch (networkName.toLowerCase()) {
    case 'mainnet':
      return networks.mainnet;
    case 'testnet':
      return networks.testnet;
    case 'regtest':
      return networks.regtest;
    default:
      throw new Error(`Unsupported network: ${networkName}`);
  }
}

export function validateNetwork(network: string): boolean {
  return ['mainnet', 'testnet', 'regtest'].includes(network.toLowerCase());
}

export function isValidHex(hex: string): boolean {
  return /^[0-9a-fA-F]*$/.test(hex) && hex.length % 2 === 0;
}

export function isValidAddress(address: string, network?: bitcoin.Network): boolean {
  try {
    if (network) {
      bitcoin.address.toOutputScript(address, network);
    } else {
      // Try all networks
      for (const net of Object.values(networks)) {
        try {
          bitcoin.address.toOutputScript(address, net);
          return true;
        } catch {
          continue;
        }
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function formatSatoshis(satoshis: number, unit: 'BTC' | 'mBTC' | 'sat' = 'BTC'): string {
  switch (unit) {
    case 'BTC':
      return (satoshis / 100000000).toFixed(8) + ' BTC';
    case 'mBTC':
      return (satoshis / 100000).toFixed(5) + ' mBTC';
    case 'sat':
      return satoshis + ' sat';
    default:
      return satoshis.toString();
  }
}

export function parseBTCAmount(amount: string): number {
  const cleanAmount = amount.replace(/[^\d.]/g, '');
  const btcAmount = parseFloat(cleanAmount);
  if (isNaN(btcAmount)) {
    throw new Error('Invalid BTC amount');
  }
  return Math.round(btcAmount * 100000000); // Convert to satoshis
}

export function estimateTransactionSize(inputs: number, outputs: number, hasWitness: boolean = false): number {
  // Base size calculation
  const baseSize = 10; // version (4) + input count (1-9) + output count (1-9) + locktime (4)
  const inputSize = hasWitness ? 41 : 148; // Witness inputs are smaller
  const outputSize = 34;
  
  const size = baseSize + (inputs * inputSize) + (outputs * outputSize);
  
  if (hasWitness) {
    // Add witness overhead
    const witnessSize = inputs * 107; // Average witness size
    return size + Math.ceil(witnessSize / 4); // Witness discount
  }
  
  return size;
}