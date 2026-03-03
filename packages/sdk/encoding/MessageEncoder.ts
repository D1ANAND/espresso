/**
 * BMCP Message Encoder
 * Handles encoding/decoding of Bitcoin CCIP messages for OP_RETURN
 */

import { BitcoinCCIPMessage, PROTOCOL_CONSTANTS } from '../types';

export class MessageEncoder {
  /**
   * Encode a CCIP message to bytes for OP_RETURN
   */
  static encode(message: BitcoinCCIPMessage): Buffer {
    const buffers: Buffer[] = [];

    // Protocol ID (2 bytes) - 0x4243 ("BC")
    const protocolId = Buffer.allocUnsafe(2);
    protocolId.writeUInt16BE(message.protocolId);
    buffers.push(protocolId);

    // Version (1 byte)
    buffers.push(Buffer.from([message.version]));

    // Chain Selector (8 bytes)
    const chainSelector = Buffer.allocUnsafe(8);
    chainSelector.writeBigUInt64BE(message.chainSelector);
    buffers.push(chainSelector);

    // Receiver Address (20 bytes)
    const receiver = message.receiver.startsWith('0x')
      ? message.receiver.slice(2)
      : message.receiver;
    if (receiver.length !== 40) {
      throw new Error('Invalid receiver address length');
    }
    buffers.push(Buffer.from(receiver, 'hex'));

    // Data Length (4 bytes)
    const dataLength = Buffer.allocUnsafe(4);
    dataLength.writeUInt32BE(message.data.length);
    buffers.push(dataLength);

    // Data (variable)
    buffers.push(Buffer.from(message.data));

    // Gas Limit (8 bytes)
    const gasLimit = Buffer.allocUnsafe(8);
    gasLimit.writeBigUInt64BE(message.gasLimit);
    buffers.push(gasLimit);

    // Extra Args Length (4 bytes)
    const extraArgsLength = Buffer.allocUnsafe(4);
    extraArgsLength.writeUInt32BE(message.extraArgs.length);
    buffers.push(extraArgsLength);

    // Extra Args (variable)
    if (message.extraArgs.length > 0) {
      buffers.push(Buffer.from(message.extraArgs));
    }

    const encoded = Buffer.concat(buffers);

    // Validate size
    if (encoded.length > PROTOCOL_CONSTANTS.MAX_MESSAGE_SIZE) {
      throw new Error(
        `Message too large: ${encoded.length} bytes (max: ${PROTOCOL_CONSTANTS.MAX_MESSAGE_SIZE})`
      );
    }

    return encoded;
  }

  /**
   * Decode bytes from OP_RETURN to CCIP message
   */
  static decode(data: Buffer): BitcoinCCIPMessage {
    let offset = 0;

    // Protocol ID (2 bytes)
    const protocolId = data.readUInt16BE(offset);
    offset += 2;

    if (protocolId !== PROTOCOL_CONSTANTS.PROTOCOL_ID) {
      throw new Error(`Invalid protocol ID: 0x${protocolId.toString(16)}`);
    }

    // Version (1 byte)
    const version = data.readUInt8(offset);
    offset += 1;

    if (version !== PROTOCOL_CONSTANTS.VERSION_V2) {
      throw new Error(`Unsupported version: 0x${version.toString(16)}`);
    }

    // Chain Selector (8 bytes)
    const chainSelector = data.readBigUInt64BE(offset);
    offset += 8;

    // Receiver Address (20 bytes)
    const receiverBytes = data.subarray(offset, offset + 20);
    const receiver = '0x' + receiverBytes.toString('hex');
    offset += 20;

    // Data Length (4 bytes)
    const dataLength = data.readUInt32BE(offset);
    offset += 4;

    // Data (variable)
    const messageData = data.subarray(offset, offset + dataLength);
    offset += dataLength;

    // Gas Limit (8 bytes)
    const gasLimit = data.readBigUInt64BE(offset);
    offset += 8;

    // Extra Args Length (4 bytes)
    const extraArgsLength = data.readUInt32BE(offset);
    offset += 4;

    // Extra Args (variable)
    const extraArgs =
      extraArgsLength > 0
        ? data.subarray(offset, offset + extraArgsLength)
        : new Uint8Array(0);

    return {
      protocolId,
      version,
      chainSelector,
      receiver,
      data: messageData,
      gasLimit,
      extraArgs,
    };
  }

