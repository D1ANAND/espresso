/**
 * Example: Protocol Detection
 * Shows how to detect Espresso messages from Bitcoin OP_RETURN
 */

import { BitcoinCommandEncoder, BitcoinFunctionEncoder } from '../packages/sdk/bitcoin';

console.log('=== Espresso Protocol Detection Examples ===\n');

// ============================================
// Example 1: Protocol Magic Number
// ============================================
console.log('Example 1: Protocol Magic Number');
console.log('─────────────────────────────────────────────');

const magic = BitcoinCommandEncoder.getProtocolMagic();
console.log('Protocol Magic:', '0x' + magic.toString(16).toUpperCase());
console.log('ASCII:', Buffer.from([
  (magic >> 24) & 0xff,
  (magic >> 16) & 0xff,
  (magic >> 8) & 0xff,
  magic & 0xff,
]).toString('ascii'));
console.log();

// ============================================
// Example 2: Encode with Protocol ID
// ============================================
console.log('Example 2: Binary Encoding with Protocol ID');
console.log('─────────────────────────────────────────────');

const binaryPayload = BitcoinCommandEncoder.encodeBinary(
  'SEPOLIA',
  '0x2BaE8224110482eC6dDF12faf359A35362d43573',
  BitcoinFunctionEncoder.onReport('Hello')
);

console.log('Binary Payload (hex):');
console.log(binaryPayload.toString('hex'));
console.log();

console.log('Breakdown:');
console.log('  First 4 bytes (protocol):', binaryPayload.slice(0, 4).toString('hex'), '=', binaryPayload.slice(0, 4).toString('ascii'));
console.log('  Byte 5 (version):', binaryPayload[4]);
console.log('  Bytes 6-13 (chain selector):', binaryPayload.slice(5, 13).toString('hex'));
console.log('  Bytes 14-33 (contract):', '0x' + binaryPayload.slice(13, 33).toString('hex'));
console.log('  Rest: calldata');
console.log();

// ============================================
// Example 3: Detect Espresso Messages
// ============================================
console.log('Example 3: Detect Espresso Messages');
console.log('─────────────────────────────────────────────');

// Valid Espresso message
const validMsg = binaryPayload;
console.log('Valid Espresso message:', BitcoinCommandEncoder.isEspressoMessage(validMsg));

// Invalid messages
const invalidMsg1 = Buffer.from('NOT_Espresso_MESSAGE');
console.log('Random data:', BitcoinCommandEncoder.isEspressoMessage(invalidMsg1));

const invalidMsg2 = Buffer.from([0x00, 0x00, 0x00, 0x00]);
console.log('Zero bytes:', BitcoinCommandEncoder.isEspressoMessage(invalidMsg2));

const tooShort = Buffer.from([0x42, 0x4D]);
console.log('Too short:', BitcoinCommandEncoder.isEspressoMessage(tooShort));
console.log();

// ============================================
// Example 4: Relayer Filtering
// ============================================
console.log('Example 4: Relayer Filter Logic');
console.log('─────────────────────────────────────────────');

// Simulate Bitcoin transaction OP_RETURN outputs
const mockTransactions = [
  {
    txid: 'abc123',
    opReturn: Buffer.concat([
      Buffer.from([0x42, 0x4D, 0x43, 0x50]), // Espresso magic
      Buffer.from('payload1')
    ])
  },
  {
    txid: 'def456',
    opReturn: Buffer.from('random data')
  },
  {
    txid: 'ghi789',
    opReturn: Buffer.concat([
      Buffer.from([0x42, 0x4D, 0x43, 0x50]), // Espresso magic
      Buffer.from('payload2')
    ])
  },
];

console.log('Filtering Bitcoin transactions...\n');
mockTransactions.forEach((tx) => {
  const isEspresso = BitcoinCommandEncoder.isEspressoMessage(tx.opReturn);
  console.log(`TX ${tx.txid}:`);
  console.log(`  OP_RETURN: ${tx.opReturn.toString('hex').slice(0, 20)}...`);
  console.log(`  Is Espresso: ${isEspresso ? '✓ YES' : '✗ NO'}`);
  
  if (isEspresso) {
    console.log(`  → Forward to EVM`);
  }
  console.log();
});

