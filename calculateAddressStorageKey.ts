import { ApiPromise, WsProvider } from '@polkadot/api';
import { xxhashAsU8a, blake2AsU8a } from '@polkadot/util-crypto';
import { u8aToHex, hexToU8a } from '@polkadot/util';
import yargs from 'yargs';

const args = yargs.options({
  address: { type: 'string', demandOption: false, alias: 'a' },
  'ws-provider': { type: 'string', demandOption: false, alias: 'w' },
}).argv;

/*
Moonbeam wss://wss.api.moonbeam.network
Moonriver wss://wss.moonriver.moonbeam.network
Moonbase wss://wss.api.moonbase.moonbeam.network
*/

// Create Provider
const wsProvider = new WsProvider(args['ws-provider']);

const main = async () => {
  // Wait for Provider
  const api = await ApiPromise.create({
    provider: wsProvider,
  });
  await api.isReady;

  let palletEncoder = new TextEncoder().encode('EVM');
  let palletHash = xxhashAsU8a(palletEncoder, 128);
  let storageEncoder = new TextEncoder().encode('AccountCodes');
  let storageHash = xxhashAsU8a(storageEncoder, 128);
  let assetAddress = new Uint8Array(hexToU8a(args['address']));
  let addressHash = blake2AsU8a(assetAddress, 128);
  let concatKey = new Uint8Array([...palletHash, ...storageHash, ...addressHash, ...assetAddress]);

  console.log(`Storage Key ${u8aToHex(concatKey)}`);

  await api.disconnect();
};

main();
