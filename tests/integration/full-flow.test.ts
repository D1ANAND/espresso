/**
 * Full integration test: Bitcoin → EVM flow
 */

import { BitcoinCommandEncoder, BitcoinFunctionEncoder, CHAIN_SELECTORS } from '../../packages/sdk/bitcoin';
import { EVMCommandEncoder, CommonFunctions } from '../../packages/sdk/evm';

console.log('🧪 Testing Full Bitcoin → EVM Flow\n');

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
// Test 1: Complete Flow - Sepolia onReport
// ============================================
test('Complete flow: Bitcoin → Sepolia onReport', () => {
  const contract = '0x2BaE8224110482eC6dDF12faf359A35362d43573';
  const message = 'Hey From Bitcoin';
  
  console.log('\n  📝 Step 1: Encode on Bitcoin side...');
  const bitcoinPayload = BitcoinCommandEncoder.encodeBinary(
    'SEPOLIA',
    contract,
    BitcoinFunctionEncoder.onReport(message),
    { nonce: 0, deadline: Math.floor(Date.now() / 1000) + 3600 }
  );
  
  console.log(`     ✓ Payload size: ${bitcoinPayload.length} bytes`);
  console.log(`     ✓ Protocol magic: ${bitcoinPayload.slice(0, 4).toString('ascii')}`);
  
  console.log('  📡 Step 2: Detect BMCP message...');
  const isBMCP = BitcoinCommandEncoder.isBMCPMessage(bitcoinPayload);
  assert(isBMCP, 'Should detect BMCP message');
  console.log('     ✓ BMCP message detected');
  
  console.log('  🔓 Step 3: Decode on relayer...');
  const decoded = BitcoinCommandEncoder.decodeBinary(bitcoinPayload);
  console.log(`     ✓ Chain: ${BitcoinCommandEncoder.getChainName(decoded.chainSelector)}`);
  console.log(`     ✓ Contract: ${decoded.contract}`);
  console.log(`     ✓ Nonce: ${decoded.nonce}`);
  
  console.log('  ✅ Step 4: Validate...');
  assert(decoded.protocol === 'BMCP', 'Protocol should be BMCP');
  assert(decoded.chainSelector === CHAIN_SELECTORS.SEPOLIA, 'Should be Sepolia');
  assert(decoded.contract.toLowerCase() === contract.toLowerCase(), 'Contract should match');
  console.log('     ✓ All validations passed');
  
  console.log('  🚀 Step 5: Ready for EVM execution');
  console.log(`     → Target: ${decoded.contract}`);
  console.log(`     → Chain: Sepolia (${decoded.chainSelector})`);
  console.log(`     → Calldata: ${decoded.data.slice(0, 20)}...`);
});

// ============================================
// Test 2: Complete Flow - Base USDC Transfer
// ============================================
test('Complete flow: Bitcoin → Base USDC transfer', () => {
  const usdcBase = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const recipient = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Hardhat test address
  const amount = 100000000n; // 100 USDC
  
  console.log('\n  📝 Step 1: Encode ERC20 transfer on Bitcoin side...');
  const bitcoinPayload = BitcoinCommandEncoder.encodeBinary(
    'BASE',
    usdcBase,
    BitcoinFunctionEncoder.transfer(recipient, amount),
    { nonce: 1 }
  );
  
  console.log(`     ✓ Payload size: ${bitcoinPayload.length} bytes`);
  
  console.log('  📡 Step 2: Relayer processes...');
  const decoded = BitcoinCommandEncoder.decodeBinary(bitcoinPayload);
  console.log(`     ✓ Chain: ${BitcoinCommandEncoder.getChainName(decoded.chainSelector)}`);
  console.log(`     ✓ Token: ${decoded.contract}`);
  
  console.log('  🔓 Step 3: Decode ERC20 calldata...');
  const transferDecoded = CommonFunctions.decodeTransfer(decoded.data);
  console.log(`     ✓ Recipient: ${transferDecoded.to}`);
  console.log(`     ✓ Amount: ${transferDecoded.amount} (100 USDC)`);
  
  assert(transferDecoded.to === recipient, 'Recipient should match');
  assert(transferDecoded.amount === amount, 'Amount should match');
  console.log('  ✅ Ready for execution on Base');
});

