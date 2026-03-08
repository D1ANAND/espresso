#!/bin/bash

# Script to prepare files for manual Sourcify verification
# Usage: ./prepare-sourcify-files.sh

set -e

echo "🔧 Preparing files for manual Sourcify verification..."
echo ""

# Create directory for verification files
VERIFY_DIR="sourcify-verification"
rm -rf $VERIFY_DIR
mkdir -p $VERIFY_DIR

# Function to process each contract
process_contract() {
    CONTRACT_NAME=$1
    ADDRESS=$2
    CONSTRUCTOR_ARGS=$3
    
    echo "📦 Processing $CONTRACT_NAME ($ADDRESS)..."
    
    # Create directory for this contract
    CONTRACT_DIR="$VERIFY_DIR/$CONTRACT_NAME"
    mkdir -p "$CONTRACT_DIR"
    
    # Extract metadata JSON from compiled contract
    if [ -f "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" ]; then
        echo "  ✅ Extracting metadata.json..."
        jq -r '.metadata' "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" > "$CONTRACT_DIR/metadata.json"
        
        # Also save the full contract JSON
        echo "  ✅ Copying full contract artifact..."
        cp "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" "$CONTRACT_DIR/contract.json"
        
        # Extract just the ABI for convenience
        echo "  ✅ Extracting ABI..."
        jq '.abi' "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" > "$CONTRACT_DIR/abi.json"
    else
        echo "  ⚠️  Compiled output not found for $CONTRACT_NAME"
    fi
    
    # Copy source files
    echo "  ✅ Copying source file..."
    if [ -f "src/$CONTRACT_NAME.sol" ]; then
        cp "src/$CONTRACT_NAME.sol" "$CONTRACT_DIR/"
    fi
    
    # Create info file
    cat > "$CONTRACT_DIR/info.txt" << EOF
Contract: $CONTRACT_NAME
Address: $ADDRESS
Chain: Citrea Testnet (5115)
Compiler: 0.8.19
Optimization: Enabled (200 runs)
EOF

    if [ -n "$CONSTRUCTOR_ARGS" ]; then
        echo "Constructor Args: $CONSTRUCTOR_ARGS" >> "$CONTRACT_DIR/info.txt"
    fi
    
    echo "  ✅ Done!"
    echo ""
}

# Process each contract
process_contract "BMCPMessageReceiver" "0xDeD3f4058Ccdf3C05Bc7f7c38cb07E66A6023893" "0x2cac89ABf06DbE5d3a059517053B7144074e1CE5"
process_contract "ExampleTargetContract" "0x2314dfD079C2b2cf2C3247fCd552d9d52Ac486De" ""
process_contract "SchnorrVerifyCaller" "0x54AAc9DE386C8185Fe8842456E55d7bF17b1f8aB" ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Files prepared in: $VERIFY_DIR/"
echo ""
echo "📋 Directory structure:"
ls -R $VERIFY_DIR
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 For manual Sourcify verification, visit:"
echo "   https://sourcify.dev/#/verifier"
echo ""
echo "📄 For each contract, you'll need:"
echo "   1. metadata.json (in each contract folder)"
echo "   2. Source file (.sol)"
echo "   3. Contract address (see info.txt)"
echo "   4. Chain ID: 5115"
echo ""
