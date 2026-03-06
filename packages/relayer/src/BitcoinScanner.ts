/**
 * BitcoinScanner
 * Scans Bitcoin testnet for BMCP messages using Tatum API
 */

import axios from 'axios';
import { BitcoinCommandEncoder } from '@bmcp/sdk/bitcoin';

/**
 * Bitcoin RPC configuration for Tatum
 */
export interface BitcoinRPCConfig {
  rpcUrl: string;
  apiKey: string;
  network: 'mainnet' | 'testnet' | 'testnet4';
}

/**
 * Bitcoin transaction
 */
export interface BitcoinTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: any[];
  vout: BitcoinOutput[];
  hex: string;
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
}

/**
 * Bitcoin output
 */
export interface BitcoinOutput {
  value: number;
  n: number;
  scriptPubKey: {
    asm: string;
    desc?: string;
    hex: string;
    type: string;
    address?: string;
  };
}

/**
 * Detected BMCP message
 */
export interface DetectedBMCPMessage {
  txid: string;
  outputIndex: number;
  opReturnData: Buffer;
  isBMCP: boolean;
  decoded?: {
    protocol: string;
    protocolMagic: number;
    version: number;
    chainSelector: bigint;
    chainName: string | null;
    contract: string;
    data: string;
    nonce?: number;
    deadline?: number;
  };
  error?: string;
}

/**
 * Bitcoin Scanner for BMCP messages
 */
export class BitcoinScanner {
  private config: BitcoinRPCConfig;
  private requestId: number = 1;

  constructor(config: BitcoinRPCConfig) {
    this.config = config;
  }

