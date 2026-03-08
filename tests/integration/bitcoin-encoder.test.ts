/**
 * Integration tests for BitcoinCommandEncoder
 */

import { BitcoinCommandEncoder, BitcoinFunctionEncoder, CHAIN_SELECTORS } from '../../packages/sdk/bitcoin';

console.log('🧪 Testing BitcoinCommandEncoder\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error: any) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================
// Test 1: Protocol Magic
// ============================================
test('Protocol magic is correct', () => {
  // Just verify magic in actual payload
  const payload = BitcoinCommandEncoder.encodeBinary(
    'SEPOLIA',
    '0x2BaE8224110482eC6dDF12faf359A35362d43573',
    BitcoinFunctionEncoder.onReport('Test')
  );
  const payloadMagic = payload.readUInt32BE(0);
  assert(payloadMagic === 0x424d4350, `Expected 0x424d4350, got 0x${payloadMagic.toString(16)}`);
  
  // Check ASCII representation
  const ascii = payload.slice(0, 4).toString('ascii');
  assert(ascii === 'BMCP', `Expected "BMCP", got "${ascii}"`);
});

// ============================================
// Test 2: Binary Encoding
// ============================================
test('Binary encoding includes protocol magic', () => {
  const payload = BitcoinCommandEncoder.encodeBinary(
    'SEPOLIA',
    '0x2BaE8224110482eC6dDF12faf359A35362d43573',
    BitcoinFunctionEncoder.onReport('Test')
  );
  
  // Check first 4 bytes are BMCP magic
  const magic = payload.readUInt32BE(0);
  assert(magic === 0x424d4350, `First 4 bytes should be BMCP magic`);
  
  // Check version
  assert(payload[4] === 1, `Version should be 1`);
  
  // Check it's not too large
  assert(payload.length < 80000, `Payload should be under 80KB`);
});

// ============================================
// Test 3: Binary Decoding
// ============================================
test('Binary decoding works correctly', () => {
  const original = BitcoinCommandEncoder.encodeBinary(
    'SEPOLIA',
    '0x2BaE8224110482eC6dDF12faf359A35362d43573',
    BitcoinFunctionEncoder.onReport('Hello'),
    { nonce: 42, deadline: 1234567890 }
  );
  
  const decoded = BitcoinCommandEncoder.decodeBinary(original);
  
  assert(decoded.protocol === 'BMCP', 'Protocol should be BMCP');
  assert(decoded.protocolMagic === 0x424d4350, 'Magic should match');
  assert(decoded.version === 1, 'Version should be 1');
  assert(decoded.chainSelector === CHAIN_SELECTORS.SEPOLIA, 'Chain selector should be Sepolia');
  assert(decoded.contract.toLowerCase() === '0x2bae8224110482ec6ddf12faf359a35362d43573', 'Contract should match');
  assert(decoded.nonce === 42, 'Nonce should be 42');
  assert(decoded.deadline === 1234567890, 'Deadline should match');
});

// ============================================
// Test 4: Protocol Detection
// ============================================
test('Protocol detection works', () => {
  // Valid BMCP message
  const validMsg = BitcoinCommandEncoder.encodeBinary(
    'SEPOLIA',
    '0x2BaE8224110482eC6dDF12faf359A35362d43573',
    BitcoinFunctionEncoder.onReport('Test')
  );
  
  assert(BitcoinCommandEncoder.isBMCPMessage(validMsg), 'Should detect valid BMCP message');
  
  // Invalid messages
  const invalidMsg1 = Buffer.from('NOT_BMCP');
  assert(!BitcoinCommandEncoder.isBMCPMessage(invalidMsg1), 'Should reject non-BMCP data');
  
  const invalidMsg2 = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  assert(!BitcoinCommandEncoder.isBMCPMessage(invalidMsg2), 'Should reject zero bytes');
  
  const tooShort = Buffer.from([0x42, 0x4d]);
  assert(!BitcoinCommandEncoder.isBMCPMessage(tooShort), 'Should reject too short data');
});

// ============================================
// Test 5: JSON Encoding
// ============================================
test('JSON encoding works', () => {
  const json = BitcoinCommandEncoder.encodeJSON(
    'SEPOLIA',
    '0x2BaE8224110482eC6dDF12faf359A35362d43573',
    BitcoinFunctionEncoder.onReport('Test'),
    { nonce: 10 }
  );
  
  const parsed = JSON.parse(json);
  
  assert(parsed.protocol === 'BMCP', 'Protocol should be BMCP');
  assert(parsed.version === 1, 'Version should be 1');
  assert(parsed.chainSelector === CHAIN_SELECTORS.SEPOLIA.toString(), 'Chain selector should match');
  assert(parsed.nonce === 10, 'Nonce should be 10');
});

// ============================================
// Test 6: JSON Decoding
// ============================================
test('JSON decoding works', () => {
  const json = BitcoinCommandEncoder.encodeJSON(
    'BASE',
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    BitcoinFunctionEncoder.onReport('Test message')
  );
  
  const decoded = BitcoinCommandEncoder.decodeJSON(json);
  
  assert(decoded.protocol === 'BMCP', 'Protocol should be BMCP');
  assert(decoded.chainSelector === CHAIN_SELECTORS.BASE.toString(), 'Should be Base chain');
  assert(decoded.contract === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', 'Contract should match');
});

// ============================================
// Test 7: Chain Selector Mapping
// ============================================
test('Chain selector mapping works', () => {
  const chains: Array<keyof typeof CHAIN_SELECTORS> = [
    'SEPOLIA',
    'BASE',
    'BASE_SEPOLIA',
    'POLYGON',
    'ARBITRUM',
    'OPTIMISM',
    'CITREA',
  ];
  
  chains.forEach((chainKey) => {
    const selector = CHAIN_SELECTORS[chainKey];
    const name = BitcoinCommandEncoder.getChainName(selector);
    assert(name === chainKey, `Chain name should match for ${chainKey}`);
  });
});

// ============================================
// Test 8: Function Encoding
// ============================================
test('Function encoding works', () => {
  // Test onReport
  const onReport = BitcoinFunctionEncoder.onReport('Hello World');
  assert(onReport.signature === 'onReport(string)', 'Signature should match');
  assert(onReport.args[0] === 'Hello World', 'Args should match');
  
  // Test transfer
  const transfer = BitcoinFunctionEncoder.transfer('0xAddress', 1000n);
  assert(transfer.signature === 'transfer(address,uint256)', 'Transfer signature should match');
  assert(transfer.args[0] === '0xAddress', 'Transfer address should match');
  assert(transfer.args[1] === 1000n, 'Transfer amount should match');
  
  // Test approve
  const approve = BitcoinFunctionEncoder.approve('0xSpender', 2000n);
  assert(approve.signature === 'approve(address,uint256)', 'Approve signature should match');
});

// ============================================
// Test 9: Size Validation
// ============================================
test('Size validation works', () => {
  const smallPayload = BitcoinCommandEncoder.encodeBinary(
    'SEPOLIA',
    '0x2BaE8224110482eC6dDF12faf359A35362d43573',
    BitcoinFunctionEncoder.onReport('Small')
  );
  
  const validation = BitcoinCommandEncoder.validateSize(smallPayload);
  assert(validation.valid, 'Small payload should be valid');
  assert(validation.size === smallPayload.length, 'Size should match');
  assert(validation.maxSize === 80000, 'Max size should be 80KB');
});

// ============================================
// Test 10: Multiple Chains
// ============================================
test('Encoding for multiple chains works', () => {
  const chains: Array<keyof typeof CHAIN_SELECTORS> = ['SEPOLIA', 'BASE', 'POLYGON'];
  const contract = '0x2BaE8224110482eC6dDF12faf359A35362d43573';
  
  chains.forEach((chain) => {
    const payload = BitcoinCommandEncoder.encodeBinary(
      chain,
      contract,
      BitcoinFunctionEncoder.onReport(`Message to ${chain}`)
    );
    
    const decoded = BitcoinCommandEncoder.decodeBinary(payload);
    assert(decoded.chainSelector === CHAIN_SELECTORS[chain], `Chain selector should match for ${chain}`);
  });
});

// ============================================
// Test 11: Round-trip Binary
// ============================================
test('Round-trip binary encoding/decoding works', () => {
  const originalContract = '0x2BaE8224110482eC6dDF12faf359A35362d43573';
  const originalMessage = 'Test message for round-trip';
  const originalNonce = 99;
  const originalDeadline = 9999999;
  
  const encoded = BitcoinCommandEncoder.encodeBinary(
    'SEPOLIA',
    originalContract,
    BitcoinFunctionEncoder.onReport(originalMessage),
    { nonce: originalNonce, deadline: originalDeadline }
  );
  
  const decoded = BitcoinCommandEncoder.decodeBinary(encoded);
  
  assert(decoded.contract.toLowerCase() === originalContract.toLowerCase(), 'Contract should match');
  assert(decoded.nonce === originalNonce, 'Nonce should match');
  assert(decoded.deadline === originalDeadline, 'Deadline should match');
  assert(decoded.protocol === 'BMCP', 'Protocol should be BMCP');
});

// ============================================
// Test 12: Round-trip JSON
// ============================================
test('Round-trip JSON encoding/decoding works', () => {
  const originalContract = '0x2BaE8224110482eC6dDF12faf359A35362d43573';
  const originalNonce = 55;
  
  const encoded = BitcoinCommandEncoder.encodeJSON(
    'BASE',
    originalContract,
    BitcoinFunctionEncoder.onReport('JSON test'),
    { nonce: originalNonce }
  );
  
  const decoded = BitcoinCommandEncoder.decodeJSON(encoded);
  
  assert(decoded.protocol === 'BMCP', 'Protocol should be BMCP');
  assert(decoded.contract === originalContract.toLowerCase(), 'Contract should match');
  assert(decoded.nonce === originalNonce, 'Nonce should match');
  assert(decoded.chainSelector === CHAIN_SELECTORS.BASE.toString(), 'Chain selector should match');
});

// ============================================
// Test 13: Invalid Protocol Magic Rejection
// ============================================
test('Invalid protocol magic is rejected', () => {
  const invalidPayload = Buffer.from([
    0xFF, 0xFF, 0xFF, 0xFF, // Wrong magic
    0x01, // Version
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, // Chain selector
  ]);
  
  let errorThrown = false;
  try {
    BitcoinCommandEncoder.decodeBinary(invalidPayload);
  } catch (error: any) {
    errorThrown = true;
    // Just check that an error was thrown, message format may vary
    assert(error.message.length > 0, 'Should throw an error');
  }
  
  assert(errorThrown, 'Should throw error for invalid magic');
});

// ============================================
// Summary
// ============================================
console.log('\n' + '='.repeat(50));
console.log('Test Results:');
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📊 Total: ${testsPassed + testsFailed}`);
console.log('='.repeat(50));

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed!');
  process.exit(1);
}

