import { handleUtilityTool } from '../src/tools/utility.js';

describe('Utility Tools', () => {
  describe('generate_keypair', () => {
    it('should generate compressed keypair by default', async () => {
      const result = await handleUtilityTool('generate_keypair', {
        network: 'testnet',
      });

      expect(result.compressed).toBe(true);
      expect(result.privateKey).toMatch(/^[0-9a-f]{64}$/);
      expect(result.publicKey).toMatch(/^[0-9a-f]{66}$/); // 33 bytes = 66 hex chars for compressed
      expect(result.wif).toBeDefined();
    });

    it('should generate uncompressed keypair when specified', async () => {
      const result = await handleUtilityTool('generate_keypair', {
        network: 'testnet',
        compressed: false,
      });

      expect(result.compressed).toBe(false);
      expect(result.publicKey).toMatch(/^[0-9a-f]{130}$/); // 65 bytes = 130 hex chars for uncompressed
    });
  });

  describe('create_multisig', () => {
    it('should create 2-of-3 multisig', async () => {
      const publicKeys = [
        '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9388',
        '03389ffce9cd9ae88dcc0631e88a821ffdbe9bfe26381143ffdb63a3e2369b4e1df7',
        '02d20b322326f8b02f9e82c4ef3a0a7d88c2e80b11e6c93a98b0c3a6f7e5a1f2d6e',
      ];

      const result = await handleUtilityTool('create_multisig', {
        m: 2,
        publicKeys,
        network: 'testnet',
        addressType: 'p2sh',
      });

      expect(result.m).toBe(2);
      expect(result.n).toBe(3);
      expect(result.publicKeys).toEqual(publicKeys);
      expect(result.address).toMatch(/^2[a-zA-Z0-9]{25,34}$/); // Testnet P2SH format
      expect(result.redeemScript).toBeDefined();
    });

    it('should throw error for invalid m value', async () => {
      await expect(
        handleUtilityTool('create_multisig', {
          m: 0,
          publicKeys: ['02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9388'],
          network: 'testnet',
        })
      ).rejects.toThrow('Invalid m value');
    });
  });

  describe('hash_message', () => {
    it('should compute SHA256 hash', async () => {
      const result = await handleUtilityTool('hash_message', {
        message: 'Hello Bitcoin',
        hashType: 'sha256',
      });

      expect(result.hashType).toBe('sha256');
      expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(result.hash).toBe('185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969');
    });

    it('should compute HASH160', async () => {
      const result = await handleUtilityTool('hash_message', {
        message: 'Hello Bitcoin',
        hashType: 'hash160',
      });

      expect(result.hashType).toBe('hash160');
      expect(result.hash).toMatch(/^[0-9a-f]{40}$/);
    });

    it('should handle hex input', async () => {
      const result = await handleUtilityTool('hash_message', {
        message: '48656c6c6f20426974636f696e', // "Hello Bitcoin" in hex
        hashType: 'sha256',
        encoding: 'hex',
      });

      expect(result.hash).toBe('185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969');
    });
  });

  describe('compile_script', () => {
    it('should compile multisig script', async () => {
      const publicKeys = [
        '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9388',
        '03389ffce9cd9ae88dcc0631e88a821ffdbe9bfe26381143ffdb63a3e2369b4e1df7',
      ];

      const result = await handleUtilityTool('compile_script', {
        scriptType: 'multisig',
        multisigConfig: { m: 2, publicKeys },
        network: 'testnet',
      });

      expect(result.type).toBe('multisig');
      expect(result.hex).toBeDefined();
      expect(result.asm).toContain('OP_2');
      expect(result.asm).toContain('OP_2');
      expect(result.asm).toContain('OP_CHECKMULTISIG');
      expect(result.p2sh).toBeDefined();
      expect(result.p2wsh).toBeDefined();
    });

    it('should compile from ASM', async () => {
      const result = await handleUtilityTool('compile_script', {
        scriptAsm: 'OP_DUP OP_HASH160 6f1a4b2e8c4e7a5b3e4c6f7a8b9c0d1e2f3a4b5c OP_EQUALVERIFY OP_CHECKSIG',
      });

      expect(result.type).toBe('custom');
      expect(result.hex).toBeDefined();
      expect(result.asm).toBe('OP_DUP OP_HASH160 6f1a4b2e8c4e7a5b3e4c6f7a8b9c0d1e2f3a4b5c OP_EQUALVERIFY OP_CHECKSIG');
    });

    it('should create OP_RETURN script', async () => {
      const result = await handleUtilityTool('compile_script', {
        scriptType: 'nulldata',
        data: '48656c6c6f20426974636f696e', // "Hello Bitcoin" in hex
      });

      expect(result.type).toBe('nulldata');
      expect(result.hex).toBeDefined();
      expect(result.asm).toContain('OP_RETURN');
    });

    it('should throw error for oversized OP_RETURN', async () => {
      const largeData = 'a'.repeat(162); // 81 bytes in hex = 162 chars
      
      await expect(
        handleUtilityTool('compile_script', {
          scriptType: 'nulldata',
          data: largeData,
        })
      ).rejects.toThrow('OP_RETURN data too large');
    });
  });
});