  /**
   * Call Bitcoin RPC method via Tatum
   */
  private async rpcCall(method: string, params: any[]): Promise<any> {
    try {
      const response = await axios.post(
        this.config.rpcUrl,
        {
          jsonrpc: '2.0',
          method,
          params,
          id: this.requestId++,
        },
        {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': this.config.apiKey,
          },
        }
      );

      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error: any) {
      throw new Error(`Bitcoin RPC call failed: ${error.message}`);
    }
  }

  /**
   * Get transaction by txid
   */
  async getTransaction(txid: string): Promise<BitcoinTransaction> {
    return await this.rpcCall('getrawtransaction', [txid, true]);
  }

  /**
   * Get block by hash
   */
  async getBlock(blockHash: string): Promise<any> {
    return await this.rpcCall('getblock', [blockHash, 2]); // verbosity 2 = full transactions
  }

  /**
   * Get best block hash
   */
  async getBestBlockHash(): Promise<string> {
    return await this.rpcCall('getbestblockhash', []);
  }

  /**
   * Get block count
   */
  async getBlockCount(): Promise<number> {
    return await this.rpcCall('getblockcount', []);
  }

  /**
   * Get block hash at height
   */
  async getBlockHash(height: number): Promise<string> {
    return await this.rpcCall('getblockhash', [height]);
  }

  /**
   * Scan transaction for OP_RETURN outputs
   */
  scanTransactionForOPReturn(tx: BitcoinTransaction): Buffer[] {
    const opReturns: Buffer[] = [];

    for (const output of tx.vout) {
      if (output.scriptPubKey.type === 'nulldata') {
        // Extract data from OP_RETURN script
        const scriptHex = output.scriptPubKey.hex;
        const script = Buffer.from(scriptHex, 'hex');

        // Parse OP_RETURN data
        // Format: OP_RETURN (0x6a) <push_opcode> <data>
        let offset = 1; // Skip OP_RETURN opcode

        // Handle different push opcodes
        const pushOpcode = script[offset];
        offset++;

        if (pushOpcode === 0x4c) {
          // OP_PUSHDATA1
          const length = script[offset];
          offset++;
        } else if (pushOpcode === 0x4d) {
          // OP_PUSHDATA2
          const length = script.readUInt16LE(offset);
          offset += 2;
        } else if (pushOpcode === 0x4e) {
          // OP_PUSHDATA4
          const length = script.readUInt32LE(offset);
          offset += 4;
        }

        const data = script.slice(offset);
        opReturns.push(data);
      }
    }

    return opReturns;
  }

  /**
   * Scan transaction for BMCP messages
   */
  async scanTransactionForBMCP(txid: string): Promise<DetectedBMCPMessage[]> {
    const tx = await this.getTransaction(txid);
    return this.scanTransactionObjectForBMCP(tx);
  }

  /**
   * Scan transaction object for BMCP messages
   */
  scanTransactionObjectForBMCP(tx: BitcoinTransaction): DetectedBMCPMessage[] {
    const messages: DetectedBMCPMessage[] = [];

    for (let i = 0; i < tx.vout.length; i++) {
      const output = tx.vout[i];

      if (output.scriptPubKey.type === 'nulldata') {
        const opReturns = this.scanTransactionForOPReturn(tx);

        for (const opReturnData of opReturns) {
          const isBMCP = BitcoinCommandEncoder.isBMCPMessage(opReturnData);

          const message: DetectedBMCPMessage = {
            txid: tx.txid,
            outputIndex: i,
            opReturnData,
            isBMCP,
          };

          if (isBMCP) {
            try {
              const decoded = BitcoinCommandEncoder.decodeBinary(opReturnData);
              message.decoded = {
                protocol: decoded.protocol,
                protocolMagic: decoded.protocolMagic,
                version: decoded.version,
                chainSelector: decoded.chainSelector,
                chainName: BitcoinCommandEncoder.getChainName(decoded.chainSelector),
                contract: decoded.contract,
                data: decoded.data,
                nonce: decoded.nonce,
                deadline: decoded.deadline,
              };
            } catch (error: any) {
              message.error = error.message;
            }
          }

          messages.push(message);
        }
      }
    }

    return messages;
  }

  /**
   * Scan block for BMCP messages
   */
  async scanBlockForBMCP(blockHashOrHeight: string | number): Promise<DetectedBMCPMessage[]> {
    const blockHash =
      typeof blockHashOrHeight === 'number'
        ? await this.getBlockHash(blockHashOrHeight)
        : blockHashOrHeight;

    const block = await this.getBlock(blockHash);
    const messages: DetectedBMCPMessage[] = [];

    for (const tx of block.tx) {
      const txMessages = this.scanTransactionObjectForBMCP(tx);
      messages.push(...txMessages);
    }

    return messages;
  }

  /**
   * Scan range of blocks for BMCP messages
   */
  async scanBlockRange(
    startHeight: number,
    endHeight: number,
    onProgress?: (height: number, messages: DetectedBMCPMessage[]) => void
  ): Promise<DetectedBMCPMessage[]> {
    const allMessages: DetectedBMCPMessage[] = [];

    for (let height = startHeight; height <= endHeight; height++) {
      const messages = await this.scanBlockForBMCP(height);
      allMessages.push(...messages);

      if (onProgress) {
        onProgress(height, messages);
      }
    }

    return allMessages;
  }

  /**
   * Monitor new blocks for BMCP messages
   */
  async *monitorNewBlocks(
    startHeight?: number,
    pollIntervalMs: number = 10000
  ): AsyncGenerator<DetectedBMCPMessage[]> {
    let currentHeight = startHeight ?? (await this.getBlockCount());

    while (true) {
      const latestHeight = await this.getBlockCount();

      if (latestHeight > currentHeight) {
        // Scan new blocks
        for (let height = currentHeight + 1; height <= latestHeight; height++) {
          const messages = await this.scanBlockForBMCP(height);

          if (messages.length > 0) {
            yield messages;
          }

          currentHeight = height;
        }
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }
}

/**
 * Create scanner for Tatum testnet
 */
export function createTatumTestnetScanner(apiKey: string): BitcoinScanner {
  return new BitcoinScanner({
    rpcUrl: 'https://bitcoin-testnet4.gateway.tatum.io/',
    apiKey,
    network: 'testnet4',
  });
}

