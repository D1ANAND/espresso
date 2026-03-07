# Espresso Integration Screenshots

This directory contains screenshots demonstrating real-world Espresso integrations and transactions.

## Required Screenshots

### 1. dashboard-encoding.png
**Purpose**: Show the Espresso Dashboard interface for encoding messages

**What to capture**:
- Dashboard URL in browser
- Input fields for chain, contract, function
- Generated Espresso hex data
- Preview of decoded message
- Connect wallet button

**Example URL**: http://localhost:5173 (or production URL)

---

### 2. bitcoin-op-return.png
**Purpose**: Show a Bitcoin transaction with Espresso message in OP_RETURN

**What to capture**:
- Bitcoin transaction on mempool.space or blockchain explorer
- OP_RETURN output clearly visible
- Espresso magic bytes (0x424d4350) highlighted
- Transaction confirmation status

**Example URLs**:
- https://mempool.space/testnet/tx/[txid]
- https://blockstream.info/testnet/tx/[txid]

---

### 3. uniswap-v3-execution.png
**Purpose**: Show successful Uniswap V3 swap triggered from Bitcoin

**What to capture**:
- Etherscan transaction page
- Transaction success status
- Contract: `0xEc648D63d002150bD2A72cB197b37F28357E1e65`
- Function call details
- Internal transactions showing swap

**Actual Transaction**:
https://sepolia.etherscan.io/tx/0x672297ccdd3720da61a145be286aa17b828d719b34d1aed00b3326df41f6054b

**Key Elements to Show**:
- ✅ Success status
- Transaction hash
- Block number
- Gas used
- Function call data
- Swap amounts

---

### 4. erc20-transfer.png
**Purpose**: Show ERC20 transfer executed via Espresso

**What to capture**:
- Etherscan transaction page (Advanced view)
- Internal transactions tab
- ERC20 transfer events
- Token amounts
- Success status

**Actual Transaction**:
https://sepolia.etherscan.io/tx/0xb4c257afe91e2686849caa8f5cf602e45a9ce25fb848c7519275ea831bb9fcb5/advanced#internal

**Key Elements to Show**:
- ✅ Success status
- Internal transactions
- Token transfer details
- Event logs
- Gas used

---

### 5. polygon-cre-receiver.png
**Purpose**: Show EspressoCREReceiver contract on Polygon Mainnet

**What to capture**:
- PolygonScan contract page
- Contract address: `0x103F53787b29ddf2B34ae185C13b7a6aE7445a8d`
- Verified contract badge
- Recent transactions
- Contract functions

**Actual Contract**:
https://polygonscan.com/address/0x103F53787b29ddf2B34ae185C13b7a6aE7445a8d

**Key Elements to Show**:
- ✅ Verified status
- Contract deployment info
- Recent CCIP message receipts
- Function interactions

---

### 6. polygon-uniswap-swap.png
**Purpose**: Show Uniswap V3 swap executed via CRE on Polygon

**What to capture**:
- PolygonScan transaction page
- Uniswap V3 Router interaction
- Token swap details
- Success status
- CRE trigger event

**Key Elements to Show**:
- ✅ Success status
- Swap amounts (input/output tokens)
- Uniswap V3 Router call
- Gas used on Polygon
- Transaction hash

---

### 7. polygon-ccip-message.png
**Purpose**: Show CCIP message received on Polygon via CRE

**What to capture**:
- PolygonScan transaction page
- CCIP OffRamp interaction
- ccipReceive function call
- Event logs showing message details
- Source chain information

**Key Elements to Show**:
- ✅ Success status
- CCIP message ID
- Source chain (Bitcoin)
- Decoded message data
- Execution result

---

## Screenshot Guidelines

### Dimensions
- **Recommended**: 1920x1080 (Full HD)
- **Minimum**: 1280x720
- **Format**: PNG (for clarity)

### What to Include
1. **Browser address bar** - Shows the actual URL
2. **Full transaction details** - All relevant information visible
3. **Success indicators** - Green checkmarks, "Success" status
4. **Timestamps** - When transaction occurred
5. **Transaction hash** - Clearly visible
6. **Contract addresses** - Full addresses shown
7. **Function calls** - What function was executed

