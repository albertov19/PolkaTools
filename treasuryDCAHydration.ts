/*
    1. We need to transfer GLMR funds from the Treasury to GLMR Sovereign Account in Hydration
    2. We need to construct the DCA call in Hydration to get the bytes of the calldata
    3. We need to send an XCM messate with Transact providing the calls calculated in step 2, to remotely execute the DCA call
*/

import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';

// Input Data
const transferAmount = '100000000000000000000000';
const wsHydraProvider = 'wss://hydradx-rpc.dwellir.com';
const wsMoonbeamProvider = 'wss://wss.api.moonbeam.network';
// XCM Transactor Config
const feeAmount = '2000000000000000000';
const refTime = '3000000000';
const proofSize = '100000';
// DCA Config
const dcaPeriod = 1; // N of blocks between trades (12 or 6 seconds)
const dcaTotalAmount = transferAmount; // Total amount to trade in the entire DCA
const dcaMaxRetries = 9; // Amount of times that the schedule will be retried before it cancels
const dcaSlippage = 15000; // Slippage tolerance for the DCA in permill
const dcaOrderType = 'Buy'; // Buy an assetOut or Sell an assetIn
const dcaAssetIn = 16; // GLMR asset ID
const dcaAssetOut = [10, 22]; // USDT/USDC asset ID (USDT = 10, USDC = 22)
const dcaAmount = '250000000'; // Amount of each trade (depends in/out on Buy/Sell)
const dcaMaxAmount = '5000000000000000000000'; // Max amount of each trade (depends in/out on Buy/Sell)
const dcaPool = 'Omnipool'; // Route to use for the DCA (Omnipool, Stableswap, XYK)

// Treasury Account Moonbeam
const treasuryAccount = u8aToHex(
  new Uint8Array([...new TextEncoder().encode('modlpy/trsry')])
).padEnd(42, '0');

console.log(`Treasury Account [20 bytes]\n${treasuryAccount}\n`);

// Obtain Para ID from an API
const getParaId = async (api) => {
  return await api.query.parachainInfo.parachainId();
};

// Treasury Transfer Call
const transferTreasuryFunds = async (api, sovereignAccount, targetParaId) => {
  // Transfer Asset Parameters
  const dest = {
    V4: {
      parents: 1,
      interior: { X1: [{ Parachain: targetParaId }] },
    },
  };
  const beneficiary = {
    V4: {
      parents: 0,
      interior: { X1: [{ AccountId32: { network: null, id: sovereignAccount } }] },
    },
  };
  const assets = {
    V4: [
      {
        id: {
          V4: {
            parents: 0,
            interior: { X1: [{ PalletInstance: 10 }] },
          },
        },
        fun: {
          Fungible: { amount: transferAmount },
        },
      },
    ],
  };

  // Transfer Asset Calldata
  const calldata = await api.tx.polkadotXcm.transferAssets(
    dest,
    beneficiary,
    assets,
    0,
    'Unlimited'
  );

  const dispatchAsTx = await api.tx.utility.dispatchAs(
    { system: { Signed: treasuryAccount } },
    calldata
  );

  console.log(`Moonbeam Treasury Transfer\n${dispatchAsTx.toHex()}\n`);

  return dispatchAsTx;
};

// Hydration DCA Call
const createDCACall = async (api, sovereigAccount) => {
  let batchTxs = [];

  for (let i = 0; i < dcaAssetOut.length; i++) {
    if (dcaOrderType === 'Buy') {
      batchTxs.push(
        await api.tx.dca.schedule(
          {
            owner: sovereigAccount,
            period: dcaPeriod,
            totalAmount: dcaTotalAmount,
            maxRetries: dcaMaxRetries,
            stabilityThreshold: null,
            slippage: dcaSlippage,
            order: {
              Buy: {
                assetIn: dcaAssetIn,
                assetOut: dcaAssetOut[i],
                amountOut: dcaAmount,
                maxAmountIn: dcaMaxAmount,
                route: [{ pool: dcaPool, assetIn: dcaAssetIn, assetOut: dcaAssetOut[i] }],
              },
            },
          },
          null
        )
      );
    } else if (dcaOrderType === 'Sell') {
      batchTxs.push(
        await api.tx.dca.schedule(
          {
            owner: sovereigAccount,
            period: dcaPeriod,
            totalAmount: dcaTotalAmount,
            maxRetries: dcaMaxRetries,
            stabilityThreshold: null,
            slippage: dcaSlippage,
            order: {
              Sell: {
                assetIn: dcaAssetIn,
                assetOut: dcaAssetOut[i],
                amountIn: dcaAmount,
                maxAmountOut: dcaMaxAmount,
                route: [{ pool: dcaPool, assetIn: dcaAssetIn, assetOut: dcaAssetOut[i] }],
              },
            },
          },
          null
        )
      );
    }
  }

  // Batch all DCA schedules
  const batchCall = await api.tx.utility.batch(batchTxs);

  console.log(`Hydration DCA Call\n${batchCall.method.toHex()}\n`);

  return batchCall.method.toHex();
};

// XCM Transactor Moonbeam Call
const createXCMTransactor = async (api, targetParaId, dcaCall) => {
  const dest = {
    V4: {
      parents: 1,
      interior: { X1: [{ Parachain: targetParaId }] },
    },
  };

  let calldata = await api.tx.xcmTransactor.transactThroughSovereign(
    dest,
    null,
    {
      currency: {
        AsCurrencyId: 'SelfReserve',
      },
      feeAmount: feeAmount,
    },
    dcaCall,
    'SovereignAccount',
    {
      transactRequiredWeightAtMost: { refTime: refTime, proofSize: proofSize },
      overallWeight: 'Unlimited',
    },
    true
  );

  console.log(`XCM Transactor Moonbeam DCA Call\n${calldata.toHex()}\n`);

  return calldata;
};

const calculateSovAddress = async (paraId) => {
  // Calculate Sovereign Address
  const sovAddressPara = u8aToHex(
    new Uint8Array([...new TextEncoder().encode('sibl'), ...paraId.toU8a()])
  ).padEnd(66, '0');

  console.log(`Sovereign Account Sibling [32 bytes]\n${sovAddressPara}\n`);

  return sovAddressPara;
};

const main = async () => {
  // Hydration Provider
  const apiHydra = await ApiPromise.create({
    provider: new WsProvider(wsHydraProvider),
    noInitWarn: true,
  });

  // Moonbeam Provider
  const apiMoonbeam = await ApiPromise.create({
    provider: new WsProvider(wsMoonbeamProvider),
    noInitWarn: true,
  });

  // Fetch ParaIDs
  const moonbeamParaId = await getParaId(apiMoonbeam);
  const hydrationParaId = await getParaId(apiHydra);

  // Calculate ParaID
  const sovereigAccount = await calculateSovAddress(moonbeamParaId);

  // Calculate Transfer Funds from Treasury to Sovereign Account
  const trasferBytes = await transferTreasuryFunds(apiMoonbeam, sovereigAccount, hydrationParaId);

  // Create Hydration Call
  const dcaCall = await createDCACall(apiHydra, sovereigAccount);

  // Create XCM Transactor With Hydration Call Bytes
  const xcmTransactorBytes = await createXCMTransactor(apiMoonbeam, hydrationParaId, dcaCall);

  // Batch Both Treasury and XCM Transactor Calls
  const batchTxs = [trasferBytes, xcmTransactorBytes];
  const batchCall = await apiMoonbeam.tx.utility.batch(batchTxs);

  console.log(`Moonbeam Batch Call\n${batchCall.toHex()}\n`);
};

main()
  .catch(console.error)
  .finally(() => process.exit());
