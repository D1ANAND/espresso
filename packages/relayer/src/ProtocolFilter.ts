/**
 * ProtocolFilter
 * Filters Bitcoin transactions for BMCP messages
 */

import { BitcoinCommandEncoder } from '@bmcp/sdk/bitcoin';

/**
 * Bitcoin transaction output
 */
export interface BitcoinOutput {
  value: number;
  scriptPubKey: {
    hex: string;
    type: string;
  };
}

/**
 * Bitcoin transaction
 */
export interface BitcoinTransaction {
  txid: string;
  vout: BitcoinOutput[];
  blockheight?: number;
  blocktime?: number;
}

/**
 * Parsed BMCP message from Bitcoin
 */
export interface BMCPMessage {
  txid: string;
  blockHeight?: number;
  blockTime?: number;
  outputIndex: number;
  protocol: string;
  protocolMagic: number;
  version: number;
  chainSelector: bigint;
  chainName: string | null;
  contract: string;
  data: string;
  nonce?: number;
  deadline?: number;
}

/**
 * Protocol Filter for BMCP messages
 */
export class ProtocolFilter {
  private static readonly BMCP_MAGIC = 0x424d4350; // "BMCP"
  private static readonly OP_RETURN = 0x6a;

  /**
   * Filter transactions for BMCP messages
   */
  static filterBMCPTransactions(
    transactions: BitcoinTransaction[]
  ): BMCPMessage[] {
    const messages: BMCPMessage[] = [];

    for (const tx of transactions) {
      const txMessages = this.extractBMCPMessages(tx);
      messages.push(...txMessages);
    }

    return messages;
  }

  /**
   * Extract BMCP messages from a single transaction
   */
  static extractBMCPMessages(tx: BitcoinTransaction): BMCPMessage[] {
    const messages: BMCPMessage[] = [];

    for (let i = 0; i < tx.vout.length; i++) {
      const output = tx.vout[i];

      // Check if OP_RETURN
      if (output.scriptPubKey.type !== 'nulldata') continue;

      // Parse script
      const scriptHex = output.scriptPubKey.hex;
      const script = Buffer.from(scriptHex, 'hex');

      // Check for OP_RETURN opcode
      if (script[0] !== this.OP_RETURN) continue;

      // Extract data (skip OP_RETURN opcode and data push opcode)
      let dataOffset = 1;
      const dataLength = script[dataOffset];
      dataOffset++;

      // Handle larger data pushes
      if (dataLength === 0x4c) {
        // OP_PUSHDATA1
        const len = script[dataOffset];
        dataOffset++;
      } else if (dataLength === 0x4d) {
        // OP_PUSHDATA2
        const len = script.readUInt16LE(dataOffset);
        dataOffset += 2;
      } else if (dataLength === 0x4e) {
        // OP_PUSHDATA4
        const len = script.readUInt32LE(dataOffset);
        dataOffset += 4;
      }

      const data = script.slice(dataOffset);

      // Check for BMCP magic
      if (!BitcoinCommandEncoder.isBMCPMessage(data)) continue;

      try {
        // Decode BMCP message
        const decoded = BitcoinCommandEncoder.decodeBinary(data);

        messages.push({
          txid: tx.txid,
          blockHeight: tx.blockheight,
          blockTime: tx.blocktime,
          outputIndex: i,
          protocol: decoded.protocol,
          protocolMagic: decoded.protocolMagic,
          version: decoded.version,
          chainSelector: decoded.chainSelector,
          chainName: BitcoinCommandEncoder.getChainName(decoded.chainSelector),
          contract: decoded.contract,
          data: decoded.data,
          nonce: decoded.nonce,
          deadline: decoded.deadline,
        });
      } catch (error) {
        console.warn(`Failed to decode BMCP message in ${tx.txid}:${i}`, error);
        continue;
      }
    }

    return messages;
  }

  /**
   * Check if transaction contains BMCP messages
   */
  static hasBMCPMessages(tx: BitcoinTransaction): boolean {
    return this.extractBMCPMessages(tx).length > 0;
  }

  /**
   * Get BMCP message count in block
   */
  static countBMCPMessages(transactions: BitcoinTransaction[]): number {
    return transactions.reduce((count, tx) => {
      return count + this.extractBMCPMessages(tx).length;
    }, 0);
  }

  /**
   * Filter messages by chain selector
   */
  static filterByChain(
    messages: BMCPMessage[],
    chainSelector: bigint
  ): BMCPMessage[] {
    return messages.filter((msg) => msg.chainSelector === chainSelector);
  }

  /**
   * Filter messages by deadline
   */
  static filterByDeadline(
    messages: BMCPMessage[],
    currentTime: number = Math.floor(Date.now() / 1000)
  ): BMCPMessage[] {
    return messages.filter((msg) => {
      if (!msg.deadline) return true; // No deadline = always valid
      return msg.deadline > currentTime;
    });
  }
}

