import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('SimpleTransfersExampleModule', (m) => {
  const contract = m.contract('SimpleTransfersExample', [
    '0x103F53787b29ddf2B34ae185C13b7a6aE7445a8d',
  ]);

  return { contract };
});
