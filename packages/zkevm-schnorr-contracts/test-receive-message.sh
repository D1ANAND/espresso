#!/bin/bash

# Script to test receiveMessage function on BMCPMessageReceiver
# This simulates a Bitcoin message being relayed to Citrea

set -e

echo "🧪 Testing BMCPMessageReceiver.receiveMessage()"
echo ""

# Contract addresses
RECEIVER="0xDeD3f4058Ccdf3C05Bc7f7c38cb07E66A6023893"
TARGET="0x2314dfD079C2b2cf2C3247fCd552d9d52Ac486De"
RELAYER="0x2cac89ABf06DbE5d3a059517053B7144074e1CE5"

# Network
RPC_URL="https://rpc.testnet.citrea.xyz"

# Check if we have PRIVATE_KEY
if [ -z "$PRIVATE_KEY" ]; then
    echo "⚠️  Loading PRIVATE_KEY from .env..."
    source .env
fi

echo "📋 Test Parameters:"
echo "  Receiver:  $RECEIVER"
echo "  Target:    $TARGET"
echo "  Relayer:   $RELAYER"
echo "  RPC:       $RPC_URL"
echo ""

# Prepare test data
echo "🔧 Preparing test data..."
echo ""

# 1. Create Bitcoin TXID (fake for testing)
TXID="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
echo "  Bitcoin TXID: $TXID"

# 2. Bitcoin Public Key X (from BIP340 test vectors)
PUBKEY_X="0xf9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9"
echo "  PubKey X:     $PUBKEY_X"

# 3. Schnorr Signature (64 bytes - from test vectors)
SIGNATURE="0xebdee97d060096cfc868ccfa97b6f61c8837ac0e3396abb31d45e68679654a14a7c08cd54f772890989d0fee7d77add7f79288f34d37205b383b8d4246034d9d"
echo "  Signature:    ${SIGNATURE:0:20}...${SIGNATURE: -20}"

# 4. Target function: storeMessage(string)
MESSAGE="Hello from Bitcoin!"
FUNCTION_SELECTOR="0x32af2edb"
FUNCTION_DATA=$(cast calldata "storeMessage(string)" "$MESSAGE")
echo "  Function:     storeMessage(\"$MESSAGE\")"
echo "  Selector:     $FUNCTION_SELECTOR"

# 5. Protocol and chain
PROTOCOL="0x4243"  # "BC"
CHAIN_SELECTOR="5115"  # Citrea Testnet
echo "  Protocol:     $PROTOCOL"
echo "  Chain:        $CHAIN_SELECTOR"

# 6. Nonce (check current nonce first)
CURRENT_NONCE=$(cast call $RECEIVER "bitcoinNonces(bytes32)(uint256)" $PUBKEY_X --rpc-url $RPC_URL)
echo "  Current Nonce: $CURRENT_NONCE"

# 7. Deadline (1 hour from now)
DEADLINE=$(($(date +%s) + 3600))
echo "  Deadline:     $DEADLINE"

# 8. Authorization
AUTH_CONTRACT="$TARGET"
AUTH_FUNCTION="$FUNCTION_SELECTOR"
AUTH_MAX_VALUE="0"
AUTH_VALID_UNTIL="$DEADLINE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Building receiveMessage() call..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Note: This is a complex call with nested structs
# We need to ABI-encode:
# - bytes32 txid
# - BMCPMessage (struct with nested Authorization struct)
# - SchnorrProof (struct)

echo "⚠️  Note: Calling receiveMessage requires ABI-encoding complex structs."
echo "Let's use cast to make the call:"
echo ""

# Create the cast send command
cat << EOF
Cast command to execute receiveMessage:

cast send $RECEIVER \\
  "receiveMessage(bytes32,(bytes2,uint64,address,bytes,uint256,uint256,(address,bytes4,uint256,uint256)),(bytes32,bytes))" \\
  "$TXID" \\
  "($PROTOCOL,$CHAIN_SELECTOR,$TARGET,$FUNCTION_DATA,$CURRENT_NONCE,$DEADLINE,($AUTH_CONTRACT,$AUTH_FUNCTION,$AUTH_MAX_VALUE,$AUTH_VALID_UNTIL))" \\
  "($PUBKEY_X,$SIGNATURE)" \\
  --rpc-url $RPC_URL \\
  --private-key \$PRIVATE_KEY

EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ask user if they want to execute
read -p "Execute this call? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Execution cancelled"
    exit 0
fi

echo ""
echo "🚀 Executing receiveMessage()..."
echo ""

# Execute the call
cast send $RECEIVER \
  "receiveMessage(bytes32,(bytes2,uint64,address,bytes,uint256,uint256,(address,bytes4,uint256,uint256)),(bytes32,bytes))" \
  "$TXID" \
  "($PROTOCOL,$CHAIN_SELECTOR,$TARGET,$FUNCTION_DATA,$CURRENT_NONCE,$DEADLINE,($AUTH_CONTRACT,$AUTH_FUNCTION,$AUTH_MAX_VALUE,$AUTH_VALID_UNTIL))" \
  "($PUBKEY_X,$SIGNATURE)" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Transaction submitted!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if message was stored in target contract
echo "🔍 Checking if message was stored in target contract..."
STORED_MESSAGE=$(cast call $TARGET "getMessage(address)(string)" $RECEIVER --rpc-url $RPC_URL)
echo "  Stored message: $STORED_MESSAGE"

# Check if nonce was incremented
NEW_NONCE=$(cast call $RECEIVER "bitcoinNonces(bytes32)(uint256)" $PUBKEY_X --rpc-url $RPC_URL)
echo "  New nonce:      $NEW_NONCE (was $CURRENT_NONCE)"

# Check if message was marked as processed
IS_PROCESSED=$(cast call $RECEIVER "processedMessages(bytes32)(bool)" $TXID --rpc-url $RPC_URL)
echo "  Processed:      $IS_PROCESSED"

echo ""
echo "🎉 Test complete!"

