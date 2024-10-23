import { ApiPromise, WsProvider } from '@polkadot/api';

/* Example on how to use it

ts-node ./addContractMetadata.ts --c "0x452bE05439d83D3A6A510F11a4Ba1F1909d1cA6d,0x149f3dDeB5FF9bE7342D07C35D6dA19Df3F790af,0x3DD36E64784FDAEe7BD202c78322a0d8EB1BB32b"

Network is optional, --n moonriver | --n moonbase default: moonbeam
*/

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv)).options({
  network: { type: 'string', demandOption: true, alias: 'n', default: 'moonbeam' },
  contracts: { type: 'string', demandOption: true, alias: 'c' },
}).argv;

// Split Input into Array
const contracts = argv['contracts'].split(',').map((addr) => addr.trim());

// Create Provider
let wsProvider;
if (argv['network'] === 'moonbeam') {
  wsProvider = new WsProvider('wss://wss.api.moonbeam.network');
} else if (argv['network'] === 'moonriver') {
  wsProvider = new WsProvider('wss://wss.api.moonriver.moonbeam.network');
} else if (argv['network'] === 'moonbase') {
  wsProvider = new WsProvider('wss://wss.api.moonbase.moonbeam.network');
} else {
  console.error('Network not supported');
  process.exit();
}

const main = async () => {
  // Load Provider
  const api = await ApiPromise.create({
    provider: wsProvider,
    noInitWarn: true,
  });

  await api.isReady;

  // Contract Metadata Tx
  let batchInner = [];
  let metaTx;
  for (let i = 0; i < contracts.length; i++) {
    metaTx = await api.tx.moonbeamLazyMigrations.createContractMetadata(contracts[i]);
    batchInner.push(metaTx);
  }

  // Batch It
  let batchTx = await api.tx.utility.forceBatch(batchInner);

  console.log(`Call add contract metadata`);
  console.log(batchTx.method.toHex());
  await api.disconnect();
};

main()
  .catch(console.error)
  .finally(() => process.exit());
