/*
  Simple code snippet to check if an Ethereum Tx Hash has been finalized. 
  It will fetch the block number of the tx and compare it with the latest
  finalized block.
*/
import { ApiPromise, WsProvider } from '@polkadot/api';
import yargs from 'yargs';

const args = yargs.options({
    'tx-hash': { type: 'string', demandOption: true, alias: 'tx' },
    network: { type: 'string', demandOption: true, alias: 'n' },
}).argv;

// Create Provider
let wsProvider;
if (args['network'] === 'moonbeam') {
    wsProvider = new WsProvider('wss://wss.api.moonbeam.network');
} else if (args['network'] === 'moonriver') {
    wsProvider = new WsProvider('wss://wss.api.moonriver.moonbeam.network');
} else if (args['network'] === 'moonbase') {
    wsProvider = new WsProvider('wss://wss.api.moonbase.moonbeam.network');
} else {
    console.error('Network not supported');
    process.exit();
}

const main = async () => {
    // Create the provider using Moonbeam types
    const api = await ApiPromise.create({
        provider: wsProvider,
    });
    await api.isReady;

    // Get the latest finalized block of the Substrate chain
    const finalizedHeadHash = (await api.rpc.chain.getFinalizedHead()).toJSON();

    // Get finalized block header to retrieve number
    const finalizedBlockHeader = (await api.rpc.chain.getHeader(finalizedHeadHash)).toJSON();

    // Get the transaction receipt of the given tx hash
    const txReceipt = (await api.rpc.eth.getTransactionReceipt(args['tx-hash'])).toJSON();

    // We can not verify if the tx is in block because api.rpc.eth.getBlockByNumber
    // does not return the list of tx hash

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

    await api.disconnect();
};

main();
