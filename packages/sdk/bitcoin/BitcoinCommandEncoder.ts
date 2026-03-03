/**
 * BitcoinCommandEncoder
 * Encodes commands for Bitcoin OP_RETURN that will be executed on EVM chains
 */

import { ethers } from 'ethers';

/**
 * Chain selector mapping for EVM chains
 */
export const CHAIN_SELECTORS = {
  SEPOLIA: BigInt('16015286601757825753'),
  BASE: BigInt('15971525489660198786'),
  BASE_SEPOLIA: BigInt('10344971235874465080'),
  POLYGON: BigInt('4051577828743386545'),
  POLYGON_AMOY: BigInt('16281711391670634445'),
  ARBITRUM: BigInt('4949039107694359620'),
  OPTIMISM: BigInt('3734403246176062136'),
  CITREA: BigInt('0x4349545245410000'),
  CITREA_TESTNET: BigInt('0x4349545245415400'),
} as const;

export type ChainName = keyof typeof CHAIN_SELECTORS;

/**
 * Bitcoin command payload for OP_RETURN
 */
export interface BitcoinOPReturnPayload {
  /** Protocol identifier */
  protocol: string;
  /** Protocol version */
  version: number;
  /** Target EVM chain selector */
  chainSelector: string;
  /** Target contract address */
  contract: string;
  /** Encoded function call data */
  data: string;
  /** Nonce for replay protection */
  nonce?: number;
  /** Deadline (unix timestamp) */
  deadline?: number;
  /** Bitcoin address (sender identifier) */
  btcAddress?: string;
  /** Optional signature */
  signature?: string;
  /** Optional Bitcoin pubkey X-coordinate */
  pubKeyX?: string;
}

/**
 * Compact binary format for OP_RETURN
 */
export interface CompactPayload {
  /** Protocol ID (2 bytes): 0x424D = "BM" */
  protocolId: Buffer;
  /** Version (1 byte) */
  version: Buffer;
  /** Chain selector (8 bytes) */
  chainSelector: Buffer;
  /** Contract address (20 bytes) */
  contract: Buffer;
  /** Data length (2 bytes) */
  dataLength: Buffer;
  /** Function call data (variable) */
  data: Buffer;
  /** Nonce (4 bytes, optional) */
  nonce?: Buffer;
  /** Deadline (4 bytes, optional) */
  deadline?: Buffer;
}

/**
 * Function call parameters
 */
export interface FunctionCall {
  /** Function signature (e.g., "transfer(address,uint256)") */
  signature: string;
  /** Function arguments */
  args: any[];
}

/**
 * Bitcoin Command Encoder for OP_RETURN
 */
export class BitcoinCommandEncoder {
  private static readonly PROTOCOL_ID = 'BMCP';
  private static readonly PROTOCOL_MAGIC = 0x424d4350; // "BMCP" in hex
  private static readonly VERSION = 1;
  private static readonly MAX_OP_RETURN_SIZE = 80000; // 80KB safe limit

  /**
   * Encode a complete command for Bitcoin OP_RETURN (JSON format)
   */
  static encodeJSON(
    chain: ChainName | bigint,
    contract: string,
    functionCall: FunctionCall,
    options: {
      nonce?: number;
      deadline?: number;
      btcAddress?: string;
      signature?: string;
      pubKeyX?: string;
    } = {}
  ): string {
    // Get chain selector
    const chainSelector =
      typeof chain === 'bigint' ? chain : CHAIN_SELECTORS[chain];

    // Encode function call
    const iface = new ethers.Interface([`function ${functionCall.signature}`]);
    const functionName = functionCall.signature.split('(')[0];
    const data = iface.encodeFunctionData(functionName, functionCall.args);

    // Build payload
    const payload: BitcoinOPReturnPayload = {
      protocol: this.PROTOCOL_ID,
      version: this.VERSION,
      chainSelector: chainSelector.toString(),
      contract: contract.toLowerCase(),
      data,
      ...(options.nonce !== undefined && { nonce: options.nonce }),
      ...(options.deadline !== undefined && { deadline: options.deadline }),
      ...(options.btcAddress && { btcAddress: options.btcAddress }),
      ...(options.signature && { signature: options.signature }),
      ...(options.pubKeyX && { pubKeyX: options.pubKeyX }),
    };

    return JSON.stringify(payload);
  }

