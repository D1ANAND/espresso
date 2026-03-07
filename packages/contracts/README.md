# @bmcp/contracts

Solidity smart contracts for receiving cross-chain messages from Bitcoin on EVM chains.

## Contracts

### BitcoinCCIPReceiver

Abstract base contract for receiving messages from Bitcoin via CCIP.

```solidity
import "@bmcp/contracts/contracts/BitcoinCCIPReceiver.sol";

contract MyReceiver is BitcoinCCIPReceiver {
    constructor(address router, uint64 bitcoinChainSelector)
        BitcoinCCIPReceiver(router, bitcoinChainSelector)
    {}

    function processMessage(Client.Any2EVMMessage calldata message)
        external override
    {
        // Your logic here
    }
}
```

### SimpleBitcoinReceiver

Example implementation demonstrating basic message handling.

### BitcoinDeFiGateway

Advanced DeFi gateway supporting:
- Bitcoin deposits
- Token swaps
- Batch operations
- Balance tracking

## Development Setup

### Prerequisites

- Node.js 18 or later
- npm or yarn
- An Ethereum wallet with testnet/mainnet ETH
- Etherscan API key for contract verification

### Installation

```bash
npm install
```

### Configuration

#### Setting Up Secrets

This project uses Hardhat's keystore feature to securely manage secrets. Set up your environment variables:

```bash
# Set Sepolia RPC URL
npx hardhat keystore set --dev SEPOLIA_RPC_URL

# Set deployment private key
npx hardhat keystore set --dev SEPOLIA_PRIVATE_KEY

# Set Etherscan API key for verification
npx hardhat keystore set --dev ETHERSCAN_API_KEY
```

Each command will prompt you to enter the secret value securely. These secrets are stored locally and should never be committed to version control.

### Compilation

```bash
npm run compile
```

### Testing

```bash
npm run test
```

## Deployment & Verification

This project uses [Hardhat Ignition](https://hardhat.org/ignition) for declarative, reproducible deployments with automatic contract verification.

### Deploy to Sepolia

```bash
npm run deploy:sepolia -- ignition/modules/SimpleBitcoinReceiver.ts
```

The `--verify` flag is included by default to automatically verify contracts on Etherscan.

### Deploy Specific Contracts

**Simple Bitcoin Receiver (for testing):**
```bash
npm run deploy:sepolia -- ignition/modules/SimpleBitcoinReceiver.ts
```

**Custom Module:**
```bash
npx hardhat ignition deploy ignition/modules/YourModule.ts --network sepolia --verify
```

### Deploy to Local Network

For testing deployments locally:

```bash
npm run deploy:local -- ignition/modules/SimpleBitcoinReceiver.ts
```

### Manual Verification

If you need to verify a contract manually after deployment:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Creating Deployment Modules

Create new Ignition modules in `ignition/modules/`:

```typescript
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('YourContract', (m) => {
  const router = m.getParameter('router', '0x...');
  const bitcoinChainSelector = m.getParameter('bitcoinChainSelector', '12345678');

  const contract = m.contract('YourContract', [router, bitcoinChainSelector]);

  return { contract };
});
```

## Contract Addresses

Deployment addresses are managed by Hardhat Ignition and stored in `ignition/deployments/`.

## License

MIT

