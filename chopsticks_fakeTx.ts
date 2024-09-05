import { ApiPromise, WsProvider } from '@polkadot/api';
import { signFakeWithApi } from '@acala-network/chopsticks-utils';
import { hexToU8a } from '@polkadot/util';

import yargs from 'yargs';

// Get input arguments
const args = yargs.options({
  endpoint: { type: 'string', demandOption: true, default: 'ws://127.0.0.1:8000', alias: 'e' },
  sender: { type: 'string', demandOption: true, alias: 's' },
  network: { type: 'string', demandOption: true, default: 'polkadot', alias: 'n' },
}).argv;

const main = async () => {
  console.log('--- Chopsticks Test Started ---');

  const chopsticksProvider = new WsProvider(args['endpoint']);
  const chopsticksAPI = await ApiPromise.create({
    provider: chopsticksProvider,
    noInitWarn: true,
  });

  // Call

  const tx = await chopsticksAPI.tx.proxy.addProxy(
    '15d3DYQdzUjzzCeurSHvan3ma4KGxAW7kqr6Nc3KinP83CLX',
    'NonTransfer',
    0
  );

  console.log(tx.toHex());
  await signFakeWithApi(chopsticksAPI, tx, args['sender']);
  await tx.send();

  console.log('--- Chopsticks Test Done ---');
  await chopsticksAPI.disconnect();
};

main();
