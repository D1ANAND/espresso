/**
 * Example: Using EVMCommandEncoder
 * Shows how to encode/decode Bitcoin → EVM commands
 */

import { EVMCommandEncoder, CommonFunctions, EVM_CHAINS } from '../packages/sdk/evm';
import { ethers } from 'ethers';

console.log('=== EVM Command Encoder Examples ===\n');

// ============================================
// Example 1: Simple Message (onReport)
// ============================================
console.log('Example 1: Encode onReport("Hey From Bitcoin")');
console.log('─────────────────────────────────────────────');

const messageCalldata = EVMCommandEncoder.encodeFunction(
  'function onReport(string msg)',
  'onReport',
  ['Hey From Bitcoin']
);

console.log('Calldata:', messageCalldata);
console.log('Selector:', messageCalldata.slice(0, 10));
console.log('Length:', messageCalldata.length, 'chars');

// Build command
const messageCommand = EVMCommandEncoder.buildCommand(
  '0x2BaE8224110482eC6dDF12faf359A35362d43573', // Your Sepolia contract
  messageCalldata,
  {
    chainKey: 'SEPOLIA',
    nonce: 0n,
  }
);

console.log('\nCommand:', messageCommand);
console.log('Chain:', EVM_CHAINS.SEPOLIA.name);

// Hash for signing
const messageHash = EVMCommandEncoder.hashCommand(messageCommand);
console.log('Message Hash:', messageHash);
console.log();

// ============================================
// Example 2: ERC20 Transfer
// ============================================
console.log('Example 2: Encode ERC20 Transfer');
console.log('─────────────────────────────────────────────');

const transferCalldata = CommonFunctions.encodeTransfer(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Bob
  ethers.parseUnits('100', 6) // 100 USDC (6 decimals)
);

console.log('Calldata:', transferCalldata);

const transferCommand = EVMCommandEncoder.buildCommand(
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on mainnet (example)
  transferCalldata,
  {
    chainKey: 'BASE',
    nonce: 0n,
  }
);

console.log('Command:', transferCommand);
console.log('Chain:', EVM_CHAINS.BASE.name);
console.log();

// ============================================
// Example 3: Multiple Chains
// ============================================
console.log('Example 3: Same Command, Different Chains');
console.log('─────────────────────────────────────────────');

const calldata = CommonFunctions.encodeMessage('onReport(string)', 'Hello from Bitcoin');

const chains: Array<keyof typeof EVM_CHAINS> = ['SEPOLIA', 'BASE_SEPOLIA', 'POLYGON_AMOY', 'CITREA_TESTNET'];

chains.forEach((chainKey) => {
  const cmd = EVMCommandEncoder.buildCommand('0x1234567890123456789012345678901234567890', calldata, {
    chainKey,
  });

  console.log(`\n${EVM_CHAINS[chainKey].name}:`);
  console.log('  Chain ID:', cmd.chainId.toString());
  console.log('  Chain Selector:', EVM_CHAINS[chainKey].chainSelector.toString());
  console.log('  RPC:', EVM_CHAINS[chainKey].rpcUrl);
});

console.log();

// ============================================
// Example 4: Decode Function Call
// ============================================
console.log('Example 4: Decode Function Call');
console.log('─────────────────────────────────────────────');

const encodedTransfer =
  '0xa9059cbb000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f0beb0000000000000000000000000000000000000000000000000000000005f5e100';

const decoded = CommonFunctions.decodeTransfer(encodedTransfer);
console.log('Decoded transfer:');
console.log('  To:', decoded.to);
console.log('  Amount:', decoded.amount.toString(), 'wei');
console.log('  Amount:', ethers.formatUnits(decoded.amount, 6), 'USDC');
console.log();

// ============================================
// Example 5: Encode for Bitcoin OP_RETURN
// ============================================
console.log('Example 5: Encode for Bitcoin OP_RETURN');
console.log('─────────────────────────────────────────────');

