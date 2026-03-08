/**
 * Tests for EVMCommandEncoder
 */

import { describe, it, expect } from '@jest/globals';
import { EVMCommandEncoder, CommonFunctions, EVM_CHAINS } from '../packages/sdk/evm';
import { ethers } from 'ethers';

describe('EVMCommandEncoder', () => {
  describe('Function Encoding', () => {
    it('should encode a simple function call', () => {
      const calldata = EVMCommandEncoder.encodeFunction(
        'function onReport(string msg)',
        'onReport',
        ['Hello World']
      );

      expect(calldata).toMatch(/^0x[0-9a-f]+$/i);
      expect(calldata.slice(0, 10)).toBe('0xe5d5b962'); // onReport selector
    });

    it('should encode ERC20 transfer', () => {
      const calldata = CommonFunctions.encodeTransfer(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        ethers.parseUnits('100', 6)
      );

      expect(calldata.slice(0, 10)).toBe('0xa9059cbb'); // transfer selector
    });

    it('should encode ERC20 approve', () => {
      const calldata = CommonFunctions.encodeApprove(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        ethers.parseUnits('1000', 18)
      );

      expect(calldata.slice(0, 10)).toBe('0x095ea7b3'); // approve selector
    });

    it('should get function selector', () => {
      const selector = EVMCommandEncoder.getFunctionSelector('transfer(address,uint256)');
      expect(selector).toBe('0xa9059cbb');
    });
  });

  describe('Function Decoding', () => {
    it('should decode ERC20 transfer', () => {
      const encoded = CommonFunctions.encodeTransfer(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        100000000n
      );

      const decoded = CommonFunctions.decodeTransfer(encoded);

      expect(decoded.to).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
      expect(decoded.amount).toBe(100000000n);
    });

    it('should decode message function', () => {
      const encoded = CommonFunctions.encodeMessage('onReport(string)', 'Test Message');
      const decoded = CommonFunctions.decodeMessage('onReport(string)', encoded);

      expect(decoded[0]).toBe('Test Message');
    });
  });

  describe('Command Building', () => {
    it('should build a command with defaults', () => {
      const cmd = EVMCommandEncoder.buildCommand(
        '0x1234567890123456789012345678901234567890',
        '0xabcd'
      );

      expect(cmd.target).toBe('0x1234567890123456789012345678901234567890');
      expect(cmd.data).toBe('0xabcd');
      expect(cmd.value).toBe(0n);
      expect(cmd.nonce).toBe(0n);
      expect(cmd.chainId).toBe(1n); // defaults to mainnet
    });

    it('should build command with chain key', () => {
      const cmd = EVMCommandEncoder.buildCommand(
        '0x1234567890123456789012345678901234567890',
        '0xabcd',
        { chainKey: 'SEPOLIA' }
      );

      expect(cmd.chainId).toBe(11155111n);
    });

    it('should build command with custom options', () => {
      const cmd = EVMCommandEncoder.buildCommand(
        '0x1234567890123456789012345678901234567890',
        '0xabcd',
        {
          value: 1000n,
          nonce: 42n,
          deadline: 9999999n,
          chainId: 8453n,
        }
      );

      expect(cmd.value).toBe(1000n);
      expect(cmd.nonce).toBe(42n);
      expect(cmd.deadline).toBe(9999999n);
      expect(cmd.chainId).toBe(8453n);
    });
  });

  describe('Command Hashing', () => {
    it('should hash command without pubkey', () => {
      const cmd = EVMCommandEncoder.buildCommand(
        '0x1234567890123456789012345678901234567890',
        '0xabcd'
      );

      const hash = EVMCommandEncoder.hashCommand(cmd);

      expect(hash).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    it('should hash command with pubkey', () => {
      const cmd = EVMCommandEncoder.buildCommand(
        '0x1234567890123456789012345678901234567890',
        '0xabcd'
      );

      const pubKeyX = '0x' + '1234'.repeat(16);
      const hash = EVMCommandEncoder.hashCommand(cmd, pubKeyX);

      expect(hash).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    it('should produce different hashes for different nonces', () => {
      const cmd1 = EVMCommandEncoder.buildCommand('0x1234567890123456789012345678901234567890', '0xabcd', {
        nonce: 0n,
      });

      const cmd2 = EVMCommandEncoder.buildCommand('0x1234567890123456789012345678901234567890', '0xabcd', {
        nonce: 1n,
      });

      const hash1 = EVMCommandEncoder.hashCommand(cmd1);
      const hash2 = EVMCommandEncoder.hashCommand(cmd2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Bitcoin Encoding/Decoding', () => {
    it('should encode for Bitcoin OP_RETURN', () => {
      const signedCmd = {
        target: '0x1234567890123456789012345678901234567890',
        value: 0n,
        data: '0xabcd',
        nonce: 0n,
        deadline: 9999999n,
        chainId: 11155111n,
        pubKeyX: '0x' + '1234'.repeat(16),
        signature: '0x' + 'abcd'.repeat(32),
      };

      const encoded = EVMCommandEncoder.encodeForBitcoin(signedCmd);

      expect(Buffer.isBuffer(encoded)).toBe(true);
      expect(encoded.length).toBeGreaterThan(0);

      const json = JSON.parse(encoded.toString('utf8'));
      expect(json.protocol).toBe('BMCP');
      expect(json.version).toBe(1);
    });

    it('should decode from Bitcoin OP_RETURN', () => {
      const signedCmd = {
        target: '0x1234567890123456789012345678901234567890',
        value: 0n,
        data: '0xabcd',
        nonce: 42n,
        deadline: 9999999n,
        chainId: 11155111n,
        pubKeyX: '0x' + '1234'.repeat(16),
        signature: '0x' + 'abcd'.repeat(32),
      };

      const encoded = EVMCommandEncoder.encodeForBitcoin(signedCmd);
      const decoded = EVMCommandEncoder.decodeFromBitcoin(encoded);

      expect(decoded.protocol).toBe('BMCP');
      expect(decoded.version).toBe(1);
      expect(decoded.chainKey).toBe('SEPOLIA');
      expect(decoded.command.target).toBe(signedCmd.target);
      expect(decoded.command.nonce).toBe(42n);
      expect(decoded.command.pubKeyX).toBe(signedCmd.pubKeyX);
    });
  });

  describe('Command Validation', () => {
    it('should validate a valid command', () => {
      const cmd = EVMCommandEncoder.buildCommand(
        '0x1234567890123456789012345678901234567890',
        CommonFunctions.encodeTransfer('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 100n),
        {
          deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
        }
      );

      const result = EVMCommandEncoder.validateCommand(cmd);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid address', () => {
      const cmd = EVMCommandEncoder.buildCommand('invalid_address', '0xabcd');

      const result = EVMCommandEncoder.validateCommand(cmd);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid target address');
    });

    it('should reject expired deadline', () => {
      const cmd = EVMCommandEncoder.buildCommand(
        '0x1234567890123456789012345678901234567890',
        '0xabcd1234',
        {
          deadline: 0n,
        }
      );

      const result = EVMCommandEncoder.validateCommand(cmd);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deadline has passed');
    });
  });

  describe('Chain Information', () => {
    it('should get chain info by ID', () => {
      const chain = EVMCommandEncoder.getChainInfo(11155111n);

      expect(chain?.name).toBe('Sepolia');
      expect(chain?.chainId).toBe(11155111n);
    });

    it('should get chain by selector', () => {
      const chain = EVMCommandEncoder.getChainBySelector(BigInt('15971525489660198786'));

      expect(chain?.name).toBe('Base');
      expect(chain?.chainId).toBe(8453n);
    });

    it('should return null for unknown chain ID', () => {
      const chain = EVMCommandEncoder.getChainInfo(99999999n);

      expect(chain).toBeNull();
    });

    it('should have all required chain properties', () => {
      Object.values(EVM_CHAINS).forEach((chain) => {
        expect(chain.name).toBeDefined();
        expect(chain.chainId).toBeDefined();
        expect(chain.chainSelector).toBeDefined();
        expect(chain.rpcUrl).toBeDefined();
      });
    });
  });
});

