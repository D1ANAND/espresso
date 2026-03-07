import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export default buildModule('BMCPCREReceiverModule', (m) => {
  const contract = m.contract('BMCPCREReceiver', [
    '0x76c9cf548b4179F8901cda1f8623568b58215E62',
    '0x1111111111111111111111111111111111111111111111111111111111111111',
  ]);

  return { contract };
});
