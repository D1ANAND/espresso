# @bmcp/dashboard

Web dashboard for Bitcoin Multichain Protocol - allows users to create and send cross-chain messages from Bitcoin to EVM chains using BMCP binary encoding.

## Features

- 🔗 Multi-chain support (Base Sepolia, Sepolia, Polygon Amoy, Citrea Testnet)
- 👛 Xverse wallet integration for PSBT signing
- 🔨 Bitcoin SDK encoder for BMCP binary format
- 🔧 Function signature builder with common presets
- 📦 Real-time BMCP message preview with decoding
- ✅ Input validation
- 🎨 Modern, responsive UI with Tailwind CSS

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens the dashboard at http://localhost:5173 (default Vite port)

## Build

```bash
npm run build
```

## Prerequisites

1. **Bitcoin API Server** - Must be running on `http://localhost:3000`
   ```bash
   cd packages/bitcoin-api
   npm run dev
   ```

2. **Xverse Wallet** - Install the [Xverse Wallet](https://xverse.app) browser extension

3. **Bitcoin Testnet Funds** - Get some testnet4 BTC from a faucet

## Usage Guide

### Step 1: Configure Your Message

1. **Select Destination Chain**
   - Choose from Base Sepolia, Sepolia, Polygon Amoy, or Citrea Testnet
   - Each chain has its own selector automatically configured

2. **Enter Receiver Contract Address**
   - Must be a valid EVM address (0x... format)
   - This is the contract that will receive your message on the destination chain

3. **Choose Function Signature**
   - Select from common presets or enter custom
   - Examples:
     - `deposit(address,uint256)`
     - `transfer(address,uint256)`
     - `onReport(string)`

4. **Provide Function Arguments**
   - Enter as JSON array matching the function signature
   - Example: `["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "1000000000000000000"]`

### Step 2: Generate BMCP Data

Click the **"🔨 Generate BMCP Data"** button to encode your message.

The dashboard will:
- Encode your function call using ethers.js
- Wrap it in BMCP binary format using `BitcoinCommandEncoder.encodeBinary()`
- Generate a hex string like: `0x424d435001de41ba4fc9d91ad92bae...`
- Display a preview with decoded message details

**Example BMCP Data:**
```
0x424d435001de41ba4fc9d91ad92bae8224110482ec6ddf12faf359a35362d435730064f21355f40000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001f48656c6c6f2066726f6d20426974636f696e202d20313a30343a313020616d0000000000692295ca
```

### Step 3: Connect Xverse Wallet

Click **"Connect Xverse"** to connect your Bitcoin wallet.

- The dashboard will request access to your payment address
- Make sure you have testnet4 BTC for transaction fees

### Step 4: Create PSBT

Click **"Fetch PSBT"** to create an unsigned Bitcoin transaction.

The Bitcoin API will:
- Fetch your UTXOs from mempool.space
- Calculate transaction fees
- Create a PSBT with:
  - OP_RETURN output containing your BMCP data
  - Change output back to your address
- Return the unsigned PSBT in base64 format

### Step 5: Sign PSBT

Click **"Sign PSBT"** to sign the transaction with your wallet.

- Xverse will open and show transaction details
- Review the transaction carefully
- Approve to sign the PSBT

### Step 6: Broadcast Transaction

Click **"Broadcast Transaction"** to send your transaction to the Bitcoin network.

- The signed PSBT will be finalized and broadcast
- You'll receive a transaction hash (txid)
- View your transaction on mempool.space

## BMCP Message Format

The dashboard uses `BitcoinCommandEncoder` to create binary BMCP messages:

```
[4 bytes]  Protocol Magic: 0x424D4350 ("BMCP")
[1 byte]   Version: 0x01
[8 bytes]  Chain Selector: destination chain ID
[20 bytes] Contract Address: receiver contract
[2 bytes]  Data Length: length of function call data
[N bytes]  Data: ABI-encoded function call
[4 bytes]  Nonce (optional): replay protection
[4 bytes]  Deadline (optional): expiration timestamp
```

## Message Preview

After encoding, the dashboard displays:

- **BMCP Data**: Full hex string for PSBT signing
- **Decoded Message**: Human-readable breakdown
  - Protocol and version
  - Chain selector
  - Contract address
  - Message size
  - Nonce and deadline
  - Function call data

## API Endpoints

The dashboard communicates with the Bitcoin API:

### POST /psbt
Creates an unsigned PSBT
```json
{
  "address": "tb1q...",
  "sendBmcpData": "0x424d4350...",
  "feeRateOverride": 10
}
```

### POST /broadcast
Broadcasts a signed PSBT
```json
{
  "txBase64": "cHNidP8B..."
}
```

## Supported Chains

| Chain           | Selector (Hex)      | Network |
|----------------|---------------------|---------|
| Base Sepolia   | 0x8fb23cf86bad5c09 | Testnet |
| Sepolia        | 0xaa36a7             | Testnet |
| Polygon Amoy   | 0x383901e50dc44511 | Testnet |
| Citrea Testnet | 0x434954524541      | Testnet |

## Example Workflow

```typescript
// 1. Encode message (done by dashboard)
const bmcpPayload = BitcoinCommandEncoder.encodeBinary(
  CHAIN_SELECTORS.BASE_SEPOLIA,
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  {
    signature: 'deposit(address,uint256)',
    args: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', '1000000000000000000'],
  },
  {
    nonce: Math.floor(Date.now() / 1000),
    deadline: Math.floor(Date.now() / 1000) + 3600,
  }
);

// 2. Create PSBT (Bitcoin API)
const psbtResponse = await fetch('/psbt', {
  method: 'POST',
  body: JSON.stringify({
    address: bitcoinAddress,
    sendBmcpData: '0x' + bmcpPayload.toString('hex'),
  }),
});

// 3. Sign PSBT (Xverse)
const signResponse = await request('signPsbt', {
  psbt: psbtBase64,
  signInputs: { [bitcoinAddress]: psbtInputs },
});

// 4. Broadcast (Bitcoin API)
await fetch('/broadcast', {
  method: 'POST',
  body: JSON.stringify({ txBase64: signedPsbt }),
});
```

## Troubleshooting

### "No UTXOs found"
- Make sure you have testnet4 BTC in your wallet
- Get testnet BTC from a faucet

### "Invalid receiver address format"
- Address must be 42 characters (0x + 40 hex chars)
- Must be a valid Ethereum address

### "Function expects X arguments, but Y provided"
- Make sure your JSON array matches the function signature
- Example: `deposit(address,uint256)` needs 2 arguments

### "Change amount below dust limit"
- Your UTXOs don't have enough BTC to cover the transaction fee
- Get more testnet BTC

### "Failed to connect wallet"
- Make sure Xverse is installed and unlocked
- Try refreshing the page

## Development

The dashboard is built with:
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **ethers.js** - Ethereum utilities
- **sats-connect** - Bitcoin wallet integration
- **@bmcp/sdk** - BMCP encoding/decoding

## Requirements

- Node.js 18+
- Xverse Wallet browser extension
- Bitcoin API server running locally
- Testnet4 BTC for transaction fees

## License

MIT

