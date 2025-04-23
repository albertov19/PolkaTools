/*
  Simple script to calculate asset migration
*/

import { ApiPromise, WsProvider } from '@polkadot/api';
import yargs from 'yargs';

// This script will listen to all GLMR transfers (Substrate & Ethereum) and extract the tx hash
// It can be adapted for Moonriver or Moonbase Alpha

const args = yargs.options({
  network: { type: 'string', demandOption: true, alias: 'n', default: 'moonbeam' },
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
  // Load Provider
  const api = await ApiPromise.create({
    provider: wsProvider,
    noInitWarn: true,
  });

  await api.isReady;

  // Get Asset ID
  let assets: bigint[] = [];
  const assetId = await api.query.assets.asset.entries();
  assetId.forEach(([key]) => {
    key.args.map((k) => assets.push(BigInt(k.toString().replaceAll(',', ''))));
  });

  console.log('Assets: ', assets);

  let tx = await api.tx.moonbeamLazyMigrations.approveAssetsToMigrate(assets);

  console.log(`Non-sudo call: ${tx.method.toHex()}`);

  if (args['network'] === 'moonbase') {
    let finalTx = await api.tx.sudo.sudo(tx);
    console.log('Final Tx: ', finalTx.method.toHex());
  }

  await api.disconnect();
};

main()
  .catch(console.error)
  .finally(() => process.exit());
