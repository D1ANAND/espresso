/**
 * Example: Bitcoin API Integration
 * Shows how to use CommandBuilder with bitcoin-api
 */

import { CommandBuilder } from '../packages/bitcoin-api/src/CommandBuilder';
import { BitcoinCommandEncoder } from '../packages/sdk/bitcoin';

console.log('=== Bitcoin API Integration Examples ===\n');

// ============================================
// Example 1: Simple Message to Sepolia
// ============================================
console.log('Example 1: Send Message to Sepolia');
console.log('─────────────────────────────────────────────');

const messageOpReturn = CommandBuilder.buildOnReport('Hey From Bitcoin', {
  nonce: 0,
  btcAddress: 'tb1q7k3auyv7w58djjxm8y8u5g5zq7xj3qm6k4yq5h',
});

console.log('OP_RETURN Output:');
console.log('  Value:', messageOpReturn.value, 'sats');
console.log('  Script:', messageOpReturn.script.slice(0, 50) + '...');
console.log('  Data size:', messageOpReturn.script.replace('OP_RETURN ', '').length / 2, 'bytes');
console.log();

// Build complete transaction
const tx1 = CommandBuilder.buildTransaction(messageOpReturn, {
  feeRate: 2, // 2 sat/vB
  outputs: [
    {
      address: 'tb1q...', // change address
      value: 50000, // change amount in sats
    },
  ],
});

console.log('Transaction:');
console.log('  Outputs:', tx1.outputs.length);
console.log('  Fee rate:', tx1.feeRate, 'sat/vB');
console.log();

// ============================================
// Example 2: ERC20 Transfer on Base
// ============================================
console.log('Example 2: ERC20 Transfer on Base');
console.log('─────────────────────────────────────────────');

const transferOpReturn = CommandBuilder.buildTransfer(
  'BASE',
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Bob
  100000000n, // 100 USDC
  {
    nonce: 1,
    btcAddress: 'tb1q...',
  }
);

console.log('Transfer 100 USDC:');
console.log('  Script length:', transferOpReturn.script.length);

const tx2 = CommandBuilder.buildTransaction(transferOpReturn);
console.log('  Outputs:', tx2.outputs.length);
console.log();

// ============================================
// Example 3: Transaction Size Estimation
// ============================================
console.log('Example 3: Transaction Size Estimation');
console.log('─────────────────────────────────────────────');

const opReturnDataSize = messageOpReturn.script.replace('OP_RETURN ', '').length / 2;

const estimate1 = CommandBuilder.estimateTxSize(opReturnDataSize, 1, 1);
console.log('Transaction with 1 input, 1 output + OP_RETURN:');
console.log('  Size:', estimate1.vBytes, 'vBytes');
console.log('  Fee (1 sat/vB):', estimate1.fee, 'sats');
console.log('  Fee (2 sat/vB):', estimate1.fee * 2, 'sats');

const estimate2 = CommandBuilder.estimateTxSize(opReturnDataSize, 2, 1);
console.log('\nTransaction with 2 inputs, 1 output + OP_RETURN:');
console.log('  Size:', estimate2.vBytes, 'vBytes');
console.log('  Fee (1 sat/vB):', estimate2.fee, 'sats');
console.log();

// ============================================
// Example 4: Format for bitcoin-cli
// ============================================
console.log('Example 4: Bitcoin CLI Command');
console.log('─────────────────────────────────────────────');

const cliFormat = CommandBuilder.formatForBitcoinCLI(messageOpReturn);

console.log('Command:', cliFormat.command);
console.log('Example:');
console.log(cliFormat.example);
console.log();

// ============================================
// Example 5: Format for PSBT (bitcoinjs-lib)
// ============================================
console.log('Example 5: PSBT Output Format');
console.log('─────────────────────────────────────────────');

const psbtOutput = CommandBuilder.formatForPSBT(messageOpReturn);

console.log('PSBT Output:');
console.log('  Script:', psbtOutput.script.toString('hex').slice(0, 50) + '...');
console.log('  Value:', psbtOutput.value, 'sats');
console.log('  Script length:', psbtOutput.script.length, 'bytes');
console.log();

// ============================================
// Example 6: Multiple Outputs
// ============================================
console.log('Example 6: Transaction with Multiple Outputs');
console.log('─────────────────────────────────────────────');