  /**
   * Encode in compact binary format (more space-efficient)
   */
  static encodeBinary(
    chain: ChainName | bigint,
    contract: string,
    functionCall: FunctionCall,
    options: {
      nonce?: number;
      deadline?: number;
    } = {}
  ): Buffer {
    // Get chain selector
    const chainSelector =
      typeof chain === 'bigint' ? chain : CHAIN_SELECTORS[chain];

    // Encode function call
    const iface = new ethers.Interface([`function ${functionCall.signature}`]);
    const functionName = functionCall.signature.split('(')[0];
    const data = iface.encodeFunctionData(functionName, functionCall.args);

    // Build compact payload
    const parts: Buffer[] = [];

    // Protocol Magic (4 bytes): 0x424D4350 = "BMCP"
    const magicBuf = Buffer.alloc(4);
    magicBuf.writeUInt32BE(this.PROTOCOL_MAGIC);
    parts.push(magicBuf);

    // Version (1 byte)
    parts.push(Buffer.from([this.VERSION]));

    // Chain selector (8 bytes, big-endian)
    const selectorBuf = Buffer.alloc(8);
    selectorBuf.writeBigUInt64BE(chainSelector);
    parts.push(selectorBuf);

    // Contract address (20 bytes)
    const contractBuf = Buffer.from(contract.slice(2), 'hex');
    parts.push(contractBuf);

    // Data
    const dataBuf = Buffer.from(data.slice(2), 'hex');
    
    // Data length (2 bytes)
    const lengthBuf = Buffer.alloc(2);
    lengthBuf.writeUInt16BE(dataBuf.length);
    parts.push(lengthBuf);
    
    // Data itself
    parts.push(dataBuf);

    // Optional: Nonce (4 bytes)
    if (options.nonce !== undefined) {
      const nonceBuf = Buffer.alloc(4);
      nonceBuf.writeUInt32BE(options.nonce);
      parts.push(nonceBuf);
    }

    // Optional: Deadline (4 bytes, unix timestamp)
    if (options.deadline !== undefined) {
      const deadlineBuf = Buffer.alloc(4);
      deadlineBuf.writeUInt32BE(options.deadline);
      parts.push(deadlineBuf);
    }

    const result = Buffer.concat(parts);

    // Check size
    if (result.length > this.MAX_OP_RETURN_SIZE) {
      throw new Error(
        `Payload too large: ${result.length} bytes (max: ${this.MAX_OP_RETURN_SIZE})`
      );
    }

    return result;
  }

  /**
   * Decode JSON payload from OP_RETURN
   */
  static decodeJSON(opReturnData: string | Buffer): BitcoinOPReturnPayload {
    const jsonStr =
      typeof opReturnData === 'string'
        ? opReturnData
        : opReturnData.toString('utf8');

    return JSON.parse(jsonStr);
  }

