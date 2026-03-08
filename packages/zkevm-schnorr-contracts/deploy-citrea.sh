#!/bin/bash

# BMCP Citrea Deployment Script
# Deploys contracts to Citrea Testnet

set -e

echo "=== BMCP Citrea Deployment ==="
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Create .env with PRIVATE_KEY and CITREA_TESTNET_RPC_URL"
    exit 1
fi

# Load environment
source .env

# Check private key
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env"
    exit 1
fi

# Check RPC URL
if [ -z "$CITREA_TESTNET_RPC_URL" ]; then
    echo "❌ Error: CITREA_TESTNET_RPC_URL not set in .env"
    exit 1
fi

# Get deployer address
DEPLOYER=$(cast wallet address --private-key $PRIVATE_KEY 2>/dev/null || echo "unknown")
echo "Deployer address: $DEPLOYER"
echo ""

# Check balance
echo "Checking cBTC balance..."
BALANCE=$(cast balance $DEPLOYER --rpc-url $CITREA_TESTNET_RPC_URL 2>/dev/null || echo "0")
echo "Balance: $BALANCE wei"
echo ""

if [ "$BALANCE" = "0" ]; then
    echo "⚠️  Warning: Balance is 0. You need cBTC for gas fees."
    echo "Get testnet cBTC from Citrea faucet"
    echo ""
fi

# Check chain ID
echo "Checking Citrea Testnet connection..."
CHAIN_ID=$(cast chain-id --rpc-url $CITREA_TESTNET_RPC_URL)
echo "Chain ID: $CHAIN_ID"

if [ "$CHAIN_ID" != "5115" ]; then
    echo "⚠️  Warning: Expected Chain ID 5115, got $CHAIN_ID"
    echo "Make sure you're connecting to Citrea Testnet"
    echo ""
fi

# Confirm deployment
echo ""
read -p "Deploy to Citrea Testnet (chain $CHAIN_ID)? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "🚀 Starting deployment..."
echo ""

# Deploy using Foundry script
forge script script/DeployBMCP.s.sol \
    --rpc-url $CITREA_TESTNET_RPC_URL \
    --broadcast \
    --verify \
    -vvvv

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Note deployed contract addresses from output above"
echo "2. Verify Schnorr precompile works (see DEPLOYMENT_GUIDE.md)"
echo "3. Configure relayer with receiver address"
echo "4. Test end-to-end flow from Bitcoin"
echo ""

