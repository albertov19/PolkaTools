import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

const blockHash = 'block_hash';
const wsendpoint = 'wss://wss.moonriver.moonbeam.network';

// Create Provider
const wsProvider = new WsProvider(wsendpoint);

const main = async () => {
  // Initialize WASM
  await cryptoWaitReady();

  // Wait for Provider
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;

  // Sign and Send Attestation
  console.log(await api.rpc.chain.getBlock(blockHash));
};

main();
