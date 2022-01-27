/*
  Simple code snippet to fetch the hash of the latest finalized block
  and retrieve that blocks number. Another strategy might be getting the block
  of the transaction and check if blockTransaction <= blockFinalized
*/
import { ApiPromise, WsProvider } from '@polkadot/api';

// Create Provider
const wsProvider = new WsProvider('wss://wss.moonriver.moonbeam.network');

const main = async () => {
  // Wait for Provider
  const api = await ApiPromise.create({
    provider: wsProvider,
  });
  await api.isReady;

  // Get latest block that is finalized
  const finalizedHeadHash = await api.rpc.chain.getFinalizedHead();

  // Get finalized block to retrieve number
  const finalizedBlock = (await api.rpc.chain.getBlock(finalizedHeadHash)).toJSON();

  // Block number is stored in finalizedBlock.block.header.number
  console.log(`Block number ${finalizedBlock.block.header.number} is the last Finalized`);
};

main();
