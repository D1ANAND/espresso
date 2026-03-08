/**
 * Integration tests for EVMCommandEncoder
 */

import { EVMCommandEncoder, CommonFunctions, EVM_CHAINS } from '../../packages/sdk/evm';
import { ethers } from 'ethers';

console.log('🧪 Testing EVMCommandEncoder\n');

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
// Test 1: Function Encoding
// ============================================
test('Function encoding works', () => {
  const calldata = EVMCommandEncoder.encodeFunction(
    'function onReport(string msg)',
    'onReport',
    ['Hello World']
  );
  
  assert(calldata.startsWith('0x'), 'Calldata should start with 0x');
  // Just check it has a selector
  const selector = calldata.slice(0, 10);
  assert(selector.length === 10, 'Should have 4-byte selector');
  assert(calldata.length > 10, 'Should have data beyond selector');
});

// ============================================
// Test 2: ERC20 Transfer Encoding
// ============================================
test('ERC20 transfer encoding works', () => {
  // Use a valid checksummed address
  const recipient = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Hardhat test address #1
  const calldata = CommonFunctions.encodeTransfer(
    recipient,
    ethers.parseUnits('100', 6)
  );
  
  assert(calldata.slice(0, 10) === '0xa9059cbb', 'Transfer selector should be correct');
  assert(calldata.length === 138, 'Transfer calldata should be 138 chars (4+32+32 bytes)');
});

// ============================================
// Test 3: ERC20 Approve Encoding
// ============================================
test('ERC20 approve encoding works', () => {
  const spender = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Hardhat test address
  const calldata = CommonFunctions.encodeApprove(
    spender,
    ethers.parseUnits('1000', 18)
  );
  
  assert(calldata.slice(0, 10) === '0x095ea7b3', 'Approve selector should be correct');
});

// ============================================
// Test 4: Function Decoding
// ============================================
test('Function decoding works', () => {
  const recipient = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const encoded = CommonFunctions.encodeTransfer(
    recipient,
    100000000n
  );
  
  const decoded = CommonFunctions.decodeTransfer(encoded);
  
  assert(decoded.to.toLowerCase() === recipient.toLowerCase(), 'Decoded address should match');
  assert(decoded.amount === 100000000n, 'Decoded amount should match');
});

// ============================================
// Test 5: Command Building
// ============================================
test('Command building works', () => {
  const calldata = CommonFunctions.encodeMessage('onReport(string)', 'Test');
  
  const cmd = EVMCommandEncoder.buildCommand(
    '0x2BaE8224110482eC6dDF12faf359A35362d43573',
    calldata,
    {
      chainKey: 'SEPOLIA',
      nonce: 42n,
    }
  );
  
  assert(cmd.target === '0x2BaE8224110482eC6dDF12faf359A35362d43573', 'Target should match');
  assert(cmd.data === calldata, 'Calldata should match');
  assert(cmd.nonce === 42n, 'Nonce should match');
  assert(cmd.chainId === 11155111n, 'Chain ID should be Sepolia');
  assert(cmd.value === 0n, 'Value should default to 0');
});

// ============================================
// Test 6: Command Hashing
// ============================================
test('Command hashing works', () => {
  const cmd = EVMCommandEncoder.buildCommand(
    '0x2BaE8224110482eC6dDF12faf359A35362d43573',
    '0xabcd',
    { chainKey: 'SEPOLIA' }
  );
  
  const hash = EVMCommandEncoder.hashCommand(cmd);
  
  assert(hash.startsWith('0x'), 'Hash should start with 0x');
  assert(hash.length === 66, 'Hash should be 66 chars (0x + 32 bytes)');
});

// ============================================
// Test 7: Different Nonces = Different Hashes
// ============================================
test('Different nonces produce different hashes', () => {
  const cmd1 = EVMCommandEncoder.buildCommand('0x1234567890123456789012345678901234567890', '0xabcd', {
    nonce: 0n,
  });
  
  const cmd2 = EVMCommandEncoder.buildCommand('0x1234567890123456789012345678901234567890', '0xabcd', {
    nonce: 1n,
  });
  
  const hash1 = EVMCommandEncoder.hashCommand(cmd1);
  const hash2 = EVMCommandEncoder.hashCommand(cmd2);
  
  assert(hash1 !== hash2, 'Different nonces should produce different hashes');
});