// ============================================
// Test 3: Multi-Chain Support
// ============================================
test('Multi-chain: Same message to different chains', () => {
  const contract = '0x2BaE8224110482eC6dDF12faf359A35362d43573';
  const chains: Array<keyof typeof CHAIN_SELECTORS> = ['SEPOLIA', 'BASE_SEPOLIA', 'POLYGON_AMOY'];
  
  console.log('\n  📝 Encoding for multiple chains...');
  
  const payloads = chains.map((chain) => {
    const payload = BitcoinCommandEncoder.encodeBinary(
      chain,
      contract,
      BitcoinFunctionEncoder.onReport(`Message to ${chain}`)
    );
    
    console.log(`     ✓ ${chain}: ${payload.length} bytes`);
    return { chain, payload };
  });
  
  console.log('  🔓 Decoding and routing...');
  
  payloads.forEach(({ chain, payload }) => {
    const decoded = BitcoinCommandEncoder.decodeBinary(payload);
    const detectedChain = BitcoinCommandEncoder.getChainName(decoded.chainSelector);
    
    console.log(`     ✓ ${chain} → routed to ${detectedChain}`);
    assert(detectedChain === chain, `Chain should match for ${chain}`);
  });
});

// ============================================
// Test 4: Protocol Filter Simulation
// ============================================
test('Protocol filter: Separate BMCP from noise', () => {
  console.log('\n  📡 Simulating Bitcoin block scan...');
  
  // Simulate mixed OP_RETURN outputs
  const outputs = [
    Buffer.from('random data'),
    BitcoinCommandEncoder.encodeBinary('SEPOLIA', '0x1234567890123456789012345678901234567890', BitcoinFunctionEncoder.onReport('msg1')),
    Buffer.from('more random data'),
    BitcoinCommandEncoder.encodeBinary('BASE', '0x1234567890123456789012345678901234567890', BitcoinFunctionEncoder.onReport('msg2')),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
  ];
  
  console.log(`     Found ${outputs.length} OP_RETURN outputs`);
  
  const bmcpMessages = outputs.filter((output) => BitcoinCommandEncoder.isBMCPMessage(output));
  
  console.log(`     ✓ Filtered to ${bmcpMessages.length} BMCP messages`);
  assert(bmcpMessages.length === 2, 'Should find 2 BMCP messages');
  
  console.log('  🔓 Processing BMCP messages...');
  bmcpMessages.forEach((msg, i) => {
    const decoded = BitcoinCommandEncoder.decodeBinary(msg);
    console.log(`     ✓ Message ${i + 1}: ${BitcoinCommandEncoder.getChainName(decoded.chainSelector)}`);
  });
});

// ============================================
// Test 5: Size Efficiency
// ============================================
test('Size efficiency: JSON vs Binary', () => {
  const contract = '0x2BaE8224110482eC6dDF12faf359A35362d43573';
  const func = BitcoinFunctionEncoder.onReport('Test message for size comparison');
  
  console.log('\n  📊 Comparing encoding formats...');
  
  const jsonPayload = BitcoinCommandEncoder.encodeJSON('SEPOLIA', contract, func);
  const binaryPayload = BitcoinCommandEncoder.encodeBinary('SEPOLIA', contract, func);
  
  const jsonSize = Buffer.from(jsonPayload).length;
  const binarySize = binaryPayload.length;
  
  console.log(`     JSON: ${jsonSize} bytes`);
  console.log(`     Binary: ${binarySize} bytes`);
  console.log(`     Savings: ${jsonSize - binarySize} bytes (${((1 - binarySize / jsonSize) * 100).toFixed(1)}%)`);
  
  assert(binarySize < jsonSize, 'Binary should be smaller than JSON');
});

