/*
  Simple code snippet to fetch parachain staking related data using 
  Polkadot.js API - Not to be used in production
  Use at your own discretion
*/
import { ApiPromise, WsProvider } from '@polkadot/api';
import { typesBundlePre900 } from 'moonbeam-types-bundle';

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
  const collatorList = (await api.query.parachainStaking.selectedCandidates()).toJSON();
  console.log(collatorList);

  // Get list of ALL collators
  //const collatorList = (await api.query.parachainStaking.candidatePool()).toJSON();
  //console.log(collatorList);

  // Get details of each collator
  for (let i = 0; i < collatorList.length - 1; i++) {
    console.log(`\n Collator: ${collatorList[i]}`);
    const collatorData = await api.query.parachainStaking.collatorState2(collatorList[i]);
    console.log(collatorData.toJSON());
  }
};

main();
