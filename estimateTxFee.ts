import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { hexToU8a, u8aToHex } from '@polkadot/util';

import { cryptoWaitReady } from '@polkadot/util-crypto';

import yargs from 'yargs';

const args = yargs.options({
  network: { type: 'string', demandOption: true, alias: 'n' },
  call: { type: 'string', demandOption: false, alias: 'c' },
  pallet: { type: 'string', demandOption: false, alias: 'p' },
  extrinsic: { type: 'string', demandOption: false, alias: 'e' },
  input: { type: 'array', demandOption: false, alias: 'i' },
}).argv;

// Check input
let option = 0;
if (!args['call']) {
  option = 1;
  if (!(args['pallet'] && args['extrinsic'] && args['input'])) {
    console.error('You need to provide an encoded call data or a pallet/extrinsic/input');
  }
}

// Create Provider
let wsProvider;
let accountType;
switch (args['network']) {
  case 'moonbeam':
    wsProvider = 'wss://wss.api.moonbeam.network';
    accountType = 'ethereum';
    break;
  case 'moonriver':
    wsProvider = 'wss://wss.api.moonriver.moonbeam.network';
    accountType = 'ethereum';
    break;
  case 'moonbase':
    wsProvider = 'wss://wss.api.moonbase.moonbeam.network';
    accountType = 'ethereum';
    break;
  case 'polkadot':
    wsProvider = 'wss://rpc.polkadot.io';
    accountType = 'sr25519';
    break;
  case 'kusama':
    wsProvider = 'wss://kusama-rpc.polkadot.io';
    accountType = 'sr25519';
    break;
  case 'moonbaseRelay':
    wsProvider = 'wss://frag-moonbase-relay-rpc-ws.g.moonbase.moonbeam.network';
    accountType = 'sr25519';
    break;
  default:
    console.error('Network not supported');
}

const main = async () => {
  // Load Provider
  const api = await ApiPromise.create({
    provider: new WsProvider(wsProvider),
  });
  await cryptoWaitReady();

  // Load account - DO NOT USE IN PRODUCTION!
  const keyring = new Keyring({ type: accountType });
  const alice = keyring.addFromUri(
    'slight return mercy battle script flee firm behave mix crawl surprise mimic',
    { name: 'DO NOT USE IN PRODUCTION' }
  );

  let txFee;
  if (option === 0) {
    // Create Types
    let txCall = api.createType('Call', hexToU8a(args['call'])) as any;
    txFee = await api.tx(txCall).paymentInfo(alice);
  } else {
    txFee = await api.tx[args['pallet']][args['extrinsic']](...args['input']).paymentInfo(alice);
  }

  console.log(`Fee of your call is ${txFee.partialFee.toHuman()}`);
  console.log(`Weight of your call is`);
  console.log(txFee.weight.toHuman());

  await api.disconnect();
};

main()
  .catch(console.error)
  .finally(() => process.exit());