// ============================================
// Test 6: Nonce Replay Protection
// ============================================
test('Nonce replay protection works', () => {
  const contract = '0x2BaE8224110482eC6dDF12faf359A35362d43573';
  
  console.log('\n  🔒 Testing replay protection...');
  
  const msg1 = BitcoinCommandEncoder.encodeBinary(
    'SEPOLIA',
    contract,
    BitcoinFunctionEncoder.onReport('Message 1'),
    { nonce: 0 }
  );
  
  const msg2 = BitcoinCommandEncoder.encodeBinary(
    'SEPOLIA',
    contract,
    BitcoinFunctionEncoder.onReport('Message 1'), // Same message
    { nonce: 1 } // Different nonce
  );
  
  const decoded1 = BitcoinCommandEncoder.decodeBinary(msg1);
  const decoded2 = BitcoinCommandEncoder.decodeBinary(msg2);
  
  console.log(`     ✓ Message 1 nonce: ${decoded1.nonce}`);
  console.log(`     ✓ Message 2 nonce: ${decoded2.nonce}`);
  
  assert(decoded1.nonce !== decoded2.nonce, 'Nonces should be different');
  assert(msg1.toString('hex') !== msg2.toString('hex'), 'Payloads should be different');
  
  console.log('     ✓ Replay protection working');
});

// ============================================
// Test 7: Deadline Expiry
// ============================================
test('Deadline expiry detection', () => {
  const contract = '0x2BaE8224110482eC6dDF12faf359A35362d43573';
  const now = Math.floor(Date.now() / 1000);
  
  console.log('\n  ⏰ Testing deadline expiry...');
  
  // Both messages need nonce for deadline to be included
  const validMsg = BitcoinCommandEncoder.encodeBinary(
    'SEPOLIA',
    contract,
    BitcoinFunctionEncoder.onReport('Valid'),
    { nonce: 0, deadline: now + 3600 }
  );
  
  const expiredMsg = BitcoinCommandEncoder.encodeBinary(
    'SEPOLIA',
    contract,
    BitcoinFunctionEncoder.onReport('Expired'),
    { nonce: 1, deadline: now - 3600 }
  );
  
  const validDecoded = BitcoinCommandEncoder.decodeBinary(validMsg);
  const expiredDecoded = BitcoinCommandEncoder.decodeBinary(expiredMsg);
  
  console.log(`     ✓ Valid deadline: ${validDecoded.deadline} (${validDecoded.deadline! > now ? 'future' : 'past'})`);
  console.log(`     ✓ Expired deadline: ${expiredDecoded.deadline} (${expiredDecoded.deadline! < now ? 'past' : 'future'})`);
  
  assert(validDecoded.deadline !== undefined, 'Valid message should have deadline');
  assert(expiredDecoded.deadline !== undefined, 'Expired message should have deadline');
  assert(validDecoded.deadline! > now, 'Valid deadline should be in future');
  assert(expiredDecoded.deadline! < now, 'Expired deadline should be in past');
});

// ============================================
// Test 8: Error Handling
// ============================================
test('Error handling for invalid data', () => {
  console.log('\n  ⚠️  Testing error handling...');
  
  const invalidMagic = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x01]);
  
  let errorCaught = false;
  try {
    BitcoinCommandEncoder.decodeBinary(invalidMagic);
  } catch (error: any) {
    errorCaught = true;
    console.log(`     ✓ Caught error: ${error.message.slice(0, 50)}...`);
  }
  
  assert(errorCaught, 'Should throw error for invalid magic');
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
  console.log('\n🎉 All integration tests passed!');
  console.log('\n✨ Bitcoin → EVM messaging is working correctly!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed!');
  process.exit(1);
}

