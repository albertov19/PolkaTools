import { ApiPromise, WsProvider } from '@polkadot/api';

import { xxhashAsU8a, blake2AsU8a } from '@polkadot/util-crypto';
import { u8aToHex, hexToU8a } from '@polkadot/util';
const network = 'moonriver';

const endpoints = {
  moonbeam: 'wss://wss.api.moonbeam.network',
  moonriver: 'wss://wss.moonriver.moonbeam.network',
  moonbase: 'wss://wss.api.moonbase.moonbeam.network',
};

const addresses = {
  moonriver: [
    '0x0000000000000000000000000000000000000802',
    '0x0000000000000000000000000000000000000807',
    '0x0000000000000000000000000000000000000809',
    '0x000000000000000000000000000000000000080c',
  ],
  moonbeam: [
    '0x0000000000000000000000000000000000000807',
    '0x0000000000000000000000000000000000000809',
    '0x000000000000000000000000000000000000080c',
  ],
};

const dummy = '0x1460006000fd';

//Create Provider
const wsProvider = new WsProvider(endpoints[network]);

const getStorageKey = async (address) => {
  let palletEncoder = new TextEncoder().encode('EVM');
  let palletHash = xxhashAsU8a(palletEncoder, 128);
  let storageEncoder = new TextEncoder().encode('AccountCodes');
  let storageHash = xxhashAsU8a(storageEncoder, 128);
  let assetAddress = new Uint8Array(hexToU8a(address));
  let addressHash = blake2AsU8a(assetAddress, 128);
  let concatKey = new Uint8Array([...palletHash, ...storageHash, ...addressHash, ...assetAddress]);

  return u8aToHex(concatKey);
};

const calculateTx = async () => {
  // Wait for Provider
  const api = await ApiPromise.create({
    provider: wsProvider,
  });
  await api.isReady;

  const txComponent = [];
  for (let address of addresses[network]) {
    txComponent.push([await getStorageKey(address), dummy]);
  }
  const tx = api.tx.system.setStorage(txComponent);

  console.log(tx.method.toHex());

  api.disconnect();
};

calculateTx();
