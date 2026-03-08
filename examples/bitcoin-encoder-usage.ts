/**
 * Example: Using BitcoinCommandEncoder
 * Shows how to encode commands for Bitcoin OP_RETURN
 */

import {
  BitcoinCommandEncoder,
  BitcoinFunctionEncoder,
  CHAIN_SELECTORS,
} from '../packages/sdk/bitcoin';

console.log('=== Bitcoin Command Encoder Examples ===\n');

// ============================================
// Example 1: Your Sepolia Contract - onReport
// ============================================
console.log('Example 1: Encode for Sepolia onReport');
console.log('─────────────────────────────────────────────');

const sepoliaContract = '0x2BaE8224110482eC6dDF12faf359A35362d43573';

// Method A: Using helper function
const reportCall = BitcoinFunctionEncoder.onReport('Hey From Bitcoin');

// Encode as JSON (human-readable)
const jsonPayload = BitcoinCommandEncoder.encodeJSON(
  'SEPOLIA',
  sepoliaContract,
  reportCall,
  {
    nonce: 0,
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  }
);

console.log('JSON Payload:');
console.log(jsonPayload);
console.log('\nSize:', Buffer.from(jsonPayload).length, 'bytes');
console.log();

// Encode as binary (space-efficient)
const binaryPayload = BitcoinCommandEncoder.encodeBinary(
  'SEPOLIA',
  sepoliaContract,
  reportCall,
  {
    nonce: 0,
    deadline: Math.floor(Date.now() / 1000) + 3600,
  }
);

console.log('Binary Payload:');
console.log('Hex:', binaryPayload.toString('hex'));
console.log('Size:', binaryPayload.length, 'bytes');
console.log();

// ============================================
// Example 2: ERC20 Transfer on Base
// ============================================
console.log('Example 2: ERC20 Transfer on Base');
console.log('─────────────────────────────────────────────');

const usdcBase = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
const recipient = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

const transferCall = BitcoinFunctionEncoder.transfer(
  recipient,
  100000000n // 100 USDC (6 decimals)
);

const basePayload = BitcoinCommandEncoder.encodeJSON(
  'BASE',
  usdcBase,
  transferCall,
  {
    nonce: 1,
  }
);

console.log('Transfer 100 USDC to Bob on Base:');
console.log(JSON.stringify(JSON.parse(basePayload), null, 2));
console.log();

// ============================================
// Example 3: Multiple Chains
// ============================================
console.log('Example 3: Same Function, Different Chains');
console.log('─────────────────────────────────────────────');

const chains = ['SEPOLIA', 'BASE_SEPOLIA', 'POLYGON_AMOY', 'CITREA_TESTNET'] as const;

chains.forEach((chain) => {
  const payload = BitcoinCommandEncoder.encodeJSON(
    chain,
    sepoliaContract,
    BitcoinFunctionEncoder.onReport(`Hello from ${chain}`),
    { nonce: 0 }
  );

  const parsed = JSON.parse(payload);
  console.log(`\n${chain}:`);
  console.log('  Chain Selector:', parsed.chainSelector);
  console.log('  Contract:', parsed.contract);
  console.log('  Function:', parsed.data.slice(0, 10));
  console.log('  Size:', Buffer.from(payload).length, 'bytes');
});

console.log();

// ============================================
// Example 4: Binary Format Comparison
// ============================================
console.log('Example 4: JSON vs Binary Size');
console.log('─────────────────────────────────────────────');

const testCall = BitcoinFunctionEncoder.onReport('Test message from Bitcoin');

const jsonSize = BitcoinCommandEncoder.estimateSize(
  'SEPOLIA',
  sepoliaContract,
  testCall,
  'json'
);

const binarySize = BitcoinCommandEncoder.estimateSize(
  'SEPOLIA',
  sepoliaContract,
  testCall,
  'binary'
);

console.log('JSON format:', jsonSize, 'bytes');
console.log('Binary format:', binarySize, 'bytes');
console.log('Savings:', ((1 - binarySize / jsonSize) * 100).toFixed(1), '%');
console.log();

// ============================================
// Example 5: Custom Function Call
// ============================================
console.log('Example 5: Custom Function Call');
console.log('─────────────────────────────────────────────');

// Uniswap swap example
const customCall = BitcoinFunctionEncoder.custom(
  'swapExactETHForTokens(uint256,address[],address,uint256)',
  [
    95000000n, // minOut: 95 USDC
    [
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    ],
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // recipient
    Math.floor(Date.now() / 1000) + 3600, // deadline
  ]
);

const swapPayload = BitcoinCommandEncoder.encodeJSON(
  'BASE',
  '0xUniswapRouter', // Placeholder
  customCall
);

console.log('Swap ETH → USDC on Base:');
const swapParsed = JSON.parse(swapPayload);
console.log('  Contract:', swapParsed.contract);
console.log('  Calldata length:', swapParsed.data.length);
console.log('  Function selector:', swapParsed.data.slice(0, 10));
console.log();

// ============================================
// Example 6: Decode Payload
// ============================================
console.log('Example 6: Decode Payload');
console.log('─────────────────────────────────────────────');

// Decode JSON
const decoded = BitcoinCommandEncoder.decodeJSON(jsonPayload);
console.log('Decoded from JSON:');
console.log('  Protocol:', decoded.protocol);
console.log('  Chain Selector:', decoded.chainSelector);
console.log('  Chain:', BitcoinCommandEncoder.getChainName(BigInt(decoded.chainSelector)));
console.log('  Contract:', decoded.contract);
console.log('  Nonce:', decoded.nonce);
console.log();

// Decode Binary
const decodedBinary = BitcoinCommandEncoder.decodeBinary(binaryPayload);
console.log('Decoded from Binary:');
console.log('  Protocol:', decodedBinary.protocol);
console.log('  Chain:', BitcoinCommandEncoder.getChainName(decodedBinary.chainSelector));
console.log('  Contract:', decodedBinary.contract);
console.log('  Data:', decodedBinary.data.slice(0, 20) + '...');
console.log();

// ============================================
// Example 7: Size Validation
// ============================================
console.log('Example 7: Size Validation');
console.log('─────────────────────────────────────────────');

const validation = BitcoinCommandEncoder.validateSize(jsonPayload);
console.log('Payload valid:', validation.valid);
console.log('Size:', validation.size, 'bytes');
console.log('Max allowed:', validation.maxSize, 'bytes');
console.log('Remaining space:', validation.maxSize - validation.size, 'bytes');
console.log();

// ============================================
// Example 8: Ready for Bitcoin API
// ============================================
console.log('Example 8: Ready for Bitcoin Transaction');
console.log('─────────────────────────────────────────────');

// This is what you'd post to Bitcoin
const finalPayload = BitcoinCommandEncoder.encodeJSON(
  'SEPOLIA',
  sepoliaContract,
  BitcoinFunctionEncoder.onReport('Hey From Bitcoin'),
  {
    nonce: 0,
    deadline: Math.floor(Date.now() / 1000) + 3600,
    btcAddress: 'tb1q...',  // Your Bitcoin address
  }
);

console.log('Payload for Bitcoin OP_RETURN:');
console.log(finalPayload);
console.log('\nTo send via Bitcoin:');
console.log('1. Create Bitcoin transaction with OP_RETURN');
console.log('2. Include this payload in OP_RETURN output');
console.log('3. Broadcast to Bitcoin network');
console.log('4. Espresso relayer detects and forwards to Sepolia');
console.log('5. Contract executes onReport("Hey From Bitcoin")');
console.log();

console.log('=== All Examples Complete ===');

