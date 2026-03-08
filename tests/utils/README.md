# Test Utilities and Scripts

This directory contains utility scripts and test files that support the BMCP development workflow.

## Files

### create-new-bmcp-message.ts
**Purpose**: Utility script for manually creating and encoding BMCP messages

**Usage**:
```bash
npm run ts-node tests/utils/create-new-bmcp-message.ts
```

**Features**:
- Interactive message creation
- Protocol encoding validation
- Size calculation
- Output hex for Bitcoin OP_RETURN

### test-dashboard-encoding.html
**Purpose**: HTML test page for dashboard encoding functionality

**Usage**:
```bash
# Open in browser
open tests/utils/test-dashboard-encoding.html
```

**Features**:
- Browser-based encoding tests
- Visual validation of encoded messages
- Protocol buffer testing

### test-relayer-api.sh
**Purpose**: Shell script for testing the relayer API endpoints

**Usage**:
```bash
chmod +x tests/utils/test-relayer-api.sh
./tests/utils/test-relayer-api.sh
```

**Tests**:
- Health check endpoint
- Message submission
- Status queries
- Error handling

**Example**:
```bash
# Test health endpoint
curl http://localhost:3001/health

# Submit test message
curl -X POST http://localhost:3001/submit \
  -H "Content-Type: application/json" \
  -d '{"txid":"abc123","message":"0x4243..."}'
```

### verify-security.sh
**Purpose**: Security verification script for contract deployments

**Usage**:
```bash
chmod +x tests/utils/verify-security.sh
./tests/utils/verify-security.sh
```

**Checks**:
- Contract bytecode verification
- Deployment address validation
- Constructor arguments verification
- Source code matching

**Example Output**:
```
✓ Checking BMCPMessageReceiver...
  - Deployed at: 0xDeD3f4058Ccdf3C05Bc7f7c38cb07E66A6023893
  - Bytecode hash: 0x8a16d895...
  - Constructor args: Valid
  - Source code: Verified

✓ Checking ExampleTargetContract...
  - Deployed at: 0x2314dfD079C2b2cf2C3247fCd552d9d52Ac486De
  - Bytecode hash: 0x599fe4ab...
  - Constructor args: Valid
  - Source code: Verified

All security checks passed!
```

## Directory Organization

The test utilities are organized to keep the root directory clean:

```
tests/
├── integration/              # Integration test suites
│   ├── bitcoin-encoder.test.ts
│   ├── evm-encoder.test.ts
│   └── full-flow.test.ts
├── EVMCommandEncoder.test.ts # Unit tests
├── MessageEncoder.test.ts    # Unit tests
└── utils/                    # Utility scripts (this directory)
    ├── create-new-bmcp-message.ts
    ├── test-dashboard-encoding.html
    ├── test-relayer-api.sh
    ├── verify-security.sh
    └── README.md
```

## Development Workflow

### 1. Creating New Messages

```bash
# Create a test message
npm run ts-node tests/utils/create-new-bmcp-message.ts

# Follow the prompts to configure:
# - Destination chain
# - Target contract
# - Function call
# - Gas limit
```

### 2. Testing Dashboard Encoding

```bash
# Start development server
cd packages/dashboard
npm run dev

# Open test page
open ../../tests/utils/test-dashboard-encoding.html
```

### 3. Testing Relayer API

```bash
# Start relayer API
cd packages/relayer-api
npm run dev

# In another terminal, run tests
./tests/utils/test-relayer-api.sh
```

### 4. Verifying Deployments

```bash
# After deploying contracts
./tests/utils/verify-security.sh

# Check output for any issues
```

## Adding New Utilities

When adding new test utilities:

1. Place them in `tests/utils/`
2. Add execute permissions for shell scripts: `chmod +x script.sh`
3. Document usage in this README
4. Add examples of expected output
5. Include error handling

### Template for New Script

```bash
#!/bin/bash
# Script Name: new-utility.sh
# Purpose: Brief description
# Usage: ./tests/utils/new-utility.sh [args]

set -e  # Exit on error

# Script logic here
echo "Running utility..."

# Success message
echo "✓ Complete!"
```

## Environment Variables

Some utilities require environment variables:

```bash
# .env file in project root
BITCOIN_RPC_URL=http://localhost:8332
RELAYER_API_URL=http://localhost:3001
CITREA_RPC_URL=https://rpc.testnet.citrea.xyz
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

## CI/CD Integration

These utilities are used in CI/CD pipelines:

```yaml
# .github/workflows/test.yml
- name: Run relayer API tests
  run: ./tests/utils/test-relayer-api.sh

- name: Verify deployment security
  run: ./tests/utils/verify-security.sh
```

## Troubleshooting

### Script Permission Denied

```bash
chmod +x tests/utils/*.sh
```

### Module Not Found (TypeScript)

```bash
npm install
npm run build
```

### Relayer API Not Responding

```bash
# Check if relayer is running
curl http://localhost:3001/health

# Start relayer if needed
cd packages/relayer-api && npm run dev
```

### Contract Verification Fails

```bash
# Ensure you're on the correct network
export NETWORK=citrea-testnet

# Re-run verification
./tests/utils/verify-security.sh
```

## Contributing

When contributing new utilities:

1. Follow the naming convention: `action-description.{ts,sh,html}`
2. Add comprehensive documentation
3. Include example usage
4. Test on multiple environments
5. Update this README

---

**Last Updated**: November 23, 2025  
**Maintainer**: BMCP Team

