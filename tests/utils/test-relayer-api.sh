#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          BMCP Relayer API - Test Script                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

API_URL="http://localhost:3001"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting BMCP Relayer API...${NC}"
npm run dev:relayer-api > /dev/null 2>&1 &
API_PID=$!
sleep 3

# Test 1: Health Check
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}TEST 1: Health Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "GET $API_URL/health"
echo ""
curl -s $API_URL/health | jq .

# Test 2: Get Bitcoin Height
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}TEST 2: Get Bitcoin Block Height${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "GET $API_URL/api/bitcoin/height"
echo ""
curl -s $API_URL/api/bitcoin/height | jq .

# Test 3: Get Specific Transaction
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}TEST 3: Get BMCP Message from Transaction${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
TXID="967c5898bb81f7780bdde68e6d83c0903095e5650ad6fa5e76cf6cc5926947dd"
echo "GET $API_URL/api/bmcp/tx/$TXID"
echo ""
curl -s "$API_URL/api/bmcp/tx/$TXID" | jq '.messages[0].decoded'

# Test 4: Get Latest Messages
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}TEST 4: Get Latest BMCP Messages${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "GET $API_URL/api/bmcp/latest?limit=3&blocks=10"
echo ""
curl -s "$API_URL/api/bmcp/latest?limit=3&blocks=10" | jq '{success, count, currentBlock, scannedBlocks, messages: [.messages[] | {txid, chain, contract, valid}]}'

# Test 5: Decode Raw Data
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}TEST 5: Decode Raw OP_RETURN Data${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "POST $API_URL/api/bmcp/decode"
echo ""
curl -s -X POST $API_URL/api/bmcp/decode \
  -H "Content-Type: application/json" \
  -d '{"data": "0x424d435001de41ba4fc9d91ad92bae8224110482ec6ddf12faf359a35362d435730064f21355f4000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000104865792046726f6d20426974636f696e0000000000000000000000000000000000000000692249eb"}' \
  | jq '{success, isBMCP, decoded: {protocol, chain, contract, functionSignature, valid}}'

# Cleanup
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Stopping API server...${NC}"
kill $API_PID 2>/dev/null || true
wait $API_PID 2>/dev/null || true

echo -e "\n${GREEN}✅ All tests complete!${NC}"
echo ""

