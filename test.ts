/*
  Simple script to fetch all balance transfer events.
  Taken from: https://gist.github.com/crystalin/b2ce44a208af60d62b5ecd1bad513bce
*/

import { ApiPromise, WsProvider } from '@polkadot/api';
import yargs from 'yargs';

// This script will listen to all GLMR transfers (Substrate & Ethereum) and extract the tx hash
// It can be adapted for Moonriver or Moonbase Alpha

const args = yargs.options({
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

// This script will listen to all MOVRs transfers (Substrate & Ethereum)
// It will also retrieve the Ethereum Hash (if existing) and the Substrate Hash (always existing)

const main = async () => {
    const api = await ApiPromise.create({
        provider: wsProvider,
    });

    await api.rpc.chain.subscribeFinalizedHeads(async (lastFinalizedHeader) => {
        const [{ block }, records]: (any | any)[] = await Promise.all([
            api.rpc.chain.getBlock(lastFinalizedHeader.hash),
            api.query.system.events.at(lastFinalizedHeader.hash),
        ]);

        block.extrinsics.forEach((extrinsic, index) => {
            const {
                method: { args, method, section },
            } = extrinsic;

            const isEthereum = section == 'ethereum' && method == 'transact';

            const tx = args[0] as any;

            // Convert to the correct Ethereum Transaction format
            const ethereumTx =
                isEthereum &&
                ((tx.isLegacy && tx.asLegacy) ||
                    (tx.isEip1559 && tx.asEip1559) ||
                    (tx.isEip2930 && tx.asEip2930));

            const isEthereumTransfer =
                ethereumTx && ethereumTx.input.length === 0 && ethereumTx.action.isCall;

            // Retrieve all events for this extrinsic
            const events = records.filter(
                ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index)
            );

            // This hash will only exist if the transaction was executed through ethereum.
            let ethereumHash = '';

            if (isEthereum) {
                // Search for ethereum execution
                events.forEach(({ event }) => {
                    if (event.section == 'ethereum' && event.method == 'Executed') {
                        ethereumHash = event.data[2].toString();
                    }
                });
            }

            // Search if it is a transfer
            events.forEach(({ event }) => {
                if (event.section == 'balances' && event.method == 'Transfer') {
                    const from = event.data[0].toString();
                    const to = event.data[1].toString();
                    const balance = (event.data[2] as any).toBigInt();

                    const substrateHash = extrinsic.hash.toString();

                    console.log(
                        `Transfer from ${from} to ${to} of ${balance} (block #${lastFinalizedHeader.number})`
                    );
                    console.log(`  - Triggered by extrinsic: ${substrateHash}`);
                    if (isEthereum) {
                        console.log(
                            `  - Ethereum (isTransfer: ${isEthereumTransfer}) hash: ${ethereumHash}`
                        );
                    }
                }
            });
        });
    });
};

main();
