/**
 * Example: Monitor Bitcoin Blocks for Espresso Messages
 * Continuously monitors new Bitcoin blocks for Espresso messages
 */

import { config } from 'dotenv';
import { createTatumTestnetScanner } from '../packages/relayer/src/BitcoinScanner';

// Load environment variables
config();

const TATUM_API_KEY = process.env.TATUM_API_KEY;

if (!TATUM_API_KEY) {
  console.error('❌ Error: TATUM_API_KEY not found in environment variables');
  console.error('Please create a .env file with your Tatum API key');
  console.error('See .env.example for reference');
  process.exit(1);
}

async function main() {
  console.log('=== Bitcoin Block Monitor ===\n');

  const scanner = createTatumTestnetScanner(TATUM_API_KEY);

  // Get current block height
  const startHeight = await scanner.getBlockCount();
  console.log(`📊 Current block height: ${startHeight}`);
  console.log(`🔍 Monitoring for new blocks with Espresso messages...\n`);

  // Monitor new blocks
  let blockCount = 0;
  for await (const messages of scanner.monitorNewBlocks(startHeight)) {
    blockCount++;

    console.log(`\n🆕 New block detected! (#${startHeight + blockCount})`);
    console.log(`   Found ${messages.length} Espresso message(s)`);

    for (const message of messages) {
      console.log(`\n   📨 Espresso Message:`);
      console.log(`      TX: ${message.txid.slice(0, 16)}...`);
      console.log(`      Output: ${message.outputIndex}`);

      if (message.decoded) {
        console.log(`      Chain: ${message.decoded.chainName}`);
        console.log(`      Contract: ${message.decoded.contract}`);
        console.log(`      Nonce: ${message.decoded.nonce}`);
        console.log(`      Data: ${message.decoded.data.slice(0, 20)}...`);
        
        console.log(`\n      ✅ Ready to forward to ${message.decoded.chainName}`);
      } else if (message.error) {
        console.log(`      ❌ Decode error: ${message.error}`);
      }
    }

    // In production, you would:
    // 1. Validate the message
    // 2. Check deadline hasn't expired
    // 3. Forward to target EVM chain
    // 4. Store in database for tracking
  }
}

// Run monitor
console.log('Starting Bitcoin block monitor...');
console.log('Press Ctrl+C to stop\n');

main().catch((error) => {
  console.error('\n❌ Monitor error:', error.message);
  process.exit(1);
});