// ============================================
// Example 5: Full OP_RETURN Structure
// ============================================
console.log('Example 5: Full Bitcoin OP_RETURN Structure');
console.log('─────────────────────────────────────────────');

const fullPayload = BitcoinCommandEncoder.encodeBinary(
  'SEPOLIA',
  '0x2BaE8224110482eC6dDF12faf359A35362d43573',
  BitcoinFunctionEncoder.onReport('Hey From Bitcoin'),
  {
    nonce: 42,
    deadline: Math.floor(Date.now() / 1000) + 3600
  }
);

console.log('Bitcoin Transaction Output:');
console.log('┌────────────────────────────────────────┐');
console.log('│ Output Type: OP_RETURN                 │');
console.log('│ Value: 0 sats                          │');
console.log('│ Script:                                │');
console.log('│   OP_RETURN (0x6a)                     │');
console.log('│   <data_push_opcode>                   │');
console.log('│   <data>:                              │');
console.log('│     ├─ Espresso Magic (4 bytes)            │');
console.log('│     │  = 0x424D4350 ("Espresso")           │');
console.log('│     ├─ Version (1 byte)                │');
console.log('│     ├─ Chain Selector (8 bytes)        │');
console.log('│     ├─ Contract Address (20 bytes)     │');
console.log('│     ├─ Data Length (2 bytes)           │');
console.log('│     ├─ Calldata (variable)             │');
console.log('│     ├─ Nonce (4 bytes, optional)       │');
console.log('│     └─ Deadline (4 bytes, optional)    │');
console.log('└────────────────────────────────────────┘');
console.log();
console.log('Total size:', fullPayload.length, 'bytes');
console.log('Hex preview:', fullPayload.toString('hex').slice(0, 60) + '...');
console.log();

// ============================================
// Example 6: Decode and Validate
// ============================================
console.log('Example 6: Decode and Validate');
console.log('─────────────────────────────────────────────');

try {
  const decoded = BitcoinCommandEncoder.decodeBinary(fullPayload);
  
  console.log('✓ Successfully decoded:');
  console.log('  Protocol:', decoded.protocol);
  console.log('  Protocol Magic:', '0x' + decoded.protocolMagic.toString(16));
  console.log('  Version:', decoded.version);
  console.log('  Chain Selector:', decoded.chainSelector.toString());
  console.log('  Chain:', BitcoinCommandEncoder.getChainName(decoded.chainSelector));
  console.log('  Contract:', decoded.contract);
  console.log('  Nonce:', decoded.nonce);
  console.log('  Deadline:', decoded.deadline);
  console.log('  Data:', decoded.data.slice(0, 20) + '...');
} catch (error) {
  console.log('✗ Decode failed:', error);
}
console.log();

// Try to decode invalid data
console.log('Attempting to decode invalid data...');
const invalidData = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x01]);
try {
  BitcoinCommandEncoder.decodeBinary(invalidData);
  console.log('✗ Should have thrown error');
} catch (error: any) {
  console.log('✓ Correctly rejected:', error.message);
}
console.log();

// ============================================
// Example 7: Relayer Workflow
// ============================================
console.log('Example 7: Relayer Workflow Simulation');
console.log('─────────────────────────────────────────────');

console.log('Relayer Process:');
console.log();
console.log('1. Scan Bitcoin blocks for new transactions');
console.log('   → Found 1,247 transactions in block 850,123');
console.log();
console.log('2. Filter for OP_RETURN outputs');
console.log('   → Found 15 OP_RETURN outputs');
console.log();
console.log('3. Check protocol magic (0x424D4350)');
console.log('   → 2 outputs start with Espresso magic ✓');
console.log();
console.log('4. Decode Espresso messages');
console.log('   → Message 1: Chain Selector = Sepolia');
console.log('   → Message 2: Chain Selector = Base');
console.log();
console.log('5. Validate messages');
console.log('   → Version check ✓');
console.log('   → Contract address format ✓');
console.log('   → Deadline not expired ✓');
console.log();
console.log('6. Forward to target chains');
console.log('   → Submitting to Sepolia RPC...');
console.log('   → Submitting to Base RPC...');
console.log('   → Both transactions confirmed ✓');
console.log();

console.log('=== All Examples Complete ===');