// ============================================
// Test 8: Bitcoin Encoding/Decoding
// ============================================
test('Bitcoin OP_RETURN encoding/decoding works', () => {
  const signedCmd = {
    target: '0x2BaE8224110482eC6dDF12faf359A35362d43573',
    value: 0n,
    data: CommonFunctions.encodeMessage('onReport(string)', 'Test'),
    nonce: 10n,
    deadline: 9999999n,
    chainId: 11155111n,
    pubKeyX: '0x' + '1234'.repeat(16),
    signature: '0x' + 'abcd'.repeat(32),
  };
  
  const encoded = EVMCommandEncoder.encodeForBitcoin(signedCmd);
  const decoded = EVMCommandEncoder.decodeFromBitcoin(encoded);
  
  assert(decoded.protocol === 'BMCP', 'Protocol should be BMCP');
  assert(decoded.chainKey === 'SEPOLIA', 'Should detect Sepolia');
  assert(decoded.command.target === signedCmd.target, 'Target should match');
  assert(decoded.command.nonce === 10n, 'Nonce should match');
});

// ============================================
// Test 9: Command Validation
// ============================================
test('Command validation works', () => {
  const validCmd = EVMCommandEncoder.buildCommand(
    '0x2BaE8224110482eC6dDF12faf359A35362d43573',
    CommonFunctions.encodeMessage('onReport(string)', 'Test'),
    {
      deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
    }
  );
  
  const result = EVMCommandEncoder.validateCommand(validCmd);
  
  assert(result.valid === true, 'Valid command should pass validation');
  assert(result.errors.length === 0, 'Should have no errors');
});

// ============================================
// Test 10: Invalid Address Rejected
// ============================================
test('Invalid address is rejected', () => {
  const invalidCmd = EVMCommandEncoder.buildCommand('invalid_address', '0xabcd');
  
  const result = EVMCommandEncoder.validateCommand(invalidCmd);
  
  assert(result.valid === false, 'Invalid address should fail validation');
  assert(result.errors.length > 0, 'Should have errors');
  assert(result.errors.some(e => e.includes('Invalid target address')), 'Should have address error');
});

// ============================================
// Test 11: Expired Deadline Rejected
// ============================================
test('Expired deadline is rejected', () => {
  const expiredCmd = EVMCommandEncoder.buildCommand(
    '0x2BaE8224110482eC6dDF12faf359A35362d43573',
    '0xabcd1234',
    {
      deadline: 0n,
    }
  );
  
  const result = EVMCommandEncoder.validateCommand(expiredCmd);
  
  assert(result.valid === false, 'Expired deadline should fail validation');
  assert(result.errors.some(e => e.includes('Deadline has passed')), 'Should have deadline error');
});

// ============================================
// Test 12: Chain Info Lookup
// ============================================
test('Chain info lookup works', () => {
  const sepoliaInfo = EVMCommandEncoder.getChainInfo(11155111n);
  
  assert(sepoliaInfo !== null, 'Should find Sepolia');
  assert(sepoliaInfo!.name === 'Sepolia', 'Name should be Sepolia');
  assert(sepoliaInfo!.chainId === 11155111n, 'Chain ID should match');
  
  const unknownInfo = EVMCommandEncoder.getChainInfo(99999999n);
  assert(unknownInfo === null, 'Unknown chain should return null');
});

// ============================================
// Test 13: Chain Selector Lookup
// ============================================
test('Chain selector lookup works', () => {
  const baseInfo = EVMCommandEncoder.getChainBySelector(BigInt('15971525489660198786'));
  
  assert(baseInfo !== null, 'Should find Base');
  assert(baseInfo!.name === 'Base', 'Name should be Base');
  assert(baseInfo!.chainId === 8453n, 'Chain ID should be Base mainnet');
});

// ============================================
// Test 14: All Chains Have Required Properties
// ============================================
test('All chains have required properties', () => {
  Object.entries(EVM_CHAINS).forEach(([key, chain]) => {
    assert(chain.name !== undefined, `${key} should have name`);
    assert(chain.chainId !== undefined, `${key} should have chainId`);
    assert(chain.chainSelector !== undefined, `${key} should have chainSelector`);
    assert(chain.rpcUrl !== undefined, `${key} should have rpcUrl`);
  });
});

// ============================================
// Test 15: Round-trip Encoding/Decoding
// ============================================
test('Round-trip encoding/decoding works', () => {
  const originalCmd = {
    target: '0x2BaE8224110482eC6dDF12faf359A35362d43573',
    value: 1000n,
    data: CommonFunctions.encodeMessage('onReport(string)', 'Round-trip test'),
    nonce: 123n,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 7200),
    chainId: 11155111n,
    pubKeyX: '0x' + 'abcd'.repeat(16),
    signature: '0x' + '1234'.repeat(32),
  };
  
  const encoded = EVMCommandEncoder.encodeForBitcoin(originalCmd);
  const decoded = EVMCommandEncoder.decodeFromBitcoin(encoded);
  
  assert(decoded.command.target === originalCmd.target, 'Target should match');
  assert(decoded.command.value === originalCmd.value, 'Value should match');
  assert(decoded.command.nonce === originalCmd.nonce, 'Nonce should match');
  assert(decoded.command.chainId === originalCmd.chainId, 'Chain ID should match');
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

