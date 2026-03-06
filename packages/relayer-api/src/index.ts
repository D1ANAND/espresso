/**
 * BMCP Relayer API
 * Monitors Bitcoin for BMCP messages and exposes them via REST API
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { BitcoinScanner } from '../../relayer/src/BitcoinScanner';
import { BitcoinCommandEncoder } from '../../sdk/bitcoin';
import { EVMCommandEncoder } from '../../sdk/evm';

// Load environment variables from root directory
config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.RELAYER_API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const TATUM_API_KEY = process.env.TATUM_API_KEY;
const TATUM_RPC_URL =
  process.env.TATUM_RPC_URL || 'https://bitcoin-testnet4.gateway.tatum.io/';

if (!TATUM_API_KEY) {
  console.error('❌ Error: TATUM_API_KEY not found in environment variables');
  process.exit(1);
}

// Initialize Bitcoin Scanner
const scanner = new BitcoinScanner({
  rpcUrl: TATUM_RPC_URL,
  apiKey: TATUM_API_KEY,
  network: 'testnet4',
});

// Cache for recent BMCP messages
interface CachedMessage {
  txid: string;
  timestamp: number;
  decoded: any;
  raw: string;
}

const messageCache: CachedMessage[] = [];
const MAX_CACHE_SIZE = 100;

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'BMCP Relayer API',
    timestamp: new Date().toISOString(),
    network: 'testnet4',
  });
});

/**
 * Get latest BMCP messages from recent blocks
 */
app.get('/api/bmcp/latest', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const blocks = parseInt(req.query.blocks as string) || 5;

    console.log(`📡 Fetching latest BMCP messages (last ${blocks} blocks)...`);

    // Get current block height
    const currentHeight = await scanner.getBlockCount();
    const startHeight = Math.max(1, currentHeight - blocks + 1);

    console.log(
      `   Block range: ${startHeight} - ${currentHeight} (${blocks} blocks)`
    );

    // Scan blocks for BMCP messages
    const messages: any[] = [];

    for (let height = currentHeight; height >= startHeight && messages.length < limit; height--) {
      try {
        const blockHash = await scanner.getBlockHash(height);
        const block = await scanner.getBlock(blockHash);

        // Scan each transaction in the block
        for (const tx of block.tx) {
          const bmcpMessages = scanner.scanTransactionObjectForBMCP(tx);

          for (const msg of bmcpMessages) {
            if (msg.isBMCP && msg.decoded) {
              messages.push({
                txid: msg.txid,
                blockHeight: height,
                blockHash: blockHash,
                outputIndex: msg.outputIndex,
                timestamp: block.time || Date.now(),
                protocol: msg.decoded.protocol,
                chain: msg.decoded.chainName,
                chainSelector: '0x' + msg.decoded.chainSelector.toString(16),
                contract: msg.decoded.contract,
                data: msg.decoded.data,
                nonce: msg.decoded.nonce,
                deadline: msg.decoded.deadline,
                valid: msg.decoded.deadline
                  ? msg.decoded.deadline > Math.floor(Date.now() / 1000)
                  : false,
                raw: msg.opReturnData.toString('hex'),
              });

              if (messages.length >= limit) break;
            }
          }

          if (messages.length >= limit) break;
        }
      } catch (error: any) {
        console.warn(`⚠️  Error scanning block ${height}:`, error.message);
        continue;
      }
    }

    console.log(`✅ Found ${messages.length} BMCP message(s)\n`);

    res.json({
      success: true,
      count: messages.length,
      currentBlock: currentHeight,
      scannedBlocks: blocks,
      messages,
    });
  } catch (error: any) {
    console.error('❌ Error fetching latest messages:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get BMCP message from specific transaction
 */
app.get('/api/bmcp/tx/:txid', async (req: Request, res: Response) => {
  try {
    const { txid } = req.params;

    console.log(`📡 Fetching transaction: ${txid}...`);

    // Scan transaction for BMCP messages
    const messages = await scanner.scanTransactionForBMCP(txid);

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No BMCP messages found in this transaction',
        txid,
      });
    }

    // Process each BMCP message
    const processed = messages
      .filter((msg) => msg.isBMCP)
      .map((msg) => {
        const result: any = {
          txid: msg.txid,
          outputIndex: msg.outputIndex,
          isBMCP: msg.isBMCP,
          raw: msg.opReturnData.toString('hex'),
        };

        if (msg.decoded) {
          result.decoded = {
            protocol: msg.decoded.protocol,
            version: msg.decoded.version,
            chain: msg.decoded.chainName,
            chainSelector: '0x' + msg.decoded.chainSelector.toString(16),
            contract: msg.decoded.contract,
            data: msg.decoded.data,
            nonce: msg.decoded.nonce,
            deadline: msg.decoded.deadline,
            valid: msg.decoded.deadline
              ? msg.decoded.deadline > Math.floor(Date.now() / 1000)
              : false,
          };

          // Try to decode the function call
          try {
            const selector = msg.decoded.data.slice(0, 10);
            const knownFunctions: Record<string, string> = {
              '0xf21355f4': 'onReport(string)',
              '0xa9059cbb': 'transfer(address,uint256)',
              '0x095ea7b3': 'approve(address,uint256)',
            };

            result.decoded.functionSelector = selector;
            result.decoded.functionSignature = knownFunctions[selector] || 'unknown';
          } catch (e) {
            // Ignore function decoding errors
          }
        }

        if (msg.error) {
          result.error = msg.error;
        }

        return result;
      });

    console.log(`✅ Found ${processed.length} BMCP message(s)\n`);

    res.json({
      success: true,
      txid,
      count: processed.length,
      messages: processed,
    });
  } catch (error: any) {
    console.error('❌ Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      txid: req.params.txid,
    });
  }
});

