/*
  Simple code snippet to fetch parachain crowdloan contribution 
  addresses and store them in a JSON file
*/
import { ApiPromise, WsProvider } from '@polkadot/api';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from 'fs';

const argv = yargs(hideBin(process.argv)).options({
    network: { type: 'string', demandOption: true, alias: 'n' },
}).argv;

// Create Provider
let wsProvider;
if (argv['network'] === 'moonbeam') {
    wsProvider = new WsProvider('wss://wss.api.moonbeam.network');
} else if (argv['network'] === 'moonriver') {
    wsProvider = new WsProvider('wss://wss.api.moonriver.moonbeam.network');
} else {
    console.error('Network not supported');
    process.exit();
}

const main = async () => {
    // Wait for Provider
    const api = await ApiPromise.create({
        provider: wsProvider,
    });
    await api.isReady;

    // Get the list of active collators
    const rawStakingList = await api.query.parachainStaking.delegatorState.entries();

    let stakingAddresses = [];

    rawStakingList.forEach(([key, exposure]: any | any) => {
        stakingAddresses.push({
            account: key.args.map((k) => k.toHuman()),
            total: Number(exposure.toHuman().total.replaceAll(',', '')),
        });
    });

    stakingAddresses.sort((a, b) => (a.total > b.total ? -1 : 1));

    stakingAddresses.map((key) => {
        key.total = key.total.toLocaleString();
    });

    // Save data to JSON file
    const dataJSON = JSON.stringify(stakingAddresses);
    fs.writeFileSync(argv['network'] + '_staking_addresses.json', dataJSON, 'utf-8');

    console.log('Done ✔️-- \n');

    await api.disconnect();
};

main();
