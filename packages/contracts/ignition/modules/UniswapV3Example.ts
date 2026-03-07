import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('UniswapV3ExampleModule', (m) => {
  const contract = m.contract('UniswapV3Example', [
    '0x103F53787b29ddf2B34ae185C13b7a6aE7445a8d', // UPDATE THIS
    '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  ]);

  return { contract };
});
