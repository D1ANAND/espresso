/**
 * Create New BMCP Encoded Data
 * Generates a fresh BMCP message ready for Bitcoin broadcast
 */

import { BitcoinCommandEncoder, BitcoinFunctionEncoder } from './packages/sdk/bitcoin';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         Create New BMCP Encoded Message                   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Configuration - UPDATE THESE VALUES
const config = {
  chain: 'SEPOLIA' as const,
  contract: '0x2BaE8224110482eC6dDF12faf359A35362d43573', // Your Sepolia contract
  message: 'Hello from Bitcoin - ' + new Date().toLocaleTimeString(), // Custom message
  nonce: 0,
  deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
};

console.log('📋 Message Configuration:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Chain:', config.chain);
console.log('  Contract:', config.contract);
console.log('  Message:', config.message);
console.log('  Nonce:', config.nonce);
console.log('  Deadline:', config.deadline, `(${new Date(config.deadline * 1000).toLocaleString()})`);
console.log();

// Encode the BMCP message
const bmcpPayload = BitcoinCommandEncoder.encodeBinary(
  config.chain,
  config.contract,
  BitcoinFunctionEncoder.onReport(config.message),
  {
    nonce: config.nonce,
    deadline: config.deadline,
  }
);

console.log('✅ BMCP Message Encoded!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log();

console.log('📦 Encoded Payload (Hex):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const hex = bmcpPayload.toString('hex');
console.log(hex);
console.log();

console.log('📊 Payload Details:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Size:', bmcpPayload.length, 'bytes');
console.log('  Protocol Magic:', '0x' + bmcpPayload.slice(0, 4).toString('hex').toUpperCase(), '("BMCP")');
console.log('  Version:', bmcpPayload[4]);
console.log('  Chain Selector:', '0x' + bmcpPayload.slice(5, 13).toString('hex'));
console.log('  Contract:', '0x' + bmcpPayload.slice(13, 33).toString('hex'));
console.log();

console.log('🔧 For bitcoin-api (POST /psbt):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(JSON.stringify({
  address: 'YOUR_BITCOIN_ADDRESS',
  sendBmcpData: '0x' + hex
}, null, 2));
console.log();

console.log('📋 cURL Command:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`curl -X POST http://localhost:3000/psbt \\
  -H "Content-Type: application/json" \\
  -d '{
    "address": "YOUR_BITCOIN_ADDRESS",
    "sendBmcpData": "0x${hex}"
  }'`);
console.log();

console.log('🎯 Next Steps:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. Copy the sendBmcpData value above');
console.log('2. Replace YOUR_BITCOIN_ADDRESS with your address');
console.log('3. POST to bitcoin-api to get PSBT');
console.log('4. Sign and broadcast the PSBT');
console.log('5. Monitor with relayer-api');
console.log();

// Show verification
console.log('✅ Verification:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const decoded = BitcoinCommandEncoder.decodeBinary(bmcpPayload);
console.log('  Protocol:', decoded.protocol);
console.log('  Contract:', decoded.contract);
console.log('  Nonce:', decoded.nonce);
console.log('  Deadline:', decoded.deadline, '✅');
console.log('  Data Length:', decoded.data.length, 'bytes');
console.log();

console.log('✅ Ready to broadcast!');
console.log();

// Also show different function encodings
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('💡 Other Function Examples:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log();

// Example 2: Transfer function
console.log('📌 ERC20 Transfer:');
const transferPayload = BitcoinCommandEncoder.encodeBinary(
  'SEPOLIA',
  '0x1234567890123456789012345678901234567890', // Token address
  BitcoinFunctionEncoder.transfer(
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    '1000000000000000000' // 1 token (18 decimals)
  ),
  { nonce: 0, deadline: config.deadline }
);
console.log('  Hex:', '0x' + transferPayload.toString('hex').slice(0, 40) + '...');
console.log('  Size:', transferPayload.length, 'bytes');
console.log();

// Example 3: Approve function
console.log('📌 ERC20 Approve:');
const approvePayload = BitcoinCommandEncoder.encodeBinary(
  'SEPOLIA',
  '0x1234567890123456789012345678901234567890',
  BitcoinFunctionEncoder.approve(
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    '1000000000000000000'
  ),
  { nonce: 0, deadline: config.deadline }
);
console.log('  Hex:', '0x' + approvePayload.toString('hex').slice(0, 40) + '...');
console.log('  Size:', approvePayload.length, 'bytes');
console.log();

// Example 4: Custom message
console.log('📌 Custom Message:');
const customPayload = BitcoinCommandEncoder.encodeBinary(
  'BASE_SEPOLIA',
  '0x2BaE8224110482eC6dDF12faf359A35362d43573',
  BitcoinFunctionEncoder.onReport('BMCP is awesome! 🚀'),
  { nonce: 1, deadline: config.deadline }
);
console.log('  Chain: BASE_SEPOLIA');
console.log('  Hex:', '0x' + customPayload.toString('hex').slice(0, 40) + '...');
console.log('  Size:', customPayload.length, 'bytes');
console.log();

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  All payloads ready for Bitcoin broadcast! 🎉             ║');
console.log('╚════════════════════════════════════════════════════════════╝');

