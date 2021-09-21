/*
  Simple code snippet to check if an Ethereum Tx Hash has been finalized. 
  It will fetch the block number of the tx and compare it with the latest
  finalized block.
*/
import { ApiPromise, WsProvider } from '@polkadot/api';
import { typesBundle } from 'moonbeam-types-bundle';

// Define the TxHash to Check Finality
const txHash = 'tx_hash';

// Define the provider
const wsProvider = new WsProvider('wss://wss.moonriver.moonbeam.network');

const main = async () => {
  // Wait for provider
  const api = await ApiPromise.create({
    provider: wsProvider,
    typesBundle: typesBundle,
  });
  await api.isReady;

  // Get the latest finalized block of the Substrate chain
  const finalizedHeadHash = (await api.rpc.chain.getFinalizedHead()).toJSON();

  // Get finalized block header to retrieve number
  const finalizedBlockHeader = (await api.rpc.chain.getHeader(finalizedHeadHash)).toJSON();

  // Get the transaction receipt of the given tx hash
  const txReceipt = (await api.rpc.eth.getTransactionReceipt(txHash)).toJSON();

  // If block number of receipt is not null, compare it against finalized head
  if (txReceipt) {
    console.log(`Current finalized block number is ${finalizedBlockHeader.number}`);
    console.log(
      `Your transaction in block ${txReceipt.blockNumber} is finalized? ${
        finalizedBlockHeader.number >= txReceipt.blockNumber
      }`
    );
  } else {
    console.log('Your transaction has not been included in the canonical chain');
  }
};

main();
