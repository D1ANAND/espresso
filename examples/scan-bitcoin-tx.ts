/**
 * Example: Scan Bitcoin Transaction for Espresso Messages
 * Analyzes the testnet transaction provided by the user
 */

import { config } from 'dotenv';
import { BitcoinScanner, createTatumTestnetScanner } from '../packages/relayer/src/BitcoinScanner';
import { BitcoinCommandEncoder } from '../packages/sdk/bitcoin';

// Load environment variables
config();

const TATUM_API_KEY = process.env.TATUM_API_KEY;
const TEST_TXID = 'c3c7add2097d94a01116de65f14a9fed765ec25594da1c8715e55b53ae760064';

if (!TATUM_API_KEY) {
  console.error('❌ Error: TATUM_API_KEY not found in environment variables');
  console.error('Please create a .env file with your Tatum API key');
  console.error('See .env.example for reference');
  process.exit(1);
}

async function main() {
  console.log('=== Bitcoin Transaction Scanner ===\n');

  // Create scanner
  const scanner = createTatumTestnetScanner(TATUM_API_KEY);

  console.log('📡 Fetching transaction from Bitcoin testnet4...');
  console.log(`TX: ${TEST_TXID}\n`);

  // Get transaction
  const tx = await scanner.getTransaction(TEST_TXID);

  console.log('✅ Transaction found:');
  console.log(`  Block: ${tx.blockhash ? tx.blockhash.slice(0, 16) + '...' : 'Unconfirmed'}`);
  console.log(`  Size: ${tx.size} bytes (${tx.vsize} vbytes)`);
  console.log(`  Inputs: ${tx.vin.length}`);
  console.log(`  Outputs: ${tx.vout.length}`);
  console.log();

  // Find OP_RETURN outputs
  console.log('🔍 Scanning for OP_RETURN outputs...');
  const opReturns = scanner.scanTransactionForOPReturn(tx);

  console.log(`Found ${opReturns.length} OP_RETURN output(s)\n`);

  // Analyze each OP_RETURN
  opReturns.forEach((opReturn, i) => {
    console.log(`OP_RETURN ${i + 1}:`);
    console.log(`  Length: ${opReturn.length} bytes`);
    console.log(`  Hex: ${opReturn.toString('hex').slice(0, 60)}...`);
    console.log(`  First 4 bytes: 0x${opReturn.slice(0, 4).toString('hex')}`);
    
    // Check if it's a Espresso message
    const isEspresso = BitcoinCommandEncoder.isEspressoMessage(opReturn);
    console.log(`  Is Espresso? ${isEspresso ? '✅ YES' : '❌ NO'}`);
    
    if (!isEspresso) {
      // Try to identify what it is
      const firstBytes = opReturn.slice(0, 4).toString('hex');
      if (firstBytes === 'e5d5b962') {
        console.log(`  → Looks like function selector (probably onReport)`);
        console.log(`  → This is raw calldata, NOT a Espresso message`);
        console.log(`  → Missing Espresso protocol magic (0x424D4350)`);
      }
    } else {
      // Decode Espresso message
      try {
        const decoded = BitcoinCommandEncoder.decodeBinary(opReturn);
        console.log(`  ✅ Decoded Espresso message:`);
        console.log(`     Protocol: ${decoded.protocol}`);
        console.log(`     Version: ${decoded.version}`);
        console.log(`     Chain: ${BitcoinCommandEncoder.getChainName(decoded.chainSelector)}`);
        console.log(`     Contract: ${decoded.contract}`);
        console.log(`     Nonce: ${decoded.nonce}`);
        console.log(`     Deadline: ${decoded.deadline}`);
      } catch (error: any) {
        console.log(`  ❌ Decode failed: ${error.message}`);
      }
    }
    console.log();
  });

  // Show what a proper Espresso message would look like
  console.log('─'.repeat(60));
  console.log('\n💡 How to create a proper Espresso message:\n');

  const properEspresso = BitcoinCommandEncoder.encodeBinary(
    'SEPOLIA',
    '0x2BaE8224110482eC6dDF12faf359A35362d43573',
    {
      signature: 'onReport(string)',
      args: ['Hey From Bitcoin']
    },
    {
      nonce: 0,
      deadline: Math.floor(Date.now() / 1000) + 3600
    }
  );

  console.log('Proper Espresso message:');
  console.log(`  Length: ${properEspresso.length} bytes`);
  console.log(`  First 4 bytes: 0x${properEspresso.slice(0, 4).toString('hex')} ("Espresso")`);
  console.log(`  Hex: ${properEspresso.toString('hex').slice(0, 60)}...`);
  console.log();

  console.log('Comparison:');
  console.log(`  Your TX:      0x${opReturns[0].slice(0, 4).toString('hex')} ❌ Not Espresso`);
  console.log(`  Proper Espresso:  0x${properEspresso.slice(0, 4).toString('hex')} ✅ Valid Espresso`);
  console.log();

  console.log('To create a proper Espresso transaction:');
  console.log('1. Use BitcoinCommandEncoder.encodeBinary() to create payload');
  console.log('2. Post payload to your bitcoin-api /psbt endpoint');
  console.log('3. Sign and broadcast the PSBT');
  console.log('4. Relayer will detect the Espresso magic and process it');
  console.log();

  // Scan for Espresso messages in transaction
  console.log('─'.repeat(60));
  console.log('\n🔎 Scanning for Espresso messages in transaction...\n');

  const messages = await scanner.scanTransactionForEspresso(TEST_TXID);

  console.log(`Result: Found ${messages.filter(m => m.isEspresso).length} Espresso message(s) out of ${messages.length} OP_RETURN(s)`);
  console.log();

  if (messages.filter(m => m.isEspresso).length === 0) {
    console.log('⚠️  No Espresso messages found in this transaction.');
    console.log('   The OP_RETURN data does not start with Espresso protocol magic.');
    console.log();
    console.log('✅ To fix: Use BitcoinCommandEncoder to create proper Espresso messages.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });

