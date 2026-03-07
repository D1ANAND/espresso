import hardhatIgnitionPlugin from '@nomicfoundation/hardhat-ignition';
import hardhatKeystore from '@nomicfoundation/hardhat-keystore';
import hardhatVerify from '@nomicfoundation/hardhat-verify';
import { configVariable, defineConfig } from 'hardhat/config';

export default defineConfig({
  plugins: [hardhatIgnitionPlugin, hardhatKeystore, hardhatVerify],
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: './src',
  },
  networks: {
    hardhatMainnet: {
      type: 'edr-simulated',
      chainType: 'l1',
    },
    hardhatOp: {
      type: 'edr-simulated',
      chainType: 'op',
    },
    sepolia: {
      type: 'http',
      chainType: 'l1',
      url: configVariable('SEPOLIA_RPC_URL'),
      accounts: [configVariable('SEPOLIA_PRIVATE_KEY')],
    },
    polygon: {
      type: 'http',
      chainType: 'l1',
      url: configVariable('POLYGON_RPC_URL'),
      accounts: [configVariable('POLYGON_PRIVATE_KEY')],
    },
  },
  test: {
    solidity: {
      timeout: 40000,
    },
  },
  verify: {
    etherscan: {
      apiKey: configVariable('ETHERSCAN_API_KEY'),
    },
  },
});
