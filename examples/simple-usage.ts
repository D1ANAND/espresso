/**
 * Espresso Simple Usage Example
 * Demonstrates how to send a cross-chain message from Bitcoin to Base
 */

import { BitcoinCCIPClient, CHAIN_SELECTORS } from '@espresso/client';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  Espresso Simple Usage Example                     ║');
  console.log('║  Bitcoin → Base Cross-Chain Message            ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Initialize Bitcoin CCIP Client
  const client = new BitcoinCCIPClient({
    url: process.env.BITCOIN_RPC_URL || 'http://localhost:8332',
    user: process.env.BITCOIN_RPC_USER || 'bitcoin',
    password: process.env.BITCOIN_RPC_PASSWORD || 'password',
    network: 'testnet',
  });

  // Destination contract on Base
  const receiverContract = '0x1234567890123456789012345678901234567890'; // Replace with actual contract

  // Encode a simple deposit message
  const recipient = '0xYourEthereumAddress'; // Replace with actual address
  const amount = ethers.parseEther('0.1'); // 0.1 BTC

  const messageData = BitcoinCCIPClient.encodeDepositMessage(
    recipient,
    amount
  );

  console.log('📝 Message Details:');
  console.log('   Destination: Base Chain');
  console.log('   Receiver Contract:', receiverContract);
  console.log('   Function: deposit(address,uint256)');
  console.log('   Recipient:', recipient);
  console.log('   Amount:', ethers.formatEther(amount), 'BTC');
  console.log('   Message Size:', messageData.length, 'bytes\n');

  // Send the message
  console.log('📤 Sending cross-chain message...');

  try {
    const receipt = await client.sendToBase(receiverContract, messageData, {
      gasLimit: 300_000,
      allowOutOfOrderExecution: false,
    });

    console.log('✅ Message sent successfully!');
    console.log('   Transaction ID:', receipt.txid);
    console.log('   Message ID:', receipt.messageId);
    console.log('   Status:', receipt.status);
    console.log('\n⏳ Waiting for Bitcoin confirmation (~10 minutes)...');
    console.log('   Monitor at: https://blockstream.info/testnet/tx/' + receipt.txid);

    // Poll for confirmations
    let confirmations = 0;
    while (confirmations < 6) {
      await sleep(30000); // Check every 30 seconds

      const updatedReceipt = await client.getMessageReceipt(receipt.txid);
      confirmations = updatedReceipt.confirmations || 0;

      console.log(
        `   Confirmations: ${confirmations}/6 (${Math.round((confirmations / 6) * 100)}%)`
      );
    }

    console.log('\n✅ Bitcoin transaction confirmed!');
    console.log('   CRE Relayer will now forward to CCIP...');
    console.log('   Expected relay time: 2-5 minutes');
    console.log('   Expected total time: ~15-20 minutes\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run the example
main()
  .then(() => {
    console.log('✅ Example completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Example failed:', error);
    process.exit(1);
  });

