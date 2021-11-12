/*
  Simple code snippet to fetch parachain crowdloan contribution 
  addresses and store them in a JSON file
*/
import { ApiPromise, WsProvider } from '@polkadot/api';
import { typesBundlePre900 } from 'moonbeam-types-bundle';
import * as fs from 'fs';

// Create Provider
const wsProvider = new WsProvider('wss://wss.moonriver.moonbeam.network');

const main = async () => {
  // Wait for Provider
  const api = await ApiPromise.create({
    provider: wsProvider,
    typesBundle: typesBundlePre900,
  });
  await api.isReady;

  // Get the list of active collators
  const rawRewardsList = await api.query.crowdloanRewards.accountsPayable.entries();

  let rewardsAddresses = [];

  rawRewardsList.forEach(([key, exposure]) => {
    rewardsAddresses.push({
      account: key.args.map((k) => k.toHuman()),
      rewards: exposure.toHuman(),
    });
  });

  // Save data to JSON file
  const dataJSON = JSON.stringify(rewardsAddresses);
  fs.writeFileSync('movr_rewards_addresses.json', dataJSON, 'utf-8');
};

main();
