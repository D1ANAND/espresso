# BMCP Relayer Workflow

This workflow implements a Bitcoin-to-EVM relayer for the BMCP (Bitcoin Message Commitment Protocol). It continuously monitors the Bitcoin mempool for BMCP messages and relays them to EVM-compatible chains.

## How It Works

1. **Mempool Monitoring**: Every 30 seconds (configurable), the workflow fetches all transaction IDs from the Bitcoin testnet4 mempool
2. **Transaction Analysis**: Each transaction is analyzed to find OP_RETURN outputs
3. **BMCP Detection**: OP_RETURN data is checked for the BMCP protocol magic (`0x424D4350`)
4. **Message Decoding**: Valid BMCP messages are decoded to extract:
   - Protocol version
   - Target chain selector
   - Contract address
   - Function calldata
   - Nonce and deadline
5. **EVM Relay**: Decoded messages are relayed to the appropriate EVM contract for execution

## Steps to Run the Example

## 1. Configure Bitcoin RPC

The workflow requires access to a Bitcoin node RPC endpoint. Update the `config.staging.json` file with your Bitcoin RPC credentials:

```json
{
  "bitcoinRpc": {
    "url": "https://bitcoin-testnet4.gateway.tatum.io/",
    "apiKey": "your-tatum-api-key-here"
  }
}
```

You can get a free Tatum API key from [https://tatum.io](https://tatum.io).

## 2. Configure EVM Settings

Update the EVM configuration in `config.staging.json`:

```json
{
  "evms": [
    {
      "contractAddress": "0xYourRelayerContractAddress",
      "chainSelectorName": "ethereum-testnet-sepolia",
      "gasLimit": "1000000"
    }
  ]
}
```

## 3. Update .env file

You need to add a private key to env file. This is specifically required if you want to simulate chain writes. For that to work the key should be valid and funded.

```
CRE_ETH_PRIVATE_KEY=your-private-key-here
```

Note: Make sure your `workflow.yaml` file is pointing to the config file:

```yaml
staging-settings:
  user-workflow:
    workflow-name: "bmcp-relayer"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.staging.json"
```

## 4. Install dependencies

If `bun` is not already installed, see https://bun.com/docs/installation for installing in your environment.

```bash
cd my-workflow && bun install
```

## 5. Simulate the workflow

Run the command from <b>project root directory</b>

```bash
cre workflow simulate ./packages/relayer/my-workflow --target=staging-settings
```

## Configuration Options

### Schedule

The workflow runs on a cron schedule (default: every 30 seconds):

```json
{
  "schedule": "*/30 * * * * *"
}
```

You can adjust this to process the mempool more or less frequently.

### Bitcoin RPC

- `url`: Bitcoin RPC endpoint (testnet4 by default)
- `apiKey`: Your Tatum API key for authentication

### EVM Configuration

- `contractAddress`: The relayer contract address on the target chain
- `chainSelectorName`: The target EVM chain (e.g., "ethereum-testnet-sepolia")
- `gasLimit`: Maximum gas limit for transactions

## Architecture

The relayer follows this flow:

```
Bitcoin Mempool
    ↓
  Fetch Transaction IDs (getrawmempool)
    ↓
  For each TXID:
    ↓
  Fetch Transaction Details (getrawtransaction)
    ↓
  Extract OP_RETURN outputs
    ↓
  Check for BMCP magic (0x424D4350)
    ↓
  Decode BMCP message
    ↓
  Validate message (deadline, nonce, etc.)
    ↓
  Relay to EVM Contract
```

## Testing

You can test the workflow by:

1. Creating a BMCP message using the SDK
2. Broadcasting it to Bitcoin testnet4
3. Watching the relayer logs to see it get picked up from the mempool

Example BMCP message creation is available in `/examples/bitcoin-api-decoder-flow.ts`.
