import { handleAddressTool } from '../src/tools/address.js';

describe('Address Tools', () => {
  describe('generate_address', () => {
    it('should generate P2PKH address', async () => {
      const result = await handleAddressTool('generate_address', {
        type: 'p2pkh',
        network: 'testnet',
      });

      expect(result.type).toBe('p2pkh');
      expect(result.network).toBe('testnet');
      expect(result.address).toMatch(/^[mn2][a-zA-Z0-9]{25,34}$/); // Testnet P2PKH format
      expect(result.script).toBeDefined();
    });

    it('should generate P2WPKH address', async () => {
      const result = await handleAddressTool('generate_address', {
        type: 'p2wpkh',
        network: 'testnet',
      });

      expect(result.type).toBe('p2wpkh');
      expect(result.network).toBe('testnet');
      expect(result.address).toMatch(/^tb1[a-zA-Z0-9]{10,87}$/); // Testnet bech32 format
    });

    it('should generate Taproot address', async () => {
      const result = await handleAddressTool('generate_address', {
        type: 'p2tr',
        network: 'testnet',
      });

      expect(result.type).toBe('p2tr');
      expect(result.network).toBe('testnet');
      expect(result.address).toMatch(/^tb1p[a-zA-Z0-9]{58}$/); // Testnet Taproot format
    });

    it('should throw error for invalid network', async () => {
      await expect(
        handleAddressTool('generate_address', {
          type: 'p2pkh',
          network: 'invalid',
        })
      ).rejects.toThrow('Invalid network: invalid');
    });
  });

  describe('validate_address', () => {
    it('should validate testnet P2PKH address', async () => {
      const result = await handleAddressTool('validate_address', {
        address: 'mzBc4XEFSdzCDcTxAgf6EZXgsZWpztRhef',
        network: 'testnet',
      });

      expect(result.valid).toBe(true);
      expect(result.network).toBe('testnet');
      expect(result.type).toBe('p2pkh');
    });

    it('should detect invalid address', async () => {
      const result = await handleAddressTool('validate_address', {
        address: 'invalid_address',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('decode_address', () => {
    it('should decode P2PKH address', async () => {
      const result = await handleAddressTool('decode_address', {
        address: 'mzBc4XEFSdzCDcTxAgf6EZXgsZWpztRhef',
        network: 'testnet',
      });

      expect(result.address).toBe('mzBc4XEFSdzCDcTxAgf6EZXgsZWpztRhef');
      expect(result.network).toBe('testnet');
      expect(result.type).toBe('p2pkh');
      expect(result.script).toBeDefined();
      expect(result.scriptAsm).toBeDefined();
    });
  });
});