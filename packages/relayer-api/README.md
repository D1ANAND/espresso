# BMCP Relayer API

REST API server that monitors Bitcoin for BMCP messages and exposes them via HTTP endpoints.

## Features

- 🔍 **Real-time Bitcoin Monitoring** - Scans Bitcoin testnet4 for BMCP messages
- 🎯 **Protocol Detection** - Automatically filters for BMCP magic (0x424D4350)
- 📦 **Message Decoding** - Fully decodes BMCP binary format
- 🔐 **Validation** - Checks deadlines, nonces, and message validity
- 🚀 **RESTful API** - Easy to integrate with any application

## Installation

```bash
cd packages/relayer-api
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
TATUM_API_KEY=your_tatum_api_key
TATUM_RPC_URL=https://bitcoin-testnet4.gateway.tatum.io/
RELAYER_API_PORT=3001
```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3001` (or your configured port).

## API Endpoints

### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "BMCP Relayer API",
  "timestamp": "2024-11-22T20:30:00.000Z",
  "network": "testnet4"
}
```

---

### 2. Get Latest BMCP Messages
```http
GET /api/bmcp/latest?limit=10&blocks=5
```

**Query Parameters:**
- `limit` (optional, default: 10) - Maximum number of messages to return
- `blocks` (optional, default: 5) - Number of recent blocks to scan

**Response:**
```json
{
  "success": true,
  "count": 2,
  "currentBlock": 50000,
  "scannedBlocks": 5,
  "messages": [
    {
      "txid": "967c5898bb81f7780bdde68e6d83c0903095e5650ad6fa5e76cf6cc5926947dd",
      "blockHeight": 49998,
      "blockHash": "00000000...",
      "outputIndex": 0,
      "timestamp": 1700000000,
      "protocol": "BMCP",
      "chain": "Sepolia",
      "chainSelector": "0xde41ba4fc9d91ad9",
      "contract": "0x2bae8224110482ec6ddf12faf359a35362d43573",
      "data": "0xf21355f4...",
      "nonce": 0,
      "deadline": 1763854827,
      "valid": true,
      "raw": "424d435001..."
    }
  ]
}
```

---

### 3. Get BMCP from Specific Transaction
```http
GET /api/bmcp/tx/:txid
```

**Example:**
```bash
curl http://localhost:3001/api/bmcp/tx/967c5898bb81f7780bdde68e6d83c0903095e5650ad6fa5e76cf6cc5926947dd
```

**Response:**
```json
{
  "success": true,
  "txid": "967c5898bb81f7780bdde68e6d83c0903095e5650ad6fa5e76cf6cc5926947dd",
  "count": 1,
  "messages": [
    {
      "txid": "967c5898...",
      "outputIndex": 0,
      "isBMCP": true,
      "raw": "424d435001de41ba...",
      "decoded": {
        "protocol": "BMCP",
        "version": 1,
        "chain": "Sepolia",
        "chainSelector": "0xde41ba4fc9d91ad9",
        "contract": "0x2bae8224110482ec6ddf12faf359a35362d43573",
        "data": "0xf21355f4...",
        "nonce": 0,
        "deadline": 1763854827,
        "valid": true,
        "functionSelector": "0xf21355f4",
        "functionSignature": "onReport(string)"
      }
    }
  ]
}
```

---

### 4. Get BMCP from Specific Block
```http
GET /api/bmcp/block/:height
```

**Example:**
```bash
curl http://localhost:3001/api/bmcp/block/49998
```

**Response:**
```json
{
  "success": true,
  "blockHeight": 49998,
  "count": 1,
  "messages": [
    {
      "txid": "967c5898...",
      "outputIndex": 0,
      "decoded": {
        "protocol": "BMCP",
        "chain": "Sepolia",
        "contract": "0x2bae8224110482ec6ddf12faf359a35362d43573",
        "nonce": 0,
        "deadline": 1763854827,
        "valid": true
      }
    }
  ]
}
```

---

### 5. Get Current Bitcoin Block Height
```http
GET /api/bitcoin/height
```

