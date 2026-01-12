/*
    1. We need to transfer GLMR funds from the Treasury to GLMR Sovereign Account in Hydration
    2. We need to construct the DCA call in Hydration to get the bytes of the calldata
    3. We need to send an XCM messate with Transact providing the calls calculated in step 2, to remotely execute the DCA call
*/

import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';

// Input Data
const transferAmount = BigInt('6900000000000000000000000');
const transferFee = BigInt('1000000000000000000');
const wsHydraProvider = 'wss://rpc.hydradx.cloud';
const wsMoonbeamProvider = 'wss://wss.api.moonbeam.network';
// XCM Transactor Config
const feeAmount = BigInt('100000000000000');
const refTime = BigInt('8000000000'); // For XCM Transact
const proofSize = BigInt('300000'); // For XCM Transact
// DCA Config
const dcaPeriod = 144000; // N of blocks between trades (6 seconds)
const dcaTotalAmount = BigInt('0'); // With 0, we make a rolling DCA that will end when funds expire
//const dcaTotalAmount = BigInt('7290000000000000000000000'); // Total amount to trade in the entire DCA
const dcaMaxRetries = BigInt(9); // Amount of times that the schedule will be retried before it cancels
const dcaSlippage = BigInt('15000'); // Slippage tolerance for the DCA in permill
let dcaOrderType = 'Sell' as 'Buy' | 'Sell'; // Buy an assetOut or Sell an assetIn
const dcaAssetIn = 16; // GLMR asset ID
const dcaAssetOut = [22]; // USDT/USDC asset ID (USDT = 10, USDC = 22)
const dcaAmount = BigInt('38300000000000000000000'); // Amount of each trade (depends in/out on Buy/Sell)
const dcaMinTokenPrice = BigInt('1'); // Cents of a dollar - min price of the token to trade in

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
    V5: {
      parents: 1,
      interior: { X1: [{ Parachain: targetParaId }] },
    },
  };
  const beneficiary = {
    V5: {
      parents: 0,
      interior: { X1: [{ AccountId32: { network: null, id: sovereignAccount } }] },
    },
  };
  const assets = {
    V5: [
      {
        id: {
          parents: 0,
          interior: { X1: [{ PalletInstance: 10 }] },
        },
        fun: {
          Fungible: { amount: transferAmount + transferFee },
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

  console.log(`Moonbeam Treasury Transfer\n${dispatchAsTx.method.toHex()}\n`);

  return dispatchAsTx;
};

// Hydration DCA Call
const createDCACall = async (api, sovereigAccount) => {
  let dcaTxs = [] as any;

  const getDecimalRatio = (assetInDec: bigint, assetOutDec: bigint) => {
    const decimalsDiff = assetInDec - assetOutDec;
    const decimalsMagnitude = decimalsDiff >= 0n ? decimalsDiff : -decimalsDiff;
    const decimalScale = 10n ** decimalsMagnitude;

    return decimalsDiff >= 0n
      ? { numerator: decimalScale, denominator: 1n }
      : { numerator: 1n, denominator: decimalScale };
  };

  const mulDivBigInt = (numerators: bigint[], denominators: bigint[]) => {
    const numeratorProduct = numerators.reduce((acc, factor) => acc * factor, 1n);
    const denominatorProduct = denominators.reduce((acc, factor) => acc * factor, 1n);
    return numeratorProduct / denominatorProduct;
  };

  const priceScale = 100n;

  for (let i = 0; i < dcaAssetOut.length; i++) {
    let call;

    // Get Asset In/Out Decimals
    const assetInDecimals = BigInt(
      (await api.query.assetRegistry.assets(dcaAssetIn)).toJSON().decimals
    );
    const assetOutDecimals = BigInt(
      (await api.query.assetRegistry.assets(dcaAssetOut[i])).toJSON().decimals
    );

    const decimalAdjustment = getDecimalRatio(assetInDecimals, assetOutDecimals);

    if (dcaOrderType as string === 'Buy') {
      // Get the max amount of the token to trade in
      const dcaMaxAmountIn = mulDivBigInt(
        [dcaAmount, priceScale, decimalAdjustment.numerator],
        [dcaMinTokenPrice, decimalAdjustment.denominator]
      ); // Price is in cents

      call = await api.tx.dca.schedule(
        {
          owner: sovereigAccount,
          period: dcaPeriod,
          totalAmount: dcaTotalAmount / BigInt(dcaAssetOut.length),
          maxRetries: dcaMaxRetries,
          stabilityThreshold: null,
          slippage: dcaSlippage,
          order: {
            Buy: {
              assetIn: dcaAssetIn,
              assetOut: dcaAssetOut[i],
              amountOut: dcaAmount,
              maxAmountIn: dcaMaxAmountIn,
              route: null,
            },
          },
        },
        null
      );
    } else if (dcaOrderType === 'Sell') {
      // Get the max amount of the token to trade out
      const dcaMinAmountOut = mulDivBigInt(
        [dcaAmount, dcaMinTokenPrice, decimalAdjustment.denominator],
        [priceScale, decimalAdjustment.numerator]
      ); // Price is in cents

      call = await api.tx.dca.schedule(
        {
          owner: sovereigAccount,
          period: dcaPeriod,
          totalAmount: dcaTotalAmount / BigInt(dcaAssetOut.length),
          maxRetries: dcaMaxRetries,
          stabilityThreshold: null,
          slippage: dcaSlippage,
          order: {
            Sell: {
              assetIn: dcaAssetIn,
              assetOut: dcaAssetOut[i],
              amountIn: dcaAmount,
              minAmountOut: dcaMinAmountOut,
              route: null,
            },
          },
        },
        null
      );
    }
    dcaTxs.push(call.method.toHex());

    console.log(`Hydration DCA Call #${i + 1}\n${call.method.toHex()}\n`);
  }

  return dcaTxs;
};

// XCM Transactor Moonbeam Call
const createXCMTransactor = async (api, targetParaId, dcaCalls) => {
  const dest = {
    V5: {
      parents: 1,
      interior: { X1: [{ Parachain: targetParaId }] },
    },
  };

  let xcmTransactorCalls = [] as any;

  for (let i = 0; i < dcaCalls.length; i++) {
    const call = await api.tx.xcmTransactor.transactThroughSovereign(
      dest,
      null,
      {
        currency: {
          AsMultiLocation: {
            V5: {
              parents: 1,
              interior: { X2: [{ Parachain: targetParaId }, { GeneralIndex: 0 }] },
            },
          },
        },
        feeAmount: feeAmount / BigInt(dcaCalls.length),
      },
      dcaCalls[i],
      'SovereignAccount',
      {
        transactRequiredWeightAtMost: { refTime: refTime, proofSize: proofSize },
        overallWeight: 'Unlimited',
      },
      true
    );
    xcmTransactorCalls.push(call.method.toHex());

    console.log(`XCM Transactor Moonbeam DCA Call #${i + 1}\n${call.method.toHex()}\n`);
  }

  return xcmTransactorCalls;
};

// Wrap Calls with Scheduler
const wrapCalls = async (api, xcmTransactorCalls) => {
  let wrapCalls = [] as any;

  // Chains are in different block times
  // We ensure that the calls are executed at least 3 blocks apart
  for (let i = 0; i < xcmTransactorCalls.length; i++) {
    const call = await api.tx.scheduler.scheduleAfter(
      1 + (4 ** i - 1),
      null,
      0,
      xcmTransactorCalls[i]
    );

    wrapCalls.push(call.method.toHex());

    console.log(`Moonbeam Scheduler Call #${i + 1}\n${call.method.toHex()}\n`);
  }

  return wrapCalls;
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
  const dcaCalls = await createDCACall(apiHydra, sovereigAccount);

  // Create XCM Transactor With Hydration Call Bytes
  const xcmTransactorBytes = await createXCMTransactor(apiMoonbeam, hydrationParaId, dcaCalls);

  // Wrap XCM Transactor Calls with Scheduler
  let wrappedXcmBytes;
  if (xcmTransactorBytes.length > 1) {
    wrappedXcmBytes = await wrapCalls(apiMoonbeam, xcmTransactorBytes);
  } else {
    // If only one call, we don't need to wrap it
    wrappedXcmBytes = xcmTransactorBytes;
  }

  // Batch Both Treasury and XCM Transactor Calls
  const batchTxs = [trasferBytes, ...wrappedXcmBytes];
  const batchCall = await apiMoonbeam.tx.utility.batch(batchTxs);

  console.log(`Moonbeam Batch Call\n${batchCall.method.toHex()}\n`);
};

main()
  .catch(console.error)
  .finally(() => process.exit());
