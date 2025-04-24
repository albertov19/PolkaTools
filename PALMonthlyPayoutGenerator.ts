import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady, blake2AsHex } from '@polkadot/util-crypto';
import { signFakeWithApi } from '@acala-network/chopsticks-utils';

import yargs from 'yargs';

// Get input arguments
const args = yargs.options({
  price: { type: 'number', demandOption: true, alias: 'p' },
  date: { type: 'string', demandOption: false, alias: 'd' },
  chopsticks: { type: 'bolean', demandOption: false, nargs: 0, alias: 'c' }, // Run Chopsticks Test at ws://localhost:8000
}).argv;

// PAL Config
const curators = ['Taylor', 'Alberto', 'Bryan', 'cl0w', 'Pierre', 'Vince'];
const palCurator = '167dwA1UDmWSBRrFd9dXqXjdk1NRhqVjenT2FbHGDyy44GjS';

// General Config
const parentBounty = 22;
const valueUSD = 3000;
const value = Math.round((valueUSD / args['price']) * 10) / 10;

// Create Provider
let wsProvider = new WsProvider('wss://polkadot-rpc.dwellir.com');

const main = async () => {
  // Initialize WASM
  await cryptoWaitReady();

  // Wait for Provider
  const api = await ApiPromise.create({ provider: wsProvider, noInitWarn: true });
  await api.isReady;

  // Batch Tx
  let batchArgs = [] as any;

  // Create Batch
  for (let curator of curators) {
    console.log(curator.concat('-', args['date']));

    let tx = await api.tx.childBounties.addChildBounty(
      parentBounty,
      BigInt(Math.round(value * 100)) * BigInt(10 ** 8),
      curator.concat('-', args['date'])
    );

    batchArgs.push(tx);
  }

  // Batch Calls
  let batchTx = await api.tx.utility.batch(batchArgs);

  console.log(`\nBatch Tx for Chopsticks Test ${batchTx.toHex()}\n`);

  console.log(`Batch Tx for Multix Submission ${batchTx.method.toHex()}\n`);

  // Proxy call
  let proxyTx = await api.tx.proxy.proxy(palCurator, null, batchTx);

  console.log(`Proxy Tx ${proxyTx.method.toHex()}`);
  console.log(`Proxy Tx hash ${blake2AsHex(proxyTx.method.toHex())}\n`);

  if (args['chopsticks']) {
    console.log('\n--- Chopsticks Testing ---');

    const chopsticksWS = 'ws://127.0.0.1:8000';

    const chopsticksProvider = new WsProvider(chopsticksWS);
    const chopsticksAPI = await ApiPromise.create({
      provider: chopsticksProvider,
      noInitWarn: true,
    });

    let chopsticksTx = await chopsticksAPI.tx(batchTx.toHex());

    await signFakeWithApi(chopsticksAPI, chopsticksTx, palCurator);
    await chopsticksTx.send();

    console.log('--- Chopsticks Test Done ---');
    await chopsticksAPI.disconnect();
  }

  await api.disconnect();
};

main();