**Response:**
```json
{
  "success": true,
  "height": 50000,
  "network": "testnet4"
}
```

---

### 6. Decode Raw OP_RETURN Data
```http
POST /api/bmcp/decode
Content-Type: application/json

{
  "data": "0x424d435001de41ba4fc9d91ad92bae8224110482ec6ddf12faf359a35362d43573..."
}
```

**Response:**
```json
{
  "success": true,
  "isBMCP": true,
  "decoded": {
    "protocol": "BMCP",
    "version": 1,
    "chainSelector": "0xde41ba4fc9d91ad9",
    "contract": "0x2bae8224110482ec6ddf12faf359a35362d43573",
    "data": "0xf21355f4...",
    "nonce": 0,
    "deadline": 1763854827,
    "valid": true
  }
}
```

## Example Usage

### JavaScript/TypeScript
```typescript
// Get latest BMCP messages
const response = await fetch('http://localhost:3001/api/bmcp/latest?limit=5');
const data = await response.json();

console.log(`Found ${data.count} BMCP messages:`);
data.messages.forEach(msg => {
  console.log(`- TX: ${msg.txid}`);
  console.log(`  Chain: ${msg.chain}`);
  console.log(`  Contract: ${msg.contract}`);
  console.log(`  Valid: ${msg.valid ? '✅' : '❌'}`);
});
```

### cURL
```bash
# Get latest messages
curl http://localhost:3001/api/bmcp/latest?limit=5&blocks=10

# Get specific transaction
curl http://localhost:3001/api/bmcp/tx/967c5898bb81f7780bdde68e6d83c0903095e5650ad6fa5e76cf6cc5926947dd

# Decode raw data
curl -X POST http://localhost:3001/api/bmcp/decode \
  -H "Content-Type: application/json" \
  -d '{"data": "0x424d435001de41ba..."}'
```

### Python
```python
import requests

# Get latest BMCP messages
response = requests.get('http://localhost:3001/api/bmcp/latest', params={'limit': 5})
data = response.json()

print(f"Found {data['count']} BMCP messages")
for msg in data['messages']:
    print(f"- TX: {msg['txid']}")
    print(f"  Chain: {msg['chain']}")
    print(f"  Contract: {msg['contract']}")
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error description here"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (transaction/block not found or no BMCP messages)
- `500` - Internal Server Error

## Integration with Dashboard

This API can be consumed by the BMCP Dashboard or any frontend application:

```typescript
// Dashboard integration example
const BMCPClient = {
  async getLatest(limit = 10) {
    const res = await fetch(`http://localhost:3001/api/bmcp/latest?limit=${limit}`);
    return res.json();
  },
  
  async getTx(txid: string) {
    const res = await fetch(`http://localhost:3001/api/bmcp/tx/${txid}`);
    return res.json();
  }
};
```

## Performance

- Scans ~5 blocks in ~2-3 seconds
- Caches decoded messages in memory
- Efficient protocol magic filtering (skips non-BMCP messages quickly)

## Security

- ✅ API keys stored in `.env` (gitignored)
- ✅ CORS enabled for cross-origin requests
- ✅ Input validation on all endpoints
- ✅ Error handling prevents information leakage

## Development

### Project Structure
```
packages/relayer-api/
├── src/
│   └── index.ts          # Main server file
├── package.json
├── nodemon.json          # Development config
├── tsconfig.json         # TypeScript config
└── README.md
```

### Adding New Endpoints

1. Add route in `src/index.ts`
2. Use `scanner` to fetch Bitcoin data
3. Use `BitcoinCommandEncoder` to decode messages
4. Return JSON response

## Troubleshooting

### Server won't start
- Check if port 3001 is already in use
- Verify `TATUM_API_KEY` is set in `.env`

### No messages found
- Verify Bitcoin testnet4 is accessible
- Check that transactions have proper BMCP magic (0x424D4350)
- Try increasing the `blocks` parameter

### API key errors
- Ensure `.env` file exists with `TATUM_API_KEY`
- Get a free API key from https://tatum.io

## License

MIT

