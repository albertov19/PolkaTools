import { ApiPromise, WsProvider } from '@polkadot/api';
import HydraDXFixData from './misc/HydraDXAsset.json';

// Create Provider
const wsProvider = 'wss://hydradx-rpc.dwellir.com';
const glmrFee = '100000000000000000';
const hydraDX = '0x7369626cf2070000000000000000000000000000';

const main = async () => {
  // Load Provider
  const api = await ApiPromise.create({
    provider: new WsProvider(wsProvider),
    noInitWarn: true,
  });
  await api.isReady;

  const tx = await getHydraDXFixData(api);

  console.log(`XCM to Fix Everything Batched: ${tx.method.toHex()}`);

  await api.disconnect();
};

const getHydraDXFixData = async (api) => {
  let batch = [];

  for (let i = 0; i < HydraDXFixData.length; i++) {
    batch.push(
      await api.tx.polkadotXcm.send(
        {
          V3: {
            parents: 1,
            interior: {
              X1: {
                Parachain: 2004,
              },
            },
          },
        },
        {
          V3: xcmMessage(
            HydraDXFixData[i].assetAddress,
            HydraDXFixData[i].amount,
            HydraDXFixData[i].to
          ),
        }
      )
    );
  }

  // Batch Subcalls
  const dispatchTx = await api.tx.utility.batchAll(batch);

  return dispatchTx;
};

const xcmMessage = (assetAddress, assetAmount, targetAddress) => {
  let xcmMessage = [];

  // Withdraw Asset
  xcmMessage.push({
    WithdrawAsset: [
      {
        id: {
          Concrete: {
            parents: 0,
            interior: {
              X1: {
                PalletInstance: 10,
              },
            },
          },
        },
        fun: { Fungible: BigInt(glmrFee) },
      },
      {
        id: {
          Concrete: {
            parents: 0,
            interior: {
              X2: [
                {
                  PalletInstance: 110,
                },
                {
                  AccountKey20: {
                    network: null,
                    key: assetAddress,
                  },
                },
              ],
            },
          },
        },
        fun: { Fungible: BigInt(assetAmount) },
      },
    ],
  });

  // Clear Origin
  xcmMessage.push({ ClearOrigin: [] });

  // Buy Execution
  xcmMessage.push({
    BuyExecution: [
      {
        id: {
          Concrete: {
            parents: 0,
            interior: {
              X1: {
                PalletInstance: 10,
              },
            },
          },
        },
        fun: { Fungible: BigInt(glmrFee) },
      },
      { Unlimited: null },
    ],
  });

  // Deposit Asset
  xcmMessage.push({
    DepositAsset: {
      assets: {
        Definite: [
          {
            id: {
              Concrete: {
                parents: 0,
                interior: {
                  X2: [
                    {
                      PalletInstance: 110,
                    },
                    {
                      AccountKey20: {
                        network: null,
                        key: assetAddress,
                      },
                    },
                  ],
                },
              },
            },
            fun: { Fungible: BigInt(assetAmount) },
          },
        ],
      },
      beneficiary: {
        parents: 0,
        interior: {
          X1: {
            AccountKey20: {
              network: null,
              key: targetAddress,
            },
          },
        },
      },
    },
  });

  // Deposit GLMR to HydraDX Account
  // Deposit Asset
  xcmMessage.push({
    DepositAsset: {
      assets: {
        Wild: {
          AllCounted: 1,
        },
      },
      beneficiary: {
        parents: 0,
        interior: {
          X1: {
            AccountKey20: {
              network: null,
              key: hydraDX,
            },
          },
        },
      },
    },
  });

  return xcmMessage;
};

main()
  .catch(console.error)
  .finally(() => process.exit());