  /**
   * Decode binary payload from OP_RETURN
   */
  static decodeBinary(buffer: Buffer): {
    protocol: string;
    protocolMagic: number;
    version: number;
    chainSelector: bigint;
    contract: string;
    data: string;
    nonce?: number;
    deadline?: number;
  } {
    let offset = 0;

    // Protocol Magic (4 bytes)
    const protocolMagic = buffer.readUInt32BE(offset);
    offset += 4;

    // Convert magic to ASCII for display
    const protocol = Buffer.from([
      (protocolMagic >> 24) & 0xff,
      (protocolMagic >> 16) & 0xff,
      (protocolMagic >> 8) & 0xff,
      protocolMagic & 0xff,
    ]).toString('ascii');

    // Version (1 byte)
    const version = buffer[offset];
    offset += 1;

    // Chain selector (8 bytes)
    const chainSelector = buffer.readBigUInt64BE(offset);
    offset += 8;

    // Contract address (20 bytes)
    const contract = '0x' + buffer.slice(offset, offset + 20).toString('hex');
    offset += 20;

    // Data length (2 bytes)
    const dataLength = buffer.readUInt16BE(offset);
    offset += 2;

    // Data
    const data = '0x' + buffer.slice(offset, offset + dataLength).toString('hex');
    offset += dataLength;

    // Optional fields
    let nonce: number | undefined;
    let deadline: number | undefined;

    if (offset < buffer.length) {
      // Nonce (4 bytes)
      nonce = buffer.readUInt32BE(offset);
      offset += 4;
    }

    if (offset < buffer.length) {
      // Deadline (4 bytes)
      deadline = buffer.readUInt32BE(offset);
      offset += 4;
    }

    return {
      protocol,
      protocolMagic,
      version,
      chainSelector,
      contract,
      data,
      nonce,
      deadline,
    };
  }

  static dumbBMCPMessage(): boolean {
    return true;
  }
  /**
   * Check if buffer starts with BMCP protocol magic
   */
  static isBMCPMessage(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;
    const magic = buffer.readUInt32BE(0);
    return magic === this.PROTOCOL_MAGIC;
  }

  /**
   * Get protocol magic bytes
   */
  static getProtocolMagic(): Buffer {
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(this.PROTOCOL_MAGIC);
    return buf;
  }

  /**
   * Encode function with parameters
   */
  static encodeFunction(
    signature: string,
    args: any[]
  ): { selector: string; calldata: string } {
    const iface = new ethers.Interface([`function ${signature}`]);
    const functionName = signature.split('(')[0];
    const calldata = iface.encodeFunctionData(functionName, args);

    return {
      selector: calldata.slice(0, 10),
      calldata,
    };
  }

  /**
   * Get chain name from selector
   */
  static getChainName(selector: bigint): ChainName | null {
    for (const [name, sel] of Object.entries(CHAIN_SELECTORS)) {
      if (sel === selector) {
        return name as ChainName;
      }
    }
    return null;
  }

  /**
   * Estimate OP_RETURN size
   */
  static estimateSize(
    chain: ChainName | bigint,
    contract: string,
    functionCall: FunctionCall,
    format: 'json' | 'binary' = 'json'
  ): number {
    if (format === 'json') {
      const json = this.encodeJSON(chain, contract, functionCall);
      return Buffer.from(json).length;
    } else {
      const binary = this.encodeBinary(chain, contract, functionCall);
      return binary.length;
    }
  }

  /**
   * Validate payload size
   */
  static validateSize(payload: string | Buffer): {
    valid: boolean;
    size: number;
    maxSize: number;
  } {
    const size =
      typeof payload === 'string' ? Buffer.from(payload).length : payload.length;

    return {
      valid: size <= this.MAX_OP_RETURN_SIZE,
      size,
      maxSize: this.MAX_OP_RETURN_SIZE,
    };
  }
}

/**
 * Common function encoders
 */
export class BitcoinFunctionEncoder {
  /**
   * Encode ERC20 transfer
   */
  static transfer(to: string, amount: bigint | string): FunctionCall {
    return {
      signature: 'transfer(address,uint256)',
      args: [to, amount],
    };
  }

  /**
   * Encode ERC20 approve
   */
  static approve(spender: string, amount: bigint | string): FunctionCall {
    return {
      signature: 'approve(address,uint256)',
      args: [spender, amount],
    };
  }

  /**
   * Encode simple message
   */
  static message(functionName: string, message: string): FunctionCall {
    return {
      signature: `${functionName}(string)`,
      args: [message],
    };
  }

  /**
   * Encode onReport (your Sepolia contract)
   */
  static onReport(message: string): FunctionCall {
    return {
      signature: 'onReport(string)',
      args: [message],
    };
  }

  /**
   * Encode custom function
   */
  static custom(signature: string, args: any[]): FunctionCall {
    return {
      signature,
      args,
    };
  }
}

