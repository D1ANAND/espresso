#!/bin/bash

# Helper script to view and copy Standard JSON Input files
# Usage: ./view-standard-json.sh [contract-name]

CONTRACT=$1

if [ -z "$CONTRACT" ]; then
    echo "📄 Available Standard JSON Input files:"
    echo ""
    echo "1. BMCPMessageReceiver"
    echo "2. ExampleTargetContract"
    echo "3. SchnorrVerifyCaller"
    echo ""
    echo "Usage: ./view-standard-json.sh [number or name]"
    echo ""
    echo "Examples:"
    echo "  ./view-standard-json.sh 1"
    echo "  ./view-standard-json.sh BMCPMessageReceiver"
    echo "  ./view-standard-json.sh ExampleTargetContract"
    exit 0
fi

# Map numbers to contract names
case $CONTRACT in
    1)
        CONTRACT="BMCPMessageReceiver"
        ;;
    2)
        CONTRACT="ExampleTargetContract"
        ;;
    3)
        CONTRACT="SchnorrVerifyCaller"
        ;;
esac

JSON_FILE="standard-json-input/${CONTRACT}-standard-input.json"

if [ ! -f "$JSON_FILE" ]; then
    echo "❌ File not found: $JSON_FILE"
    echo ""
    echo "Available files:"
    ls -1 standard-json-input/
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 Standard JSON Input: $CONTRACT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get contract details
case $CONTRACT in
    BMCPMessageReceiver)
        ADDRESS="0xDeD3f4058Ccdf3C05Bc7f7c38cb07E66A6023893"
        CONSTRUCTOR="0x0000000000000000000000002cac89abf06dbe5d3a059517053b7144074e1ce5"
        ;;
    ExampleTargetContract)
        ADDRESS="0x2314dfD079C2b2cf2C3247fCd552d9d52Ac486De"
        CONSTRUCTOR="(none)"
        ;;
    SchnorrVerifyCaller)
        ADDRESS="0x54AAc9DE386C8185Fe8842456E55d7bF17b1f8aB"
        CONSTRUCTOR="(none)"
        ;;
esac

echo "📋 Verification Details:"
echo ""
echo "Contract Name:        $CONTRACT"
echo "Contract Address:     $ADDRESS"
echo "Compiler Version:     v0.8.19+commit.7dd6d404"
echo "EVM Version:          paris"
echo "Optimization:         Yes"
echo "Runs:                 200"
echo "Constructor Args:     $CONSTRUCTOR"
echo ""
echo "Explorer URL:"
echo "https://explorer.testnet.citrea.xyz/address/$ADDRESS"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if on macOS for clipboard support
if command -v pbcopy &> /dev/null; then
    echo "📋 Options:"
    echo "  [1] Copy JSON to clipboard (macOS)"
    echo "  [2] View JSON in terminal"
    echo "  [3] View JSON with jq (formatted)"
    echo "  [4] Open in default editor"
    echo ""
    read -p "Choose option (1-4, or Enter to skip): " -n 1 -r
    echo ""
    echo ""
    
    case $REPLY in
        1)
            cat "$JSON_FILE" | pbcopy
            echo "✅ JSON copied to clipboard!"
            echo "   Paste it in the Citrea Explorer verification form."
            ;;
        2)
            cat "$JSON_FILE"
            ;;
        3)
            if command -v jq &> /dev/null; then
                cat "$JSON_FILE" | jq '.'
            else
                echo "⚠️  jq not installed. Showing raw JSON:"
                cat "$JSON_FILE"
            fi
            ;;
        4)
            open "$JSON_FILE"
            echo "✅ Opened in default editor"
            ;;
        *)
            echo "ℹ️  To view manually: cat $JSON_FILE"
            ;;
    esac
else
    echo "📄 Showing JSON content:"
    echo ""
    cat "$JSON_FILE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Go to: https://explorer.testnet.citrea.xyz/address/$ADDRESS"
echo "2. Click 'Verify & Publish' button"
echo "3. Select 'Solidity (Standard JSON Input)'"
echo "4. Paste the JSON in the 'Standard JSON Input' field"
echo "5. Enter constructor args: $CONSTRUCTOR"
echo "6. Click 'Verify and Publish'"
echo ""
echo "✅ Done! For more help, see: EXPLORER_VERIFICATION_GUIDE.md"
echo ""

