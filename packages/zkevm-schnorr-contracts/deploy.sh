#!/bin/bash

# BMCP Citrea Contracts Deployment Script
# Usage: ./deploy.sh [network]
# Networks: local, testnet, mainnet

set -e

NETWORK=${1:-testnet}

echo "🚀 Deploying BMCP Contracts to $NETWORK network..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy env.example to .env and configure it."
    exit 1
fi

# Source environment variables
source .env

# Validate required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY not set in .env file"
    exit 1
fi

# Ensure PRIVATE_KEY has 0x prefix
if [[ ! $PRIVATE_KEY == 0x* ]]; then
    echo "⚠️  Adding 0x prefix to PRIVATE_KEY"
    export PRIVATE_KEY="0x${PRIVATE_KEY}"
fi

# Set deployment parameters based on network
case $NETWORK in
    local)
        RPC_URL="http://localhost:8545"
        VERIFY_FLAGS=""
        echo "📡 Deploying to local Anvil node..."
        ;;
    testnet)
        if [ -z "$CITREA_TESTNET_RPC_URL" ]; then
            echo "❌ CITREA_TESTNET_RPC_URL not set in .env file"
            exit 1
        fi
        RPC_URL="$CITREA_TESTNET_RPC_URL"
        VERIFY_FLAGS="--verify --verifier sourcify"
        echo "📡 Deploying to Citrea Testnet..."
        ;;
    mainnet)
        if [ -z "$CITREA_RPC_URL" ]; then
            echo "❌ CITREA_RPC_URL not set in .env file"
            exit 1
        fi
        RPC_URL="$CITREA_RPC_URL"
        VERIFY_FLAGS="--verify --verifier sourcify"
        echo "📡 Deploying to Citrea Mainnet..."
        echo "⚠️  WARNING: You are deploying to MAINNET. Make sure you have tested thoroughly!"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "❌ Deployment cancelled"
            exit 1
        fi
        ;;
    *)
        echo "❌ Invalid network. Use: local, testnet, or mainnet"
        exit 1
        ;;
esac

# Get deployer address
DEPLOYER=$(cast wallet address --private-key $PRIVATE_KEY)
echo "👤 Deployer address: $DEPLOYER"
echo ""

# Check balance on target network
echo "💰 Checking balance..."
BALANCE=$(cast balance $DEPLOYER --rpc-url $RPC_URL --ether)
echo "Balance: $BALANCE cBTC"
echo ""

if [ "$BALANCE" = "0" ] && [ "$NETWORK" != "local" ]; then
    echo "⚠️  Warning: Balance is 0. You need cBTC for gas fees."
    exit 1
fi

# Verify chain connection
echo "🔗 Verifying chain connection..."
CHAIN_ID=$(cast chain-id --rpc-url $RPC_URL)
echo "Connected to Chain ID: $CHAIN_ID"
echo ""

# Build contracts
echo "🔨 Building contracts..."
forge build --sizes
echo ""

# Run tests
echo "🧪 Running tests..."
forge test --match-contract BMCPMessageReceiverTest -vv
echo ""

# Check if this is a fresh deployment or resume
BROADCAST_DIR="broadcast/DeployBMCP.s.sol/$CHAIN_ID"
if [ -d "$BROADCAST_DIR" ] && [ -f "$BROADCAST_DIR/run-latest.json" ]; then
    echo "📋 Found existing deployment. Options:"
    echo "  1. Fresh deployment (will deploy new contracts)"
    echo "  2. Resume & verify existing deployment"
    read -p "Choose option (1/2): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[2]$ ]]; then
        # Resume and verify existing deployment
        echo "🔄 Resuming and verifying existing deployment..."
        forge script script/DeployBMCP.s.sol \
            --rpc-url "$RPC_URL" \
            --private-key $PRIVATE_KEY \
            --resume \
            $VERIFY_FLAGS \
            -vvv
        
        echo ""
        echo "✅ Verification completed!"
        exit 0
    fi
fi

# Deploy contracts (fresh deployment)
echo "📦 Deploying contracts..."

if [ -n "$VERIFY_FLAGS" ]; then
    forge script script/DeployBMCP.s.sol \
        --rpc-url "$RPC_URL" \
        --private-key $PRIVATE_KEY \
        --broadcast \
        $VERIFY_FLAGS \
        -vv
else
    forge script script/DeployBMCP.s.sol \
        --rpc-url "$RPC_URL" \
        --private-key $PRIVATE_KEY \
        --broadcast \
        -vv
fi

echo ""
echo "✅ Deployment completed successfully!"
echo ""

# Extract and display deployed addresses
echo "📋 Deployment Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Network:        $NETWORK"
echo "Chain ID:       $CHAIN_ID"
echo "RPC URL:        $RPC_URL"
echo "Deployer:       $DEPLOYER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Try to extract addresses from latest deployment
if [ -f "$BROADCAST_DIR/run-latest.json" ]; then
    echo "📄 Extracting deployed contract addresses..."
    
    # Extract addresses using jq if available
    if command -v jq &> /dev/null; then
        echo ""
        echo "Deployed Contracts:"
        jq -r '.transactions[] | select(.contractName != null) | "  \(.contractName): \(.contractAddress)"' "$BROADCAST_DIR/run-latest.json"
        echo ""
        
        # Save to deployments file
        mkdir -p deployments
        cat > "deployments/$NETWORK-latest.json" << EOF
{
  "network": "$NETWORK",
  "chainId": $CHAIN_ID,
  "deployer": "$DEPLOYER",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contracts": $(jq '[.transactions[] | select(.contractName != null) | {name: .contractName, address: .contractAddress}] | map({(.name): .address}) | add' "$BROADCAST_DIR/run-latest.json")
}
EOF
        echo "💾 Deployment info saved to deployments/$NETWORK-latest.json"
    else
        echo "⚠️  jq not found. Install jq to extract contract addresses automatically."
        echo "Check: $BROADCAST_DIR/run-latest.json"
    fi
fi

echo ""
echo "🔗 Useful Links:"
if [ "$NETWORK" = "testnet" ]; then
    echo "Explorer: https://explorer.testnet.citrea.xyz"
elif [ "$NETWORK" = "mainnet" ]; then
    echo "Explorer: https://explorer.citrea.xyz"
fi

echo ""
echo "📄 Contract artifacts: ./out/"
echo "📋 Deployment logs: ./broadcast/DeployBMCP.s.sol/$CHAIN_ID/"
echo ""

# Post-deployment verification tips
if [ "$NETWORK" != "local" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 Verification Notes:"
    echo ""
    echo "If contracts show as unverified on explorer:"
    echo ""
    echo "1. Try manual verification via explorer UI"
    echo "2. Or re-run verification:"
    echo "   ./deploy.sh $NETWORK"
    echo "   (choose option 2: Resume & verify)"
    echo ""
    echo "3. Check verification status:"
    if [ "$NETWORK" = "testnet" ]; then
        echo "   https://explorer.testnet.citrea.xyz/address/<CONTRACT_ADDRESS>?tab=contract"
    fi
    echo ""
    echo "Note: Verification is cosmetic - contracts work without it!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

echo ""
echo "🎉 Done! Your contracts are deployed and ready to use!"
