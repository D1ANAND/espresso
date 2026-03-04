import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import { BitcoinCommandEncoder, CHAIN_SELECTORS } from '@bmcp/sdk';

// Initialize ECC library (required for bitcoinjs-lib v6+)
bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

dotenv.config();

// Bitcoin testnet4 network with BIP32 prefixes matching vpub/vprv (same as bitcoin-api)
const network: bitcoin.Network = {
  ...bitcoin.networks.testnet,
  bip32: {
    public: 0x045f1cf6,
    private: 0x045f18bc,
  },
};

export const app = express();

app.use(express.json());
app.use(cors());

const PORT = Number(process.env.ESP_ESCROW_PORT || 4001);
const BITCOIN_API_URL = process.env.BITCOIN_API_URL || 'http://localhost:4000';
const ESCROW_WIF = process.env.ESCROW_WIF || '';

// Prepare escrow key and address (used to fund and sign the Bitcoin transaction)
let escrowKey: ECPairInterface | null = null;
let escrowAddress: string | undefined;

if (ESCROW_WIF) {
  try {
    escrowKey = ECPair.fromWIF(ESCROW_WIF, network);
    const payment = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(escrowKey.publicKey),
      network,
    });
    escrowAddress = payment.address;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize escrow key from ESCROW_WIF:', err);
  }
} else {
  // eslint-disable-next-line no-console
  console.warn(
    'ESCROW_WIF not set. ESP escrow flow will respond with an error until configured.'
  );
}

function resolveChainSelector(destinationChain?: string): bigint {
  const normalized = (destinationChain || '').toLowerCase();

  if (normalized.includes('base') && normalized.includes('sepolia')) {
    return CHAIN_SELECTORS.BASE_SEPOLIA;
  }
  if (normalized === 'sepolia') {
    return CHAIN_SELECTORS.SEPOLIA;
  }
  if (normalized.includes('polygon') || normalized.includes('amoy')) {
    return CHAIN_SELECTORS.POLYGON_AMOY;
  }
  if (normalized.includes('citrea')) {
    return CHAIN_SELECTORS.CITREA_TESTNET;
  }

  // Default to Sepolia if not recognized
  return CHAIN_SELECTORS.SEPOLIA;
}

type EspIntentBody = {
  destination_chain?: string;
  receiver?: string;
  function_signature?: string;
  function_args?: unknown[];
};

app.post(
  '/esp-intent',
  async (req: Request<unknown, unknown, EspIntentBody>, res: Response) => {
    try {
      if (!escrowKey || !escrowAddress) {
        throw new Error(
          'Escrow key not configured. Set ESCROW_WIF (testnet WIF) in .env for @bmcp/esp-escrow.'
        );
      }

      const {
        destination_chain,
        receiver,
        function_signature,
        function_args,
      } = req.body || {};

      if (!receiver || typeof receiver !== 'string') {
        throw new Error('invalid receiver');
      }
      if (!function_signature || typeof function_signature !== 'string') {
        throw new Error('invalid function_signature');
      }
      if (!Array.isArray(function_args)) {
        throw new Error('function_args must be an array');
      }

      // Normalize Ethereum addresses (auto-fix EIP-55 checksums so ESP doesn't have to)
      const { getAddress } = await import('ethers');
      const normalizeAddr = (v: unknown): unknown => {
        if (typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v)) {
          try { return getAddress(v); } catch { return v; }
        }
        return v;
      };
      const normalizedReceiver = normalizeAddr(receiver) as string;
      const normalizedArgs = function_args.map(normalizeAddr);

      // 1. Build BMCP payload from ESP intent
      const chainSelector = resolveChainSelector(destination_chain);
      const now = Math.floor(Date.now() / 1000);

      const bmcpPayload = BitcoinCommandEncoder.encodeBinary(
        chainSelector,
        normalizedReceiver,
        {
          signature: function_signature,
          args: normalizedArgs,
        },
        {
          nonce: now,
          deadline: now + 3600,
        }
      );

      const bmcpDataHex = `0x${bmcpPayload.toString('hex')}`;

      // 2. Ask BMCP Bitcoin API to construct PSBT embedding the BMCP data
      const psbtResp = await axios.post(`${BITCOIN_API_URL}/psbt`, {
        address: escrowAddress,
        sendBmcpData: bmcpDataHex,
      });

      if (!psbtResp.data?.psbtBase64) {
        throw new Error(
          `bitcoin-api /psbt did not return psbtBase64: ${JSON.stringify(
            psbtResp.data
          )}`
        );
      }

      const { psbtBase64 } = psbtResp.data as { psbtBase64: string };

      // 3. Sign PSBT with escrow key
      const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network });

      // Wrap the ECPair signer so publicKey and sign() return Buffer (bitcoinjs-lib v6 requirement)
      const signer = {
        publicKey: Buffer.from(escrowKey.publicKey),
        sign(hash: Buffer): Buffer {
          return Buffer.from(escrowKey!.sign(hash));
        },
      };
      psbt.signAllInputs(signer);
      psbt.validateSignaturesOfAllInputs((pubkey, msghash, signature) =>
        ecc.verify(msghash, pubkey, signature)
      );

      const signedPsbtBase64 = psbt.toBase64();

      // 4. Broadcast via BMCP Bitcoin API
      const broadcastResp = await axios.post(`${BITCOIN_API_URL}/broadcast`, {
        txBase64: signedPsbtBase64,
      });

      return res.status(200).json({
        status: 'ok',
        destination_chain: destination_chain ?? null,
        receiver,
        function_signature,
        function_args,
        bmcpData: bmcpDataHex,
        bitcoinApi: {
          psbt: {
            address: escrowAddress,
            ...psbtResp.data,
          },
          broadcast: broadcastResp.data,
        },
      });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Error handling ESP intent in esp-escrow:', err);
      return res.status(500).json({
        status: 'error',
        message:
          err?.message ??
          (typeof err === 'string' ? err : 'unknown error in esp-escrow'),
      });
    }
  }
);

app.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    escrowConfigured: !!escrowAddress,
    escrowAddress: escrowAddress ?? null,
    bitcoinApiUrl: BITCOIN_API_URL,
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(
      `🚀 ESP Escrow service running on http://localhost:${PORT} (POST /esp-intent)`
    );
  });
}

