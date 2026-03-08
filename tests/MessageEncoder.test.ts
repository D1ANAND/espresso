/**
 * Tests for MessageEncoder
 */

import { MessageEncoder, BitcoinCCIPMessage, PROTOCOL_CONSTANTS, CHAIN_SELECTORS } from '@bmcp/sdk';

describe('MessageEncoder', () => {
  const validMessage: BitcoinCCIPMessage = {
    protocolId: PROTOCOL_CONSTANTS.PROTOCOL_ID,
    version: PROTOCOL_CONSTANTS.VERSION_V2,
    chainSelector: CHAIN_SELECTORS.BASE,
    receiver: '0x1234567890123456789012345678901234567890',
    data: new Uint8Array([1, 2, 3, 4, 5]),
    gasLimit: BigInt(200_000),
    extraArgs: new Uint8Array([]),
  };

  describe('encode', () => {
    it('should encode a valid message', () => {
      const encoded = MessageEncoder.encode(validMessage);
      expect(encoded).toBeInstanceOf(Buffer);
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should encode protocol ID correctly', () => {
      const encoded = MessageEncoder.encode(validMessage);
      expect(encoded.readUInt16BE(0)).toBe(PROTOCOL_CONSTANTS.PROTOCOL_ID);
    });

    it('should encode version correctly', () => {
      const encoded = MessageEncoder.encode(validMessage);
      expect(encoded.readUInt8(2)).toBe(PROTOCOL_CONSTANTS.VERSION_V2);
    });

    it('should throw on message too large', () => {
      const largeMessage = {
        ...validMessage,
        data: new Uint8Array(PROTOCOL_CONSTANTS.MAX_MESSAGE_SIZE + 1),
      };
      expect(() => MessageEncoder.encode(largeMessage)).toThrow();
    });
  });

  describe('decode', () => {
    it('should decode an encoded message', () => {
      const encoded = MessageEncoder.encode(validMessage);
      const decoded = MessageEncoder.decode(encoded);

      expect(decoded.protocolId).toBe(validMessage.protocolId);
      expect(decoded.version).toBe(validMessage.version);
      expect(decoded.chainSelector).toBe(validMessage.chainSelector);
      expect(decoded.receiver).toBe(validMessage.receiver);
      expect(decoded.gasLimit).toBe(validMessage.gasLimit);
    });

    it('should throw on invalid protocol ID', () => {
      const encoded = MessageEncoder.encode(validMessage);
      encoded.writeUInt16BE(0xFFFF, 0); // Invalid protocol ID
      expect(() => MessageEncoder.decode(encoded)).toThrow('Invalid protocol ID');
    });

    it('should throw on invalid version', () => {
      const encoded = MessageEncoder.encode(validMessage);
      encoded.writeUInt8(0xFF, 2); // Invalid version
      expect(() => MessageEncoder.decode(encoded)).toThrow('Unsupported version');
    });
  });

  describe('encode/decode round-trip', () => {
    it('should preserve message data', () => {
      const message = {
        ...validMessage,
        data: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      };

      const encoded = MessageEncoder.encode(message);
      const decoded = MessageEncoder.decode(encoded);

      expect(decoded.data).toEqual(message.data);
    });

    it('should handle large messages', () => {
      const largeData = new Uint8Array(50_000);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256;
      }

      const message = {
        ...validMessage,
        data: largeData,
      };

      const encoded = MessageEncoder.encode(message);
      const decoded = MessageEncoder.decode(encoded);

      expect(decoded.data).toEqual(message.data);
    });
  });

  describe('createOPReturnScript', () => {
    it('should create valid OP_RETURN script for small data', () => {
      const data = Buffer.from([1, 2, 3, 4, 5]);
      const script = MessageEncoder.createOPReturnScript(data);
      expect(script).toMatch(/^6a/); // Starts with OP_RETURN
    });

    it('should create valid OP_RETURN script for large data', () => {
      const data = Buffer.alloc(1000);
      const script = MessageEncoder.createOPReturnScript(data);
      expect(script).toMatch(/^6a/);
    });
  });

  describe('parseOPReturnScript', () => {
    it('should parse OP_RETURN script', () => {
      const originalData = Buffer.from([1, 2, 3, 4, 5]);
      const script = MessageEncoder.createOPReturnScript(originalData);
      const parsed = MessageEncoder.parseOPReturnScript(script);

      expect(parsed).toEqual(originalData);
    });

    it('should return null for non-OP_RETURN script', () => {
      const script = '76a914...'; // Not OP_RETURN
      const parsed = MessageEncoder.parseOPReturnScript(script);
      expect(parsed).toBeNull();
    });
  });

  describe('validate', () => {
    it('should validate correct message', () => {
      expect(MessageEncoder.validate(validMessage)).toBe(true);
    });

    it('should reject invalid protocol ID', () => {
      const invalid = { ...validMessage, protocolId: 0xFFFF };
      expect(MessageEncoder.validate(invalid)).toBe(false);
    });

    it('should reject invalid version', () => {
      const invalid = { ...validMessage, version: 0xFF };
      expect(MessageEncoder.validate(invalid)).toBe(false);
    });

    it('should reject invalid receiver', () => {
      const invalid = { ...validMessage, receiver: 'invalid' };
      expect(MessageEncoder.validate(invalid)).toBe(false);
    });

    it('should reject gas limit too low', () => {
      const invalid = { ...validMessage, gasLimit: BigInt(1000) };
      expect(MessageEncoder.validate(invalid)).toBe(false);
    });
  });
});