### What to Avoid
- Blurry or low-resolution images
- Cropped information
- Dark mode if it obscures details (use light mode)
- Personal information (wallet private keys, etc.)

## Taking Screenshots

### macOS
```bash
# Full screen
Cmd + Shift + 3

# Selection
Cmd + Shift + 4

# Window
Cmd + Shift + 4, then Space
```

### Windows
```bash
# Full screen
PrtScn

# Active window
Alt + PrtScn

# Snipping tool
Windows + Shift + S
```

### Linux
```bash
# GNOME
PrtScn

# Selection
Shift + PrtScn
```

## Editing Screenshots

If needed, use tools to:
1. Highlight important sections (arrows, boxes)
2. Blur sensitive information
3. Add annotations
4. Resize for optimal viewing

**Recommended Tools**:
- macOS: Preview, Skitch
- Windows: Paint, Snip & Sketch
- Linux: GIMP, Shutter
- Cross-platform: Ksnip

## File Naming Convention

Use exact filenames as specified:
- `dashboard-encoding.png`
- `bitcoin-op-return.png`
- `uniswap-v3-execution.png`
- `erc20-transfer.png`

## Adding New Screenshots

When adding new integration examples:

1. **Create descriptive filename**:
   - Use kebab-case: `new-feature-screenshot.png`
   - Be specific: `polygon-swap-success.png`

2. **Update this README**:
   - Add new section with purpose
   - Include actual transaction links
   - List key elements to capture

3. **Update main README.md**:
   - Add to screenshots section
   - Link to transaction explorer
   - Include brief description

## Example Screenshot Section for New Integration

```markdown
### 5. polygon-swap-success.png
**Purpose**: Polygon DEX swap via Espresso

**Transaction**: https://polygonscan.com/tx/0x...

**Key Elements**:
- Success status
- DEX contract interaction
- Token swap amounts
- Gas fees on Polygon
```

## Quick Reference: Transaction Links

### Polygon Mainnet
- **EspressoCREReceiver**: https://polygonscan.com/address/0x103F53787b29ddf2B34ae185C13b7a6aE7445a8d
- **Uniswap V3 Router**: https://polygonscan.com/address/0xE592427A0AEce92De3Edee1F18E0157C05861564
- **Uniswap V3 Factory**: https://polygonscan.com/address/0x1F98431c8aD98523631AE4a59f267346ea31F984
- **Explorer**: https://polygonscan.com

### Ethereum Sepolia
- **Uniswap V3**: https://sepolia.etherscan.io/tx/0x672297ccdd3720da61a145be286aa17b828d719b34d1aed00b3326df41f6054b
- **ERC20 Transfer**: https://sepolia.etherscan.io/tx/0xb4c257afe91e2686849caa8f5cf602e45a9ce25fb848c7519275ea831bb9fcb5

### Citrea Testnet
- **EspressoMessageReceiver**: https://explorer.testnet.citrea.xyz/address/0xDeD3f4058Ccdf3C05Bc7f7c38cb07E66A6023893
- **Deployment TX**: https://explorer.testnet.citrea.xyz/tx/0x3e231e37f88236b2ab1a58ac483c1e9637662e1dba635d7691b477c40a1d05d7

### Bitcoin Testnet
- **Mempool**: https://mempool.space/testnet
- **Blockstream**: https://blockstream.info/testnet

---

## Screenshot Checklist

Before adding screenshots to docs:

- [ ] Image is clear and high-resolution
- [ ] URL is visible in browser bar
- [ ] Success status is clearly shown
- [ ] Transaction hash is visible
- [ ] Contract address is shown
- [ ] Function call details are visible
- [ ] File is saved with correct name
- [ ] File size is reasonable (<5MB)
- [ ] Image format is PNG
- [ ] No sensitive information exposed

---

**Last Updated**: November 23, 2025  
**Maintainer**: Espresso Team

