import { ApiPromise, WsProvider } from '@polkadot/api';

import KusamaData from './misc/KusamaAssets.json';
import AssetHubData from './misc/AHAssets.json';
import ParachainKusamaData from './misc/ParachainKusamaAssets.json';

import { decodeAddress } from '@polkadot/util-crypto';
// Create Provider

const wsProvider = 'wss://wss.api.moonriver.moonbeam.network';

const main = async () => {
  // Load Provider
  const api = await ApiPromise.create({
    provider: new WsProvider(wsProvider),
    noInitWarn: true,
  });
  await api.isReady;

  const batch = [];

  batch.push(
    await getAHCallData(api),
    await getKusamaCallData(api),
    await getKusamaParachainCallData(api)
  );

  const batchTx = await api.tx.utility.batch(batch);

  console.log(`XCM to Fix Everything Batched: ${batchTx.method.toHex()}`);

  await api.disconnect();
};

// AssetHub CallData
const getAHCallData = async (api) => {
  // AssetHub Calldata
  const AHTotalAmount = AssetHubData.reduce(
    (acc, transfer) => acc + (BigInt(transfer.amount) || BigInt(0)),
    BigInt(0)
  );

  // Buy Execution in RMRK tokens
  const rmrkFee = BigInt(10000000000);

  // RMRK Multilocation
  const rmrkML = {
    parents: 0,
    interior: {
      X2: [
        {
          PalletInstance: 50,
        },
        { GeneralIndex: 8 },
      ],
    },
  };
  const xcmMessage = [];

  // Withdraw Asset
  xcmMessage.push({
    WithdrawAsset: [
      {
        id: {
          Concrete: rmrkML,
        },
        fun: { Fungible: AHTotalAmount + rmrkFee },
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
          Concrete: rmrkML,
        },
        fun: { Fungible: rmrkFee },
      },
      { Unlimited: null },
    ],
  });

  // Deposit data - goes through users
  AssetHubData.map((transfer) => {
    xcmMessage.push({
      DepositAsset: {
        assets: {
          Definite: [
            {
              id: {
                Concrete: rmrkML,
              },
              fun: { Fungible: BigInt(transfer.amount) },
            },
          ],
        },
        beneficiary: {
          parents: 0,
          interior: {
            X1: {
              AccountId32: {
                network: null,
                id: decodeAddress(transfer.from),
              },
            },
          },
        },
      },
    });
  });

  // Deposit rest to Moonriver sovereign account in AHK
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
            AccountId32: {
              network: null,
              id: decodeAddress('FBeL7EFFn7yHFs4uSf432RThNjEuieS8pQWcMdRFpXZPqkW'),
            },
          },
        },
      },
    },
  });

  // Transaction
  const tx = await api.tx.polkadotXcm.send(
    {
      V3: {
        parents: 1,
        interior: {
          X1: {
            Parachain: 1000,
          },
        },
      },
    },
    { V3: xcmMessage }
  );

  console.log(`XCM to Fix AssetHub-Kusama is: ${tx.method.toHex()}\n`);

  return tx;
};

// Kusama CallData
const getKusamaCallData = async (api) => {
  // AssetHub Calldata

  // Get total KSM to be returned
  const ksmTotalAmount = KusamaData.reduce(
    (acc, transfer) => acc + (BigInt(transfer.amount) || BigInt(0)),
    BigInt(0)
  );

  //  KSM fee for BuyExecution
  const ksmFee = BigInt(100000000000);

  // KSM Multilocation
  const ksmML = {
    parents: 0,
    interior: { here: null },
  };
  const xcmMessage = [];

  // Withdraw Asset
  xcmMessage.push({
    WithdrawAsset: [
      {
        id: {
          Concrete: ksmML,
        },
        fun: { Fungible: ksmTotalAmount + ksmFee },
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
          Concrete: ksmML,
        },
        fun: { Fungible: ksmFee },
      },
      { Unlimited: null },
    ],
  });

  // Deposit to users, goes through the data
  KusamaData.map((transfer) => {
    xcmMessage.push({
      DepositAsset: {
        assets: {
          Definite: [
            {
              id: {
                Concrete: ksmML,
              },
              fun: { Fungible: BigInt(transfer.amount) },
            },
          ],
        },
        beneficiary: {
          parents: 0,
          interior: {
            X1: {
              AccountId32: {
                network: null,
                id: decodeAddress(transfer.from),
              },
            },
          },
        },
      },
    });
  });

  // Deposit rest to Moonriver Sovereign account in Kusama
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
            AccountId32: {
              network: null,
              id: decodeAddress('F7fq1jSB3w59f8vMShxvP5eSu3wCJbL5Am5MQ6vP6VzYLWD'),
            },
          },
        },
      },
    },
  });

  // Transaction
  const tx = await api.tx.polkadotXcm.send(
    {
      V3: {
        parents: 1,
        interior: { here: null },
      },
    },
    { V3: xcmMessage }
  );

  console.log(`XCM to Fix Kusama is: ${tx.method.toHex()}\n`);

  return tx;
};

