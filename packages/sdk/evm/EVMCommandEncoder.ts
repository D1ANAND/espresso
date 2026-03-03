/**
 * EVMCommandEncoder
 * Encodes/decodes Bitcoin → EVM commands for cross-chain execution
 */

import { ethers } from 'ethers';

/**
 * Supported EVM chains with their chain selectors and IDs
 */
export const EVM_CHAINS = {
  SEPOLIA: {
    name: 'Sepolia',
    chainId: 11155111n,
    chainSelector: BigInt('16015286601757825753'), // CCIP selector
    rpcUrl: 'https://sepolia.infura.io/v3/',
  },
  BASE: {
    name: 'Base',
    chainId: 8453n,
    chainSelector: BigInt('15971525489660198786'),
    rpcUrl: 'https://mainnet.base.org',
  },
  BASE_SEPOLIA: {
    name: 'Base Sepolia',
    chainId: 84532n,
    chainSelector: BigInt('10344971235874465080'),
    rpcUrl: 'https://sepolia.base.org',
  },
  POLYGON: {
    name: 'Polygon',
    chainId: 137n,
    chainSelector: BigInt('4051577828743386545'),
    rpcUrl: 'https://polygon-rpc.com',
  },
  POLYGON_AMOY: {
    name: 'Polygon Amoy',
    chainId: 80002n,
    chainSelector: BigInt('16281711391670634445'),
    rpcUrl: 'https://rpc-amoy.polygon.technology',
  },
  ARBITRUM: {
    name: 'Arbitrum One',
    chainId: 42161n,
    chainSelector: BigInt('4949039107694359620'),
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
  },
  OPTIMISM: {
    name: 'Optimism',
    chainId: 10n,
    chainSelector: BigInt('3734403246176062136'),
    rpcUrl: 'https://mainnet.optimism.io',
  },
  CITREA: {
    name: 'Citrea',
    chainId: 5115n,
    chainSelector: BigInt('0x4349545245410000'), // "CITREA" in hex
    rpcUrl: 'https://rpc.mainnet.citrea.xyz',
  },
  CITREA_TESTNET: {
    name: 'Citrea Testnet',
    chainId: 62298n,
    chainSelector: BigInt('0x4349545245415400'), // "CITREAT" in hex
    rpcUrl: 'https://rpc.testnet.citrea.xyz',
  },
} as const;

export type ChainKey = keyof typeof EVM_CHAINS;

/**
 * Bitcoin command structure for EVM execution
 */
export interface BitcoinCommand {
  /** Target contract address on EVM chain */
  target: string;
  /** ETH value to send (in wei) */
  value: bigint;
  /** Encoded function call data */
  data: string;
  /** Nonce for replay protection */
  nonce: bigint;
  /** Deadline (unix timestamp or block number) */
  deadline: bigint;
  /** EVM chain ID */
  chainId: bigint;
}

/**
 * Bitcoin command with signature
 */
export interface SignedBitcoinCommand extends BitcoinCommand {
  /** Bitcoin public key X-coordinate (32 bytes) */
  pubKeyX: string;
  /** Schnorr signature (64 bytes) */
  signature: string;
  /** Bitcoin transaction ID (optional, for verification) */
  bitcoinTxId?: string;
}

/**
 * Parsed command from OP_RETURN
 */
export interface ParsedCommand {
  protocol: string;
  version: number;
  command: SignedBitcoinCommand;
  chainKey?: ChainKey;
}

/**
 * Encoder/Decoder for Bitcoin → EVM commands
 */
export class EVMCommandEncoder {
  /**
   * Encode a function call
   */
  static encodeFunction(
    functionSignature: string | string[],
    functionName: string,
    args: any[]
  ): string {
    const iface = new ethers.Interface(
      Array.isArray(functionSignature) ? functionSignature : [functionSignature]
    );
    return iface.encodeFunctionData(functionName, args);
  }

  /**
   * Decode a function call
   */
  static decodeFunction(
    functionSignature: string | string[],
    functionName: string,
    data: string
  ): ethers.Result {
    const iface = new ethers.Interface(
      Array.isArray(functionSignature) ? functionSignature : [functionSignature]
    );
    return iface.decodeFunctionData(functionName, data);
  }

  /**
   * Get function selector (first 4 bytes)
   */
  static getFunctionSelector(signature: string): string {
    return ethers.id(signature).slice(0, 10);
  }

