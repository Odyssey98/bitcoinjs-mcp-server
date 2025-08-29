export interface AddressInfo {
  address: string;
  type: 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr';
  network: 'mainnet' | 'testnet' | 'regtest';
  script?: string;
  redeemScript?: string;
  witnessScript?: string;
}

export interface KeyPair {
  privateKey: string;
  publicKey: string;
  wif?: string;
  compressed: boolean;
}

export interface TransactionInput {
  txid: string;
  vout: number;
  scriptSig?: string;
  sequence?: number;
  witness?: string[];
  amount?: number;
}

export interface TransactionOutput {
  address?: string;
  script?: string;
  amount: number;
}

export interface TransactionInfo {
  txid: string;
  version: number;
  locktime: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  size: number;
  weight: number;
  vsize: number;
  hex: string;
}

export interface PSBTInfo {
  version: number;
  inputs: any[];
  outputs: any[];
  globalMap: Record<string, any>;
  tx: TransactionInfo;
}

export interface NetworkConfig {
  name: 'mainnet' | 'testnet' | 'regtest';
  messagePrefix: string;
  bech32: string;
  bip32: {
    public: number;
    private: number;
  };
  pubKeyHash: number;
  scriptHash: number;
  wif: number;
}

export interface ScriptInfo {
  type: string;
  hex: string;
  asm: string;
  addresses?: string[];
  p2sh?: string;
  p2wsh?: string;
}

export interface MultisigInfo {
  m: number;
  n: number;
  publicKeys: string[];
  redeemScript: string;
  address: string;
  witnessScript?: string;
  p2wsh?: string;
}