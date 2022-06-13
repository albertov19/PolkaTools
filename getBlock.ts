import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import yargs from 'yargs';

// Get input arguments
const args = yargs.options({
  'block-hash': { type: 'string', demandOption: true, alias: 'b' },
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

const main = async () => {
  // Initialize WASM
  await cryptoWaitReady();

  // Wait for Provider
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;

  // Sign and Send Attestation
  console.log(await (await api.rpc.chain.getBlock(args['block-hash'])).toHuman());

  await api.disconnect();
};

main();
