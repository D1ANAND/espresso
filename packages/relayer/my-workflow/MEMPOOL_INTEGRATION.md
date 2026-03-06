# Mempool Integration for BMCP Relayer

## Overview

The BMCP relayer has been enhanced to automatically fetch and process transactions from the Bitcoin mempool, eliminating the need for hardcoded transaction IDs.

## Changes Made

### 1. New Function: `fetchMempool()`

```typescript
const fetchMempool = (sendRequester: HTTPSendRequester, config: Config): string[]
```

**Purpose**: Fetches all transaction IDs from the Bitcoin mempool using the `getrawmempool` RPC method.

**Returns**: Array of transaction IDs (txids) currently in the mempool.

**RPC Call**: 
```json
{
  "jsonrpc": "2.0",
  "method": "getrawmempool",
  "params": [false],
  "id": 1
}
```

### 2. New Function: `getMempoolTransactions()`

```typescript
async function getMempoolTransactions(runtime: Runtime<Config>): Promise<string[]>
```

**Purpose**: CRE-compatible wrapper that uses the HTTP capability to fetch mempool transactions with consensus.

**Features**:
- Uses CRE HTTP capability for decentralized consensus
- Returns array of transaction IDs
- Logs the number of transactions found

### 3. Enhanced `onCronTrigger()` Function

The main trigger function has been completely refactored to:

**Before**: Process a single hardcoded transaction ID
```typescript
const exampleTxid = '967c5898bb81f7780bdde68e6d83c0903095e5650ad6fa5e76cf6cc5926947dd';
```

**After**: Process all transactions from the mempool
```typescript
const mempoolTxids = await getMempoolTransactions(runtime);
// Process each transaction...
```

**New Features**:
- ✅ Fetches live mempool data
- ✅ Processes multiple transactions in a single run
- ✅ Error handling for individual transactions (continues on failure)
- ✅ Summary statistics (transactions processed, BMCP messages found, successful relays)
- ✅ Detailed logging for each step
- ✅ Skips non-BMCP transactions gracefully

## Workflow Process

```
┌─────────────────────────────────────────────┐
│  Cron Trigger (every 30 seconds)           │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Step 0: Fetch Mempool Transaction IDs     │
│  RPC: getrawmempool                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  For Each Transaction ID:                   │
│  ┌─────────────────────────────────────┐   │
│  │ Step 1: Fetch Transaction Details   │   │
│  │ RPC: getrawtransaction              │   │
│  └─────────────┬───────────────────────┘   │
│                ▼                             │
│  ┌─────────────────────────────────────┐   │
│  │ Step 2: Extract OP_RETURN outputs   │   │
│  └─────────────┬───────────────────────┘   │
│                ▼                             │
│  ┌─────────────────────────────────────┐   │
│  │ Step 3: Check BMCP Magic            │   │
│  │ (0x424D4350)                        │   │
│  └─────────────┬───────────────────────┘   │
│                ▼                             │
│  ┌─────────────────────────────────────┐   │
│  │ Step 4: Decode BMCP Message         │   │
│  └─────────────┬───────────────────────┘   │
│                ▼                             │
│  ┌─────────────────────────────────────┐   │
│  │ Step 5: Decode Function Call        │   │
│  └─────────────┬───────────────────────┘   │
│                ▼                             │
│  ┌─────────────────────────────────────┐   │
│  │ Step 6: Validate Message            │   │
│  └─────────────┬───────────────────────┘   │
│                ▼                             │
│  ┌─────────────────────────────────────┐   │
│  │ Step 7: Relay to EVM Contract       │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Summary Report:                            │
│  - Mempool Transactions: N                  │
│  - BMCP Messages Found: M                   │
│  - Successfully Relayed: K                  │
└─────────────────────────────────────────────┘
```

## Configuration

The Bitcoin RPC configuration is defined in `config.staging.json`:

```json
{
  "bitcoinRpc": {
    "url": "https://bitcoin-testnet4.gateway.tatum.io/",
    "apiKey": "your-api-key-here"
  }
}
```

## Error Handling

The relayer implements robust error handling:

1. **Individual Transaction Failures**: If one transaction fails to process, the relayer continues with the next
2. **RPC Errors**: API errors are caught and logged, but don't stop the entire process
3. **Invalid BMCP Messages**: Non-BMCP messages are skipped gracefully
4. **Relay Failures**: If relaying to EVM fails, it's logged but doesn't stop processing other messages

## Example Output

```
╔════════════════════════════════════════════════════════════╗
║   BMCP Relayer: Processing Bitcoin Mempool                ║
╚════════════════════════════════════════════════════════════╝

🔍 Fetching mempool transactions...
✅ Found 15 transaction(s) in mempool

📋 Processing 15 transaction(s) from mempool...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Processing Transaction: 967c5898bb81f778...926947dd

Fetching Bitcoin transaction: 967c5898bb81f7780bdde68e6d83c0903095e5650ad6fa5e76cf6cc5926947dd
✅ Transaction fetched successfully!
   Status: Unconfirmed (in mempool)

🔍 Extracting OP_RETURN outputs...
📦 Found 1 OP_RETURN output(s)

🔄 Processing OP_RETURN output #1...
✅ BMCP Message Detected!

📋 Decoded BMCP Message:
   Protocol: BMCP
   Version: 1
   Chain Selector: 0x...
   Contract: 0x...
   Nonce: 123
   Deadline: 1700000000

🔍 Function Selector: 0x9db5dbe4
   Signature: transferERC20(address,address,uint256)
   Status: ✅ Known function

🔐 Validation Checks:
   Contract Address: ✅ Valid
   Calldata Present: ✅ Yes
   Deadline Valid: ✅ Not expired

✅ Message is VALID and ready for execution!
🚀 Relaying to EVM contract...
✅ Successfully relayed to EVM!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary:
   • Mempool Transactions: 15
   • BMCP Messages Found: 1
   • Successfully Relayed: 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Benefits

1. **Automatic Discovery**: No need to manually specify transaction IDs
2. **Real-time Processing**: Processes transactions as soon as they hit the mempool
3. **Scalable**: Handles multiple BMCP messages in a single run
4. **Resilient**: Continues processing even if individual transactions fail
5. **Informative**: Detailed logging and statistics for monitoring

## Future Enhancements

Potential improvements:

1. **State Management**: Track processed transactions to avoid duplicate processing
2. **Filtering**: Add configuration to filter by specific contracts or chain selectors
3. **Priority**: Process transactions based on fee rates or deadlines
4. **Batch Processing**: Group multiple messages for efficient relay
5. **Metrics**: Export metrics for monitoring and alerting

## Testing

To test the integration:

1. Start the relayer with the staging configuration
2. Create and broadcast a BMCP transaction to Bitcoin testnet4
3. Watch the relayer logs to see it get picked up from the mempool
4. Verify the message is relayed to the EVM contract

Use the example in `/examples/bitcoin-api-decoder-flow.ts` to create test transactions.

