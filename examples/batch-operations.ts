/**
 * Espresso Batch Operations Example
 * Demonstrates complex multi-step DeFi operations from Bitcoin
 */

import { BitcoinCCIPClient, CHAIN_SELECTORS } from '@espresso/client';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  Espresso Batch Operations Example                 ║');
  console.log('║  Complex DeFi Operations from Bitcoin          ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const client = new BitcoinCCIPClient({
    url: process.env.BITCOIN_RPC_URL || 'http://localhost:8332',
    user: process.env.BITCOIN_RPC_USER || 'bitcoin',
    password: process.env.BITCOIN_RPC_PASSWORD || 'password',
    network: 'testnet',
  });

  // DeFi Gateway contract on Base
  const defiGateway = '0xYourDeFiGatewayAddress'; // Replace with actual

  // Example: Swap BTC → USDC, then deposit to Aave
  const operations = {
    targets: [
      '0xUniswapRouter', // Uniswap Router
      '0xAavePool', // Aave Pool
      '0xCompoundController', // Compound
    ],
    calls: [
      // 1. Swap 0.5 BTC to USDC on Uniswap
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint256', 'uint256'],
        [
          '0xWBTC', // tokenIn
          '0xUSDC', // tokenOut
          ethers.parseEther('0.5'), // amountIn
          ethers.parseUnits('15000', 6), // minAmountOut (15,000 USDC)
        ]
      ),
      // 2. Deposit USDC to Aave
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256'],
        [
          '0xUSDC',
          ethers.parseUnits('10000', 6), // 10,000 USDC
        ]
      ),
      // 3. Borrow ETH from Compound with remaining USDC as collateral
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256'],
        [
          '0xETH',
          ethers.parseEther('3'), // Borrow 3 ETH
        ]
      ),
    ],
  };

  // Encode batch operation
  const messageData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes4', 'address[]', 'bytes[]'],
    [
      ethers.id('batchExecute(address[],bytes[])').slice(0, 10), // Function selector
      operations.targets,
      operations.calls,
    ]
  );

  console.log('📝 Batch Operation Details:');
  console.log('   Operations:', operations.targets.length);
  console.log('   1. Swap 0.5 BTC → USDC on Uniswap');
  console.log('   2. Deposit 10,000 USDC to Aave');
  console.log('   3. Borrow 3 ETH from Compound');
  console.log('   Total Message Size:', messageData.length, 'bytes\n');

  // Check if message fits in 100KB
  if (messageData.length > 100_000) {
    console.error('❌ Message too large:', messageData.length, 'bytes');
    process.exit(1);
  }

  console.log('📤 Sending batch operation to Bitcoin...');

  try {
    const receipt = await client.sendToBase(defiGateway, messageData, {
      gasLimit: 1_000_000, // Higher gas for complex operations
      allowOutOfOrderExecution: false,
    });

    console.log('✅ Batch operation submitted!');
    console.log('   Transaction ID:', receipt.txid);
    console.log('   All 3 operations will execute atomically on Base');
    console.log('   Monitor: https://blockstream.info/testnet/tx/' + receipt.txid);
    console.log('\n💡 This demonstrates the power of 100KB OP_RETURN:');
    console.log('   - Multiple complex operations in one Bitcoin TX');
    console.log('   - Atomic execution across multiple DeFi protocols');
    console.log('   - All secured by Bitcoin\'s immutability\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

