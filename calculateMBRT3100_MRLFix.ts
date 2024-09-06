import { ApiPromise, WsProvider } from '@polkadot/api';
import { decodeAddress } from '@polkadot/util-crypto';
import MBFixData from './misc/Hydration_asset_transfer_fail.json';

// Create Provider
const wsProvider = 'wss://wss.api.moonbeam.network';
const hydraDX = '0x7369626cf2070000000000000000000000000000';

const main = async () => {
  // Load Provider
  const api = await ApiPromise.create({
    provider: new WsProvider(wsProvider),
    noInitWarn: true,
  });
  await api.isReady;

  const tx = await getMBFixData(api);

  // Wrap around dispatch as
  const dispatchTx = await api.tx.utility.dispatchAs({ system: { Signed: hydraDX } }, tx);

  console.log(`XCM to Fix Everything Batched: ${dispatchTx.method.toHex()}`);

  // Wrap around whitelist dispatch

  const whitelistTx = await api.tx.whitelist.dispatchWhitelistedCallWithPreimage(dispatchTx);

  console.log(`\nWhitelist Call: ${whitelistTx.method.toHex()}`);

  await api.disconnect();
};

const getMBFixData = async (api) => {
  let batch = [];

  for (let i = 0; i < MBFixData.length; i++) {
    batch.push(
      await api.tx.xTokens.transferMultiasset(
        {
          V4: {
            id: {
              parents: 0,
              interior: {
                X2: [
                  {
                    PalletInstance: 110,
                  },
                  {
                    AccountKey20: {
                      network: null,
                      key: MBFixData[i].asset,
                    },
                  },
                ],
              },
            },
            fun: { Fungible: BigInt(MBFixData[i].amount) },
          },
        },
        {
          V4: {
            parents: 1,
            interior: {
              X2: [
                {
                  Parachain: 2034,
                },
                {
                  AccountId32: {
                    network: null,
                    id: decodeAddress(MBFixData[i].sender),
                  },
                },
              ],
            },
          },
        },
        'Unlimited'
      )
    );
  }

  // Batch Subcalls
  const dispatchTx = await api.tx.utility.batchAll(batch);

  return dispatchTx;
};

main()
  .catch(console.error)
  .finally(() => process.exit());
