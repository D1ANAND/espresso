# Espresso Everywhere

**Offline Cross-Chain Intents via LoRa, RF, Satellite, and Bitcoin**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-orange.svg)](https://soliditylang.org/)

## Overview

Espresso is a decentralized "Satellite-to-Chainlink" protocol designed to bring the world's 2.6 billion offline users into the DeFi ecosystem. By combining LoRa/Satellite communication with Chainlink Runtime (CRE), Espresso allows users to trigger complex cross-chain intents from remote, internet-blind areas using $5 hardware and the Bitcoin network.

### How it Works (No Internet Required)

1. **The Intent Creation:** A user, entirely disconnected from the internet, crafts an intent via an ESP32 or a similar LoRa-enabled device. This intent can describe interactions like "Swap tokens on Uniswap via Polygon."
2. **RF & Satellite Relay:** The user's ESP32 transmits the intent as an RF signal to a satellite. The satellite captures it and relays it back to a designated ground station.
3. **Ground Station Server:** The ground station server (which *is* connected to the internet) receives the transmission and makes a `POST` request to the core **Espresso Combined Backend**.
4. **Espresso Combined Backend:** This backend processes the intent payload, handles the creation of a Bitcoin PSBT (Partially Signed Bitcoin Transaction), and leverages an **Escrow Key** to sign and broadcast the cross-chain message directly to the Bitcoin network.
5. **Execution:** The message is seamlessly handed off to Chainlink CCIP / Relayer networks from the Bitcoin OP_RETURN payload, executing securely on the target EVM chain.

See the [Espresso Architecture Guide](./docs/ESPRESSO_ARCHITECTURE.md) for more technical details.

## Quickstart: Running Espresso

### The Combined Backend

The system relies on the **Espresso combined backend** that seamlessly routes requests from your Ground Station or API server to the Bitcoin Network.

1. **Install Dependencies:**
```bash
npm install
```

2. **Configure Environment:**
You will need `.env` variables for the Bitcoin API and ESP Escrow handlers.

- `packages/bitcoin-api/.env`:
```env
PORT=4000
TATUM_API_KEY=your_tatum_testnet4_api_key
```

- `packages/esp-escrow/.env`:
```env
ESP_ESCROW_PORT=4001
BITCOIN_API_URL=http://localhost:4000
ESCROW_WIF=your_testnet4_wif_private_key
```
> The `ESCROW_WIF` is the private key of your funded Bitcoin P2WPKH address. The combined backend uses this key to sign the satellite intents and pay network fees on the user's behalf.

3. **Start the Espresso Server:**
```bash
cd packages/combined-backend
npm run dev
```

The system will start listening. The backend operates multiple internal routes to orchestrate these connections. 

### Core Endpoints

The Espresso Combined Backend acts as the brain of the operation, combining the escrow handler and the Bitcoin PSBT tools.

**ESP Escrow Routes:**  
- `POST /escrow/esp-intent`: The primary entrypoint. The satellite's ground station posts the JSON intent here. The JSON contains the destination chain, target receiver, and the function signature.
- `GET /escrow/health`: Health checks for the escrow signing infrastructure.

**Bitcoin Internal Routes:**
- `POST /bitcoin/psbt`: For constructing the Bitcoin payload and establishing the Unsigned PSBT containing the execution OP_RETURN payload.
- `POST /bitcoin/broadcast`: Broadcasts the completely signed (by the Escrow key) PSBT to the Bitcoin network.

This unified server simplifies the architecture and eliminates intermediate communication steps, keeping latency to an absolute minimum between the ground station and the Bitcoin transaction pool.

### Message Payload Example

This is a sample payload sent from the ground station to `/escrow/esp-intent`:

```json
{
  "destination_chain": "sepolia",
  "receiver": "0x15fC6ae953E024d975e77382eEcC56A9101f9F88",
  "function_signature": "transfer(address,uint256)",
  "function_args": [
    "0x15fC6ae953E024d975e77382eEcC56A9101f9F88",
    "1000000000000000000"
  ]
}
```


### Monorepo Structure

Espresso is structured as a monorepo containing:
- `packages/combined-backend/` - The unified Espresso Server handling ESP intent forwarding and PSBTs.
- `packages/esp-escrow/` - Escrow signer package driving offline intent to Bitcoin flows.
- `packages/bitcoin-api/` - The transaction constructor and broadcaster.
- `packages/sdk/` - Intent message serialization toolset.


