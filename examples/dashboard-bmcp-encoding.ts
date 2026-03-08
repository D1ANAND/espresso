/**
 * Dashboard Espresso Encoding Example
 * Shows how the dashboard generates Espresso data for PSBT signing
 */

import { BitcoinCommandEncoder, CHAIN_SELECTORS } from '../packages/sdk';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔨 Espresso Dashboard Encoding Example');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Example 1: Simple message encoding (recreating the user's example)
console.log('Example 1: Encoding a simple message (onReport)\n');

const message = "Hello from Bitcoin - 1:04:10 am";
const contract = '0x2bae8224110482ec6ddf12faf359a35362d43573';
const chainSelector = BigInt('0xde41ba4fc9d91ad9'); // Custom chain selector from user's example

// Encode using BitcoinCommandEncoder
const EspressoPayload = BitcoinCommandEncoder.encodeBinary(
  chainSelector,
  contract,
  {
    signature: 'onReport(string)',
    args: [message],
  },
  {
    nonce: 0,
    deadline: 1763874250, // Matches user's example
  }
);

const EspressoHex = '0x' + EspressoPayload.toString('hex');

console.log('Input Configuration:');
console.log('  Chain Selector:', '0x' + chainSelector.toString(16));
console.log('  Contract:', contract);
console.log('  Function:', 'onReport(string)');
console.log('  Message:', message);
console.log();

console.log('Generated Espresso Data:');
console.log(' ', EspressoHex);
console.log();

// Decode to verify
const decoded = BitcoinCommandEncoder.decodeBinary(EspressoPayload);
console.log('Decoded Message:');
console.log('  Protocol:', decoded.protocol);
console.log('  Version:', decoded.version);
console.log('  Chain Selector:', '0x' + decoded.chainSelector.toString(16));
console.log('  Contract:', decoded.contract);
console.log('  Data:', decoded.data);
console.log();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Example 2: Dashboard workflow - Deposit function
console.log('Example 2: Dashboard Workflow - Deposit Function\n');

const depositPayload = BitcoinCommandEncoder.encodeBinary(
  CHAIN_SELECTORS.BASE_SEPOLIA,
  '0x2bae8224110482ec6ddf12faf359a35362d43573',
  {
    signature: 'deposit(address,uint256)',
    args: ['0x0000000000000000000000000000000000000000', '1000000000000000000'],
  },
  {
    nonce: Math.floor(Date.now() / 1000),
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  }
);

const depositHex = '0x' + depositPayload.toString('hex');

console.log('Dashboard Configuration:');
console.log('  Chain: Base Sepolia');
console.log('  Contract: 0x2bae8224110482ec6ddf12faf359a35362d43573');
console.log('  Function: deposit(address,uint256)');
console.log('  Args: ["0x0000000000000000000000000000000000000000", "1000000000000000000"]');
console.log();

console.log('Generated Espresso Data:');
console.log(' ', depositHex);
console.log('  Size:', depositPayload.length, 'bytes');
console.log();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Example 3: Using with PSBT
console.log('Example 3: PSBT Workflow\n');

console.log('Step-by-step process:');
console.log();
console.log('1. Generate Espresso Data (from dashboard)');
console.log('   Copy the hex string like:', depositHex.slice(0, 50) + '...');
console.log();
console.log('2. Send to Bitcoin API');
console.log('   POST http://localhost:3000/psbt');
console.log('   Body: {');
console.log('     "address": "your_bitcoin_address",');
console.log('     "sendEspressoData": "' + depositHex.slice(0, 40) + '...",');
console.log('     "feeRateOverride": 10');
console.log('   }');
console.log();
console.log('3. Receive PSBT');
console.log('   Response includes:');
console.log('   - psbtBase64: base64 encoded PSBT');
console.log('   - psbtInputs: array of input indices to sign');
console.log();
console.log('4. Sign PSBT (with Xverse wallet)');
console.log('   Use sats-connect to sign the PSBT');
console.log();
console.log('5. Broadcast Transaction');
console.log('   POST http://localhost:3000/broadcast');
console.log('   Body: { "txBase64": "signed_psbt" }');
console.log();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Example 4: Different chain destinations
console.log('Example 4: Multi-Chain Support\n');

const chains = [
  { name: 'Base Sepolia', selector: CHAIN_SELECTORS.BASE_SEPOLIA },
  { name: 'Sepolia', selector: CHAIN_SELECTORS.SEPOLIA },
  { name: 'Polygon Amoy', selector: CHAIN_SELECTORS.POLYGON_AMOY },
  { name: 'Citrea Testnet', selector: CHAIN_SELECTORS.CITREA_TESTNET },
];

console.log('Supported Chains:');
chains.forEach((chain) => {
  const payload = BitcoinCommandEncoder.encodeBinary(
    chain.selector,
    '0x0000000000000000000000000000000000000000',
    {
      signature: 'test()',
      args: [],
    }
  );
  console.log(`  ${chain.name.padEnd(20)} → 0x${chain.selector.toString(16).padStart(16, '0')} (${payload.length} bytes)`);
});

console.log();
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ All examples completed!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