const signedCommand = {
  ...messageCommand,
  pubKeyX: '0x' + '1234'.repeat(16), // 32 bytes
  signature: '0x' + 'abcd'.repeat(32), // 64 bytes
};

const opReturnData = EVMCommandEncoder.encodeForBitcoin(signedCommand);
console.log('OP_RETURN size:', opReturnData.length, 'bytes');
console.log('OP_RETURN hex:', opReturnData.toString('hex').slice(0, 100) + '...');
console.log('OP_RETURN JSON:', opReturnData.toString('utf8').slice(0, 150) + '...');
console.log();

// ============================================
// Example 6: Decode from Bitcoin OP_RETURN
// ============================================
console.log('Example 6: Decode from Bitcoin OP_RETURN');
console.log('─────────────────────────────────────────────');

const parsedCommand = EVMCommandEncoder.decodeFromBitcoin(opReturnData);
console.log('Protocol:', parsedCommand.protocol);
console.log('Version:', parsedCommand.version);
console.log('Chain:', parsedCommand.chainKey);
console.log('Target:', parsedCommand.command.target);
console.log('Nonce:', parsedCommand.command.nonce.toString());
console.log('PubKey X:', parsedCommand.command.pubKeyX);
console.log('Signature:', parsedCommand.command.signature.slice(0, 20) + '...');
console.log();

// ============================================
// Example 7: Validate Command
// ============================================
console.log('Example 7: Validate Command');
console.log('─────────────────────────────────────────────');

const validResult = EVMCommandEncoder.validateCommand(messageCommand);
console.log('Valid:', validResult.valid);
console.log('Errors:', validResult.errors);

// Invalid command
const invalidCommand = {
  ...messageCommand,
  target: 'invalid_address',
  deadline: 0n, // expired
};

const invalidResult = EVMCommandEncoder.validateCommand(invalidCommand);
console.log('\nInvalid command:');
console.log('Valid:', invalidResult.valid);
console.log('Errors:', invalidResult.errors);
console.log();

// ============================================
// Example 8: Chain Lookups
// ============================================
console.log('Example 8: Chain Information');
console.log('─────────────────────────────────────────────');

// By chain ID
const baseInfo = EVMCommandEncoder.getChainInfo(8453n);
console.log('Chain by ID 8453:', baseInfo?.name);

// By chain selector
const sepoliaInfo = EVMCommandEncoder.getChainBySelector(BigInt('16015286601757825753'));
console.log('Chain by selector:', sepoliaInfo?.name);

// List all chains
console.log('\nSupported chains:');
Object.entries(EVM_CHAINS).forEach(([key, chain]) => {
  console.log(`  ${chain.name.padEnd(20)} Chain ID: ${chain.chainId.toString().padEnd(10)} Selector: ${chain.chainSelector}`);
});
console.log();

// ============================================
// Example 9: Complete Flow
// ============================================
console.log('Example 9: Complete Bitcoin → EVM Flow');
console.log('─────────────────────────────────────────────');

// 1. Encode function
const completeCalldata = CommonFunctions.encodeMessage('onReport(string)', 'Test from Bitcoin');

// 2. Build command
const completeCommand = EVMCommandEncoder.buildCommand(
  '0x2BaE8224110482eC6dDF12faf359A35362d43573',
  completeCalldata,
  {
    chainKey: 'SEPOLIA',
    nonce: 42n,
  }
);

// 3. Hash for signing
const hashForSigning = EVMCommandEncoder.hashCommand(completeCommand, '0x' + '1234'.repeat(16));

// 4. (User signs with Bitcoin Schnorr key)
console.log('Step 1: Function encoded');
console.log('Step 2: Command built');
console.log('Step 3: Hash created:', hashForSigning);
console.log('Step 4: [User signs with Bitcoin key]');
console.log('Step 5: Post to Bitcoin OP_RETURN');
console.log('Step 6: Espresso relayer detects and forwards');
console.log('Step 7: Execute on', EVM_CHAINS.SEPOLIA.name);
console.log();

console.log('=== All Examples Complete ===');