// Kusama Parachains CallData
const getKusamaParachainCallData = async (api) => {
  // Calculate total amount for each paraID
  const ksmPerParachain = Object.keys(ParachainKusamaData).reduce((totals, paraID) => {
    const totalAmount = ParachainKusamaData[paraID].reduce(
      (acc, transfer) => acc + BigInt(transfer.amount),
      BigInt(0)
    );
    totals[paraID] = totalAmount;
    return totals;
  }, {} as Record<string, bigint>);

  // Calculate total
  const ksmTotalAmount = Object.values(ksmPerParachain).reduce(
    (acc, totalAmount) => acc + totalAmount,
    BigInt(0)
  );

  // KSM fee for BuyExecution (baseline)
  const ksmFee = BigInt(10000000000);
  // BuyExecution in parachains with less ksm
  const paraFeeFactor = 100;

  // KSM Multilocation
  const ksmML = {
    parents: 0,
    interior: { here: null },
  };
  // KSM Multilocation from parachain
  const ksmMLParachain = {
    parents: 1,
    interior: { here: null },
  };

  const xcmMessage = [];

  // Withdraw Asset
  xcmMessage.push({
    WithdrawAsset: [
      {
        id: {
          Concrete: ksmML,
        },
        fun: {
          Fungible:
            // We take also the fee to use in the destination parachains
            (ksmTotalAmount as bigint) + BigInt(1 + Object.keys(ksmPerParachain).length) * ksmFee,
        },
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
          Concrete: ksmML,
        },
        fun: { Fungible: ksmFee },
      },
      { Unlimited: null },
    ],
  });

  // Deposit Reserve Asset - go through each paraID
  for (let paraID of Object.keys(ParachainKusamaData)) {
    xcmMessage.push({
      DepositReserveAsset: {
        assets: {
          Definite: [
            {
              id: {
                Concrete: ksmML,
              },
              fun: { Fungible: ksmPerParachain[paraID] + ksmFee / BigInt(paraFeeFactor) },
            },
          ],
        },
        dest: {
          parents: 0,
          interior: {
            X1: {
              Parachain: paraID,
            },
          },
        },
        // We need to build an inner XCM depending on the ParaID
        xcm: buildInnerXCM(paraID, ksmFee / BigInt(paraFeeFactor), ksmMLParachain),
      },
    });
  }

  // Deposit remaining funds in Kusama to Moonriver Sovereign account
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
            AccountId32: {
              network: null,
              id: decodeAddress('F7fq1jSB3w59f8vMShxvP5eSu3wCJbL5Am5MQ6vP6VzYLWD'),
            },
          },
        },
      },
    },
  });

  // Transaction
  const tx = await api.tx.polkadotXcm.send(
    {
      V3: {
        parents: 1,
        interior: { here: null },
      },
    },
    { V3: xcmMessage }
  );

  console.log(`XCM to Fix Kusama_Parachains is: ${tx.method.toHex()}\n`);

  return tx;
};

const buildInnerXCM = (paraID, paraFee, ksmMLParachain) => {
  // Inner XCM from DepositReserveAsset
  const innerXCM = [];

  innerXCM.push({
    BuyExecution: [
      {
        id: {
          Concrete: ksmMLParachain,
        },
        fun: { Fungible: paraFee },
      },
      { Unlimited: null },
    ],
  });

  ParachainKusamaData[paraID].map((transfer) => {
    innerXCM.push({
      DepositAsset: {
        assets: {
          Definite: [
            {
              id: {
                Concrete: ksmMLParachain,
              },
              fun: { Fungible: BigInt(transfer.amount) },
            },
          ],
        },
        beneficiary: {
          parents: 0,
          interior: {
            X1: {
              AccountId32: {
                network: null,
                id: decodeAddress(transfer.from),
              },
            },
          },
        },
      },
    });
  });

  return innerXCM;
};

main()
  .catch(console.error)
  .finally(() => process.exit());