  /**
   * Build a Bitcoin command
   */
  static buildCommand(
    target: string,
    calldata: string,
    options: {
      value?: bigint;
      nonce?: bigint;
      deadline?: bigint;
      chainId?: bigint;
      chainKey?: ChainKey;
    } = {}
  ): BitcoinCommand {
    const chainInfo = options.chainKey ? EVM_CHAINS[options.chainKey] : null;
    const chainId = options.chainId ?? chainInfo?.chainId ?? 1n;

    return {
      target,
      value: options.value ?? 0n,
      data: calldata,
      nonce: options.nonce ?? 0n,
      deadline: options.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 3600),
      chainId,
    };
  }

  /**
   * Hash a command for signing
   */
  static hashCommand(command: BitcoinCommand, pubKeyX?: string): string {
    const types = pubKeyX
      ? ['bytes32', 'address', 'uint256', 'bytes', 'uint256', 'uint256', 'uint256']
      : ['address', 'uint256', 'bytes', 'uint256', 'uint256', 'uint256'];

    const values = pubKeyX
      ? [pubKeyX, command.target, command.value, command.data, command.nonce, command.deadline, command.chainId]
      : [command.target, command.value, command.data, command.nonce, command.deadline, command.chainId];

    return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(types, values));
  }

  /**
   * Encode command for OP_RETURN (JSON format)
   */
  static encodeForBitcoin(signedCommand: SignedBitcoinCommand): Buffer {
    const payload = {
      protocol: 'BMCP',
      version: 1,
      pubKeyX: signedCommand.pubKeyX,
      target: signedCommand.target,
      value: signedCommand.value.toString(),
      data: signedCommand.data,
      nonce: signedCommand.nonce.toString(),
      deadline: signedCommand.deadline.toString(),
      chainId: signedCommand.chainId.toString(),
      signature: signedCommand.signature,
    };

    return Buffer.from(JSON.stringify(payload));
  }

  /**
   * Decode command from OP_RETURN
   */
  static decodeFromBitcoin(opReturnData: Buffer | string): ParsedCommand {
    const jsonStr = typeof opReturnData === 'string' ? opReturnData : opReturnData.toString('utf8');

    const payload = JSON.parse(jsonStr);

    const command: SignedBitcoinCommand = {
      pubKeyX: payload.pubKeyX,
      target: payload.target,
      value: BigInt(payload.value),
      data: payload.data,
      nonce: BigInt(payload.nonce),
      deadline: BigInt(payload.deadline),
      chainId: BigInt(payload.chainId),
      signature: payload.signature,
      bitcoinTxId: payload.bitcoinTxId,
    };

    // Find matching chain
    let chainKey: ChainKey | undefined;
    for (const [key, chain] of Object.entries(EVM_CHAINS)) {
      if (chain.chainId === command.chainId) {
        chainKey = key as ChainKey;
        break;
      }
    }

    return {
      protocol: payload.protocol,
      version: payload.version,
      command,
      chainKey,
    };
  }

  /**
   * Encode command for contract call (tuple format)
   */
  static encodeForContract(command: BitcoinCommand): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ['tuple(address target, uint256 value, bytes data, uint256 nonce, uint256 deadline)'],
      [
        {
          target: command.target,
          value: command.value,
          data: command.data,
          nonce: command.nonce,
          deadline: command.deadline,
        },
      ]
    );
  }

  /**
   * Validate command structure
   */
  static validateCommand(command: BitcoinCommand): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check target address
    if (!ethers.isAddress(command.target)) {
      errors.push('Invalid target address');
    }

    // Check data format
    if (!command.data.startsWith('0x') || command.data.length < 10) {
      errors.push('Invalid calldata format');
    }

    // Check deadline
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (command.deadline <= now) {
      errors.push('Deadline has passed');
    }

    // Check value
    if (command.value < 0n) {
      errors.push('Value cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get chain info by chain ID
   */
  static getChainInfo(chainId: bigint): (typeof EVM_CHAINS)[ChainKey] | null {
    for (const chain of Object.values(EVM_CHAINS)) {
      if (chain.chainId === chainId) {
        return chain;
      }
    }
    return null;
  }

  /**
   * Get chain info by chain selector (CCIP)
   */
  static getChainBySelector(selector: bigint): (typeof EVM_CHAINS)[ChainKey] | null {
    for (const chain of Object.values(EVM_CHAINS)) {
      if (chain.chainSelector === selector) {
        return chain;
      }
    }
    return null;
  }
}

/**
 * Common function encoders
 */
export class CommonFunctions {
  /**
   * Encode ERC20 transfer
   */
  static encodeTransfer(to: string, amount: bigint): string {
    return EVMCommandEncoder.encodeFunction(
      'function transfer(address to, uint256 amount) returns (bool)',
      'transfer',
      [to, amount]
    );
  }

  /**
   * Encode ERC20 approve
   */
  static encodeApprove(spender: string, amount: bigint): string {
    return EVMCommandEncoder.encodeFunction(
      'function approve(address spender, uint256 amount) returns (bool)',
      'approve',
      [spender, amount]
    );
  }

  /**
   * Encode generic message
   */
  static encodeMessage(signature: string, message: string): string {
    return EVMCommandEncoder.encodeFunction(`function ${signature}`, signature.split('(')[0], [message]);
  }

  /**
   * Decode ERC20 transfer
   */
  static decodeTransfer(data: string): { to: string; amount: bigint } {
    const result = EVMCommandEncoder.decodeFunction(
      'function transfer(address to, uint256 amount)',
      'transfer',
      data
    );
    return {
      to: result[0],
      amount: result[1],
    };
  }

  /**
   * Decode generic message
   */
  static decodeMessage(signature: string, data: string): ethers.Result {
    return EVMCommandEncoder.decodeFunction(`function ${signature}`, signature.split('(')[0], data);
  }
}