/**
 * Get BMCP messages from a specific block
 */
app.get('/api/bmcp/block/:height', async (req: Request, res: Response) => {
  try {
    const height = parseInt(req.params.height);

    if (isNaN(height) || height < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid block height',
      });
    }

    console.log(`📡 Scanning block ${height}...`);

    const messages = await scanner.scanBlockForBMCP(height);
    const bmcpMessages = messages.filter((msg) => msg.isBMCP);

    console.log(`✅ Found ${bmcpMessages.length} BMCP message(s) in block ${height}\n`);

    res.json({
      success: true,
      blockHeight: height,
      count: bmcpMessages.length,
      messages: bmcpMessages.map((msg) => ({
        txid: msg.txid,
        outputIndex: msg.outputIndex,
        decoded: msg.decoded
          ? {
              protocol: msg.decoded.protocol,
              chain: msg.decoded.chainName,
              contract: msg.decoded.contract,
              nonce: msg.decoded.nonce,
              deadline: msg.decoded.deadline,
              valid: msg.decoded.deadline
                ? msg.decoded.deadline > Math.floor(Date.now() / 1000)
                : false,
            }
          : null,
        error: msg.error,
      })),
    });
  } catch (error: any) {
    console.error('❌ Error scanning block:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get current Bitcoin block height
 */
app.get('/api/bitcoin/height', async (req: Request, res: Response) => {
  try {
    const height = await scanner.getBlockCount();
    res.json({
      success: true,
      height,
      network: 'testnet4',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get latest BMCP messages from mempool
 */
app.get('/api/bmcp/mempool', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    console.log(`📡 Fetching mempool transactions...`);

    // Get raw mempool
    const response = await fetch(TATUM_RPC_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': TATUM_API_KEY!,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'getrawmempool',
        params: [false], // false = just txids
        id: 1,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Bitcoin RPC error: ${data.error.message}`);
    }

    const mempoolTxids: string[] = data.result || [];
    console.log(`   Found ${mempoolTxids.length} transactions in mempool`);

    // Scan mempool transactions for BMCP messages
    const bmcpMessages: any[] = [];
    let scanned = 0;

    for (const txid of mempoolTxids) {
      if (bmcpMessages.length >= limit) break;
      if (scanned >= 100) break; // Don't scan more than 100 txs

      try {
        const messages = await scanner.scanTransactionForBMCP(txid);
        scanned++;

        for (const msg of messages) {
          if (msg.isBMCP && msg.decoded) {
            bmcpMessages.push({
              txid: msg.txid,
              outputIndex: msg.outputIndex,
              status: 'unconfirmed (mempool)',
              protocol: msg.decoded.protocol,
              chain: msg.decoded.chainName,
              chainSelector: '0x' + msg.decoded.chainSelector.toString(16),
              contract: msg.decoded.contract,
              data: msg.decoded.data,
              nonce: msg.decoded.nonce,
              deadline: msg.decoded.deadline,
              valid: msg.decoded.deadline
                ? msg.decoded.deadline > Math.floor(Date.now() / 1000)
                : false,
              raw: msg.opReturnData.toString('hex'),
            });

            if (bmcpMessages.length >= limit) break;
          }
        }
      } catch (error) {
        // Skip transactions that can't be fetched
        continue;
      }
    }

    console.log(`✅ Found ${bmcpMessages.length} BMCP message(s) in mempool\n`);

    res.json({
      success: true,
      count: bmcpMessages.length,
      totalMempoolTxs: mempoolTxids.length,
      scanned,
      messages: bmcpMessages,
      note: 'These transactions are unconfirmed and waiting for block inclusion',
    });
  } catch (error: any) {
    console.error('❌ Error fetching mempool:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get BMCP message from mempool (unconfirmed transaction)
 */
app.get('/api/bmcp/mempool/:txid', async (req: Request, res: Response) => {
  try {
    const { txid } = req.params;

    console.log(`📡 Fetching from mempool: ${txid}...`);

    // Try to get from mempool first
    const messages = await scanner.scanTransactionForBMCP(txid);

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No BMCP messages found in this transaction',
        txid,
        note: 'Transaction may not be in mempool or blockchain',
      });
    }

    // Process BMCP messages
    const processed = messages
      .filter((msg) => msg.isBMCP)
      .map((msg) => {
        const result: any = {
          txid: msg.txid,
          outputIndex: msg.outputIndex,
          isBMCP: msg.isBMCP,
          status: 'unconfirmed (mempool)',
          raw: msg.opReturnData.toString('hex'),
        };

        if (msg.decoded) {
          result.decoded = {
            protocol: msg.decoded.protocol,
            version: msg.decoded.version,
            chain: msg.decoded.chainName,
            chainSelector: '0x' + msg.decoded.chainSelector.toString(16),
            contract: msg.decoded.contract,
            data: msg.decoded.data,
            nonce: msg.decoded.nonce,
            deadline: msg.decoded.deadline,
            valid: msg.decoded.deadline
              ? msg.decoded.deadline > Math.floor(Date.now() / 1000)
              : false,
          };

          // Decode function call
          try {
            const selector = msg.decoded.data.slice(0, 10);
            const knownFunctions: Record<string, string> = {
              '0xf21355f4': 'onReport(string)',
              '0xa9059cbb': 'transfer(address,uint256)',
              '0x095ea7b3': 'approve(address,uint256)',
            };

            result.decoded.functionSelector = selector;
            result.decoded.functionSignature = knownFunctions[selector] || 'unknown';
          } catch (e) {
            // Ignore function decoding errors
          }
        }

        if (msg.error) {
          result.error = msg.error;
        }

        return result;
      });

    console.log(`✅ Found ${processed.length} BMCP message(s) in mempool\n`);

    res.json({
      success: true,
      txid,
      status: 'unconfirmed',
      count: processed.length,
      messages: processed,
      note: 'This transaction is in the mempool and waiting for confirmation',
    });
  } catch (error: any) {
    console.error('❌ Error fetching from mempool:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      txid: req.params.txid,
    });
  }
});

/**
 * Decode raw OP_RETURN data
 */
app.post('/api/bmcp/decode', (req: Request, res: Response) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Missing data field in request body',
      });
    }

    // Convert hex string to buffer
    const buffer = Buffer.from(data.replace('0x', ''), 'hex');

    // Check if it's a BMCP message
    const isBMCP = BitcoinCommandEncoder.isBMCPMessage(buffer);

    if (!isBMCP) {
      return res.json({
        success: true,
        isBMCP: false,
        message: 'Not a BMCP message (invalid protocol magic)',
      });
    }

    // Decode the message
    const decoded = BitcoinCommandEncoder.decodeBinary(buffer);

    res.json({
      success: true,
      isBMCP: true,
      decoded: {
        protocol: decoded.protocol,
        version: decoded.version,
        chainSelector: '0x' + decoded.chainSelector.toString(16),
        contract: decoded.contract,
        data: decoded.data,
        nonce: decoded.nonce,
        deadline: decoded.deadline,
        valid: decoded.deadline
          ? decoded.deadline > Math.floor(Date.now() / 1000)
          : false,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║            BMCP Relayer API Server                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔗 Network: Bitcoin Testnet4`);
  console.log(`📡 Tatum API: ${TATUM_RPC_URL}`);
  console.log();
  console.log('📋 Available Endpoints:');
  console.log(`   GET  /health                      - Health check`);
  console.log(`   GET  /api/bmcp/latest             - Get latest BMCP messages (confirmed)`);
  console.log(`   GET  /api/bmcp/mempool            - Get latest BMCP from mempool`);
  console.log(`   GET  /api/bmcp/tx/:txid           - Get BMCP from transaction`);
  console.log(`   GET  /api/bmcp/mempool/:txid      - Get BMCP from mempool by txid`);
  console.log(`   GET  /api/bmcp/block/:height      - Get BMCP from block`);
  console.log(`   GET  /api/bitcoin/height          - Get current block height`);
  console.log(`   POST /api/bmcp/decode             - Decode raw OP_RETURN data`);
  console.log();
  console.log('✅ Ready to serve BMCP messages!\n');
});

