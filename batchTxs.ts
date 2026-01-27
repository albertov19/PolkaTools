import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import { signFakeWithApi } from '@acala-network/chopsticks-utils';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const args = yargs(hideBin(process.argv)).options({
  // Get input arguments
  'generic-call': { type: 'string', demandOption: true, alias: 'call' },
  network: { type: 'string', demandOption: true, alias: 'n' },
  signer: { type: 'string', demandOption: false, default: '' }, // Signer address
}).argv;

// Create Provider
let wsProvider;
switch (args['network']) {
  case 'polkadot':
    wsProvider = new WsProvider('wss://rpc-asset-hub-polkadot.luckyfriday.io');
    break;
  case 'kusama':
    wsProvider = new WsProvider('wss://rpc-asset-hub-kusama.luckyfriday.io');
    break;
  case 'moonbeam':
    wsProvider = new WsProvider('wss://wss.api.moonbeam.network');
    break;
  case 'moonriver':
    wsProvider = new WsProvider('wss://wss.api.moonriver.moonbeam.network');
    break;
  case 'moonbase':
    wsProvider = new WsProvider('wss://wss.api.moonbase.moonbeam.network');
    break;
  default:
    wsProvider = new WsProvider(args['network']);
}

const main = async () => {
  // Initialize WASM
  await cryptoWaitReady();

  // Wait for Provider
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;

  let Tx;
  if (Array.isArray(args['generic-call'])) {
    let Txs = [];

    // If several calls, we just push alltogether to batch
    for (let i = 0; i < args['generic-call'].length; i++) {
      let call = api.createType('Call', hexToU8a(args['generic-call'][i])) as any;
      Txs.push(call);
    }
    const batchCall = await api.tx.utility.batchAll(Txs);
    Tx = batchCall;
  } else {
    // Else, we just push one
    let call = api.createType('Call', hexToU8a(args['generic-call'])) as any;
    Tx = call;
  }

  console.log('Encoded Call Data for Tx is %s', Tx.method.toHex());

  if (args['chopsticks']) {
    console.log('\n--- Chopsticks Testing ---');

    const chopsticksWS = 'ws://127.0.0.1:8000';

    const chopsticksProvider = new WsProvider(chopsticksWS);
    const chopsticksAPI = await ApiPromise.create({
      provider: chopsticksProvider,
      noInitWarn: true,
    });

    let chopsticksTx = await chopsticksAPI.tx(Tx.toHex());

    await signFakeWithApi(chopsticksAPI, chopsticksTx as unknown as any, args['signer']);
    await chopsticksTx.send();

    console.log('--- Chopsticks Test Done ---');
    await chopsticksAPI.disconnect();
  }

  await api.disconnect();
};

main();
