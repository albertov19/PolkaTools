import { ApiPromise, WsProvider } from '@polkadot/api';
import { signFakeWithApi } from '@acala-network/chopsticks-utils';

import yargs from 'yargs';

// Get input arguments
const args = yargs.options({
  endpoint: { type: 'string', demandOption: true, default: 'ws://127.0.0.1:8000', alias: 'e' },
  sender: { type: 'string', demandOption: true, alias: 's' },
}).argv;

const main = async () => {
  console.log('--- Chopsticks Test Started ---');

  const chopsticksProvider = new WsProvider(args['endpoint']);
  const chopsticksAPI = await ApiPromise.create({
    provider: chopsticksProvider,
    noInitWarn: true,
  });

  // Call
  const tx = await chopsticksAPI.tx.referenda.placeDecisionDeposit(108);

  console.log(tx.toHex());
  await signFakeWithApi(chopsticksAPI, tx, args['sender']);
  await tx.send();

  console.log('--- Chopsticks Test Done ---');
  await chopsticksAPI.disconnect();
};

main();
