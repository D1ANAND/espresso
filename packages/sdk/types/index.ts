/**
 * BMCP Core Types
 * Bitcoin Multichain Protocol Type Definitions
 */

export interface BitcoinCCIPMessage {
  protocolId: number; // 0x4243
  version: number; // 0x02
  chainSelector: bigint;
  receiver: string; // 20-byte EVM address
  data: Uint8Array;
  gasLimit: bigint;
  extraArgs: Uint8Array;
}

export interface SendMessageOptions {
  gasLimit?: number;
  allowOutOfOrderExecution?: boolean;
  strict?: boolean;
  feeTokenAddress?: string;
}

export interface BitcoinTransaction {
  txid: string;
  version: number;
  inputs: BitcoinInput[];
  outputs: BitcoinOutput[];
  locktime: number;
  size: number;
  weight: number;
  fee: bigint;
}

export interface BitcoinInput {
  txid: string;
  vout: number;
  scriptSig: string;
  sequence: number;
  witness?: string[];
}

export interface BitcoinOutput {
  value: bigint;
  scriptPubKey: string;
  address?: string;
}

export interface ParsedCCIPMessage {
  txid: string;
  blockHeight: number;
  blockHash: string;
  message: BitcoinCCIPMessage;
  sender: string; // Bitcoin address
  timestamp: number;
  confirmations: number;
}

export interface Any2EVMMessage {
  messageId: string; // Bitcoin txid
  sourceChainSelector: bigint;
  sender: string; // Encoded Bitcoin address
  data: Uint8Array;
  destTokenAmounts: TokenAmount[];
}

export interface TokenAmount {
  token: string;
  amount: bigint;
}

export interface CCIPConfig {
  routerAddress: string;
  chainSelector: bigint;
  gasLimit: number;
}

export interface BitcoinRPCConfig {
  url: string;
  user: string;
  password: string;
  network: 'mainnet' | 'testnet' | 'regtest';
}

export interface RelayerConfig {
  bitcoinRPC: BitcoinRPCConfig;
  ccipConfig: CCIPConfig;
  startBlock: number;
  confirmationBlocks: number;
  pollIntervalMs: number;
  protocolId: number;
}

export interface MessageReceipt {
  txid: string;
  messageId: string;
  status: 'pending' | 'confirmed' | 'relayed' | 'executed' | 'failed';
  blockHeight?: number;
  confirmations?: number;
  ccipMessageId?: string;
  destinationTxHash?: string;
  error?: string;
}

export const PROTOCOL_CONSTANTS = {
  PROTOCOL_ID: 0x4243,
  VERSION_V2: 0x02,
  MAX_MESSAGE_SIZE: 100_000,
  MAX_OP_RETURN_SIZE: 80_000, // Conservative estimate
  MIN_CONFIRMATIONS: 6,
  BITCOIN_BLOCK_TIME_MS: 600_000, // 10 minutes
} as const;

export const CHAIN_SELECTORS = {
  BITCOIN: BigInt('0x424954434f494e'), // 'BITCOIN' in hex
  BASE: BigInt('15971525489660198786'), // Base mainnet
  BASE_SEPOLIA: BigInt('10344971235874465080'), // Base Sepolia testnet
  ETHEREUM: BigInt('5009297550715157269'),
  SEPOLIA: BigInt('16015286601757825753'), // Ethereum Sepolia testnet
  ARBITRUM: BigInt('4949039107694359620'),
  OPTIMISM: BigInt('3734403246176062136'),
  POLYGON_AMOY: BigInt('4051577828743386545'), // Polygon Amoy testnet
  CITREA_TESTNET: BigInt('0x434954524541'), // 'CITREA' in hex
} as const;