const multiTx = CommandBuilder.buildTransaction(messageOpReturn, {
  feeRate: 3,
  outputs: [
    {
      address: 'tb1q...alice', // payment to Alice
      value: 10000,
    },
    {
      address: 'tb1q...bob', // payment to Bob
      value: 20000,
    },
    {
      address: 'tb1q...change', // change
      value: 50000,
    },
  ],
});

console.log('Outputs:');
multiTx.outputs.forEach((out, i) => {
  if (out.script && out.script.startsWith('OP_RETURN')) {
    console.log(`  ${i}: OP_RETURN (${out.value} sats)`);
  } else if (out.address) {
    console.log(`  ${i}: ${out.address} (${out.value} sats)`);
  }
});
console.log();

// ============================================
// Example 7: Size Comparison (JSON vs Binary)
// ============================================
console.log('Example 7: JSON vs Binary Format');
console.log('─────────────────────────────────────────────');

// JSON format
const jsonOpReturn = CommandBuilder.buildOPReturn(
  'SEPOLIA',
  '0x2BaE8224110482eC6dDF12faf359A35362d43573',
  'onReport(string)',
  ['Hey From Bitcoin'],
  { format: 'json' }
);

// Binary format
const binaryOpReturn = CommandBuilder.buildOPReturn(
  'SEPOLIA',
  '0x2BaE8224110482eC6dDF12faf359A35362d43573',
  'onReport(string)',
  ['Hey From Bitcoin'],
  { format: 'binary' }
);

const jsonSize = jsonOpReturn.script.replace('OP_RETURN ', '').length / 2;
const binarySize = binaryOpReturn.script.replace('OP_RETURN ', '').length / 2;

console.log('JSON format:');
console.log('  Data size:', jsonSize, 'bytes');
console.log('  TX estimate:', CommandBuilder.estimateTxSize(jsonSize, 1, 1).vBytes, 'vBytes');

console.log('\nBinary format:');
console.log('  Data size:', binarySize, 'bytes');
console.log('  TX estimate:', CommandBuilder.estimateTxSize(binarySize, 1, 1).vBytes, 'vBytes');

console.log('\nSavings:', jsonSize - binarySize, 'bytes');
console.log('Percentage:', ((1 - binarySize / jsonSize) * 100).toFixed(1), '%');
console.log();

// ============================================
// Example 8: Complete Workflow
// ============================================
console.log('Example 8: Complete Bitcoin → Sepolia Workflow');
console.log('─────────────────────────────────────────────');

// 1. Build command
console.log('Step 1: Build command');
const finalOpReturn = CommandBuilder.buildOnReport('Hello from Bitcoin!', {
  nonce: 0,
  btcAddress: 'tb1q7k3auyv7w58djjxm8y8u5g5zq7xj3qm6k4yq5h',
});
console.log('  ✓ OP_RETURN created');

// 2. Estimate size and fee
console.log('\nStep 2: Estimate fees');
const dataSize = finalOpReturn.script.replace('OP_RETURN ', '').length / 2;
const txEstimate = CommandBuilder.estimateTxSize(dataSize, 1, 1);
console.log('  TX size:', txEstimate.vBytes, 'vBytes');
console.log('  Fee (@5 sat/vB):', txEstimate.vBytes * 5, 'sats');

// 3. Build transaction
console.log('\nStep 3: Build transaction');
const finalTx = CommandBuilder.buildTransaction(finalOpReturn, {
  feeRate: 5,
  outputs: [
    {
      address: 'tb1q...change',
      value: 45000, // change
    },
  ],
});
console.log('  ✓ Transaction built with', finalTx.outputs.length, 'outputs');

// 4. Get CLI command
console.log('\nStep 4: Bitcoin CLI command');
const finalCLI = CommandBuilder.formatForBitcoinCLI(finalOpReturn);
console.log('  ', finalCLI.example);

// 5. Wait for confirmation
console.log('\nStep 5: Broadcast and wait');
console.log('  → Broadcast to Bitcoin network');
console.log('  → Wait ~10 minutes for confirmation');

// 6. Relayer picks up
console.log('\nStep 6: Espresso Relayer');
console.log('  → Relayer scans Bitcoin blocks');
console.log('  → Detects Espresso message in OP_RETURN');
console.log('  → Forwards to Sepolia');

// 7. Execute on Sepolia
console.log('\nStep 7: Execution on Sepolia');
console.log('  → Contract: 0x2BaE8224110482eC6dDF12faf359A35362d43573');
console.log('  → Function: onReport("Hello from Bitcoin!")');
console.log('  → Result: ✓ Executed!');

console.log('\n=== All Examples Complete ===');

