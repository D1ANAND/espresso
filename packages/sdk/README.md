# @bmcp/sdk

Core SDK for Bitcoin Multichain Protocol containing shared types, utilities, and message encoding.

## Installation

```bash
npm install @bmcp/sdk
```

## Features

- **Type Definitions**: TypeScript types for BMCP protocol
- **Message Encoder**: Binary encoding/decoding for Bitcoin OP_RETURN
- **Protocol Constants**: Chain selectors, protocol IDs, and versioning
- **Bitcoin Transaction Types**: Types for Bitcoin RPC and transactions

## Usage

```typescript
import { 
  MessageEncoder, 
  PROTOCOL_CONSTANTS, 
  CHAIN_SELECTORS,
  BitcoinCCIPMessage 
} from '@bmcp/sdk';

// Encode a message
const message: BitcoinCCIPMessage = {
  protocolId: PROTOCOL_CONSTANTS.PROTOCOL_ID,
  version: PROTOCOL_CONSTANTS.VERSION_V2,
  chainSelector: CHAIN_SELECTORS.BASE,
  receiver: '0x...',
  data: new Uint8Array([...]),
  gasLimit: 200_000n,
  extraArgs: new Uint8Array([])
};

const encoded = MessageEncoder.encode(message);
```

## License

MIT

