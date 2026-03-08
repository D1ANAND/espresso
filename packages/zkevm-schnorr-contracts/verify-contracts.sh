#!/bin/bash

# Foundry Blockscout Verification Script
# Usage: ./verify-contracts.sh [contract-number or 'all']

set -e

echo "🔍 Citrea Testnet Contract Verification via Foundry"
echo ""

# Configuration
RPC_URL="https://rpc.testnet.citrea.xyz"
VERIFIER="blockscout"
VERIFIER_URL="https://explorer.testnet.citrea.xyz/api/"

# Function to verify BMCPMessageReceiver
verify_bmcp_receiver() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 Verifying BMCPMessageReceiver..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Address: 0xDeD3f4058Ccdf3C05Bc7f7c38cb07E66A6023893"
    echo "Constructor Args: 0x2cac89ABf06DbE5d3a059517053B7144074e1CE5"
    echo ""
    
    forge verify-contract \
        --rpc-url "$RPC_URL" \
        --verifier "$VERIFIER" \
        --verifier-url "$VERIFIER_URL" \
        --constructor-args $(cast abi-encode "constructor(address)" 0x2cac89ABf06DbE5d3a059517053B7144074e1CE5) \
        --watch \
        0xDeD3f4058Ccdf3C05Bc7f7c38cb07E66A6023893 \
        src/BMCPMessageReceiver.sol:BMCPMessageReceiver
    
    echo ""
}

# Function to verify ExampleTargetContract
verify_example_target() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 Verifying ExampleTargetContract..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Address: 0x2314dfD079C2b2cf2C3247fCd552d9d52Ac486De"
    echo "Constructor Args: (none)"
    echo ""
    
    forge verify-contract \
        --rpc-url "$RPC_URL" \
        --verifier "$VERIFIER" \
        --verifier-url "$VERIFIER_URL" \
        --watch \
        0x2314dfD079C2b2cf2C3247fCd552d9d52Ac486De \
        src/ExampleTargetContract.sol:ExampleTargetContract
    
    echo ""
}

# Function to verify SchnorrVerifyCaller
verify_schnorr_caller() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 Verifying SchnorrVerifyCaller..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Address: 0x54AAc9DE386C8185Fe8842456E55d7bF17b1f8aB"
    echo "Constructor Args: (none)"
    echo ""
    
    forge verify-contract \
        --rpc-url "$RPC_URL" \
        --verifier "$VERIFIER" \
        --verifier-url "$VERIFIER_URL" \
        --watch \
        0x54AAc9DE386C8185Fe8842456E55d7bF17b1f8aB \
        src/SchnorrVerifyCaller.sol:SchnorrVerifyCaller
    
    echo ""
}

# Parse argument
CHOICE=${1:-menu}

case $CHOICE in
    1|bmcp|receiver)
        verify_bmcp_receiver
        ;;
    2|example|target)
        verify_example_target
        ;;
    3|schnorr|caller)
        verify_schnorr_caller
        ;;
    all)
        verify_bmcp_receiver
        verify_example_target
        verify_schnorr_caller
        ;;
    *)
        echo "📋 Available contracts:"
        echo ""
        echo "  1. BMCPMessageReceiver       (0xDeD3f...3893)"
        echo "  2. ExampleTargetContract     (0x2314d...86De)"
        echo "  3. SchnorrVerifyCaller       (0x54AAc...f8aB)"
        echo "  all. All contracts"
        echo ""
        echo "Usage:"
        echo "  ./verify-contracts.sh 1         # Verify BMCPMessageReceiver"
        echo "  ./verify-contracts.sh 2         # Verify ExampleTargetContract"
        echo "  ./verify-contracts.sh 3         # Verify SchnorrVerifyCaller"
        echo "  ./verify-contracts.sh all       # Verify all contracts"
        echo ""
        exit 0
        ;;
esac

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Verification command(s) completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Check the output above for verification status."
echo ""
echo "If verification failed, try:"
echo "  1. Using Sourcify: forge verify-contract <address> <contract> --chain 5115 --verifier sourcify"
echo "  2. Manual verification on explorer with Standard JSON Input"
echo "     (See: EXPLORER_VERIFICATION_GUIDE.md)"
echo ""

