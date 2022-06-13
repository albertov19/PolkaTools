import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { hexToU8a, u8aToHex } from '@polkadot/util';

import { cryptoWaitReady } from '@polkadot/util-crypto';

import yargs from 'yargs';

const args = yargs.options({
  network: { type: 'string', demandOption: true, alias: 'n' },
  depth: { type: 'string', demandOption: true, alias: 'd' },
  index: { type: 'array', demandOption: true, alias: 'i' },
  call: { type: 'string', demandOption: true, alias: 'c' },
}).argv;

// Create Provider
let wsProvider;
switch (args['network']) {
  case 'moonbeam':
    wsProvider = 'wss://wss.api.moonbeam.network';
    break;
  case 'moonriver':
    wsProvider = 'wss://wss.api.moonriver.moonbeam.network';
    break;
  case 'moonbase':
    wsProvider = 'wss://wss.api.moonbase.moonbeam.network';
    break;
  case 'polkadot':
    wsProvider = 'wss://rpc.polkadot.io';
    break;
  case 'kusama':
    wsProvider = 'wss://kusama-rpc.polkadot.io';
    break;
  case 'moonbaseRelay':
    wsProvider = 'wss://frag-moonbase-relay-rpc-ws.g.moonbase.moonbeam.network';
    break;
  default:
    console.error('Network not supported');
}

const main = async () => {
  // Load Provider
  const api = await ApiPromise.create({
    provider: new WsProvider(wsProvider),
  });

  let index = args['index'].reverse();
  let tx;
  for (let i = 0; i < args['depth']; i++) {
    if (i == 0) {
      // Build main tx
      tx = api.tx.utility.asDerivative(index[i], args['call']);
    } else {
      // Build nested as derivatives
      tx = api.tx.utility.asDerivative(index[i], tx);
    }
  }

  console.log(tx.method.toHex());

  await api.disconnect();
};

main()
  .catch(console.error)
  .finally(() => process.exit());