  /**
   * Encode CCIP extraArgs (v2)
   */
  static encodeExtraArgs(options?: {
    gasLimit?: number;
    allowOutOfOrderExecution?: boolean;
  }): Uint8Array {
    // EVMExtraArgsV2: [gasLimit (32 bytes), allowOutOfOrderExecution (1 byte)]
    const gasLimit = BigInt(options?.gasLimit || 200_000);
    const allowOOO = options?.allowOutOfOrderExecution || false;

    const buffer = Buffer.allocUnsafe(33);
    buffer.writeBigUInt64BE(gasLimit, 0);
    buffer.writeUInt8(allowOOO ? 1 : 0, 32);

    return new Uint8Array(buffer);
  }

  /**
   * Create OP_RETURN script
   */
  static createOPReturnScript(messageBytes: Buffer): string {
    // OP_RETURN (0x6a) + PUSHDATA
    if (messageBytes.length <= 75) {
      // Direct push (OP_PUSHDATA)
      return '6a' + messageBytes.length.toString(16).padStart(2, '0') + messageBytes.toString('hex');
    } else if (messageBytes.length <= 255) {
      // OP_PUSHDATA1
      return '6a4c' + messageBytes.length.toString(16).padStart(2, '0') + messageBytes.toString('hex');
    } else if (messageBytes.length <= 65535) {
      // OP_PUSHDATA2
      const lengthHex = messageBytes.length.toString(16).padStart(4, '0');
      // Little-endian
      const lengthLE = lengthHex.slice(2, 4) + lengthHex.slice(0, 2);
      return '6a4d' + lengthLE + messageBytes.toString('hex');
    } else {
      // OP_PUSHDATA4 (for very large messages)
      const lengthHex = messageBytes.length.toString(16).padStart(8, '0');
      // Little-endian
      const lengthLE =
        lengthHex.slice(6, 8) +
        lengthHex.slice(4, 6) +
        lengthHex.slice(2, 4) +
        lengthHex.slice(0, 2);
      return '6a4e' + lengthLE + messageBytes.toString('hex');
    }
  }

  /**
   * Parse OP_RETURN script to get message bytes
   */
  static parseOPReturnScript(scriptHex: string): Buffer | null {
    if (!scriptHex.startsWith('6a')) {
      return null; // Not OP_RETURN
    }

    let offset = 2; // Skip OP_RETURN (0x6a)
    const opcode = scriptHex.slice(offset, offset + 2);
    offset += 2;

    let dataLength: number;

    if (opcode === '4c') {
      // OP_PUSHDATA1
      dataLength = parseInt(scriptHex.slice(offset, offset + 2), 16);
      offset += 2;
    } else if (opcode === '4d') {
      // OP_PUSHDATA2 (little-endian)
      const lengthHex = scriptHex.slice(offset, offset + 4);
      dataLength = parseInt(lengthHex.slice(2, 4) + lengthHex.slice(0, 2), 16);
      offset += 4;
    } else if (opcode === '4e') {
      // OP_PUSHDATA4 (little-endian)
      const lengthHex = scriptHex.slice(offset, offset + 8);
      dataLength = parseInt(
        lengthHex.slice(6, 8) +
          lengthHex.slice(4, 6) +
          lengthHex.slice(2, 4) +
          lengthHex.slice(0, 2),
        16
      );
      offset += 8;
    } else {
      // Direct push (length is in the opcode itself)
      dataLength = parseInt(opcode, 16);
      offset -= 2; // We already read it as opcode
    }

    const dataHex = scriptHex.slice(offset, offset + dataLength * 2);
    return Buffer.from(dataHex, 'hex');
  }

  /**
   * Validate message structure
   */
  static validate(message: BitcoinCCIPMessage): boolean {
    if (message.protocolId !== PROTOCOL_CONSTANTS.PROTOCOL_ID) {
      return false;
    }
    if (message.version !== PROTOCOL_CONSTANTS.VERSION_V2) {
      return false;
    }
    if (!message.receiver || message.receiver.length !== 42) {
      return false;
    }
    if (message.gasLimit < 21000n) {
      return false;
    }
    return true;
  }
}

