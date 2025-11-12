/*
    1. We need to withdraw the Moonbeam Treasury Sovereign Account's GLMR LP with position_id "3,376" in Hydration's Omnipool
    2. We need to transfer GLMR funds from the Moonbeam Treasury Sovereign Account in Hydration to the Treasury Account on Moonbeam
*/

import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';

// Input Data
const positionID = BigInt('3376');
const glmrID = BigInt('16');
const glmrTransferAmount = BigInt('430000000000000000000000');
const wsHydraProvider = 'wss://rpc.hydradx.cloud';
const wsMoonbeamProvider = 'wss://wss.api.moonbeam.network';
// XCM Transactor Config
const feeAmount = BigInt('10000000000000');
const refTime = BigInt('8000000000'); // For XCM Transact
const proofSize = BigInt('300000'); // For XCM Transact

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
const transferParameters = async (api, targetParaId) => {
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
      interior: { X1: [{ AccountKey20: { network: null, key: treasuryAccount } }] },
    },
  };
  const assets = {
    V4: [
      {
        id: {
          parents: 1,
          interior: { X2: [{ Parachain: 2004 } , { PalletInstance: 10 }] },
        },
        fun: {
          Fungible: { amount: glmrTransferAmount },
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



  console.log(`XCM Transfer\n${calldata.method.toHex()}\n`);

  return calldata;
};

// Hydration Remove Liquidity Call
const createHydrationCalls = async (api,sovereigAccount, targetParaId) => {

  // Get GLMR Balance before removing liquidity
  //const balanceBefore = (await api.query.tokens.accounts(sovereigAccount,glmrID)).toHuman().free.replaceAll(',', '');
  //console.log(`GLMR Balance Before Remove Liquidity: ${balanceBefore}\n`);

  // FQuery the position to get the LP token amount
  const position = BigInt((await api.query.omnipool.positions(positionID)).toHuman().shares.replaceAll(',', ''));

  // Prepare the remove liquidity call
  const removeLiquidityCall = await api.tx.omnipool.removeLiquidity(
    positionID,
    position,
  );

  console.log(`Hydration Remove Liquidity Call\n${removeLiquidityCall.method.toHex()}\n`);

   // Transfer GLMR to Moonbeam
  const transferCall = await transferParameters(api, targetParaId);

  console.log(`Hydration Transfer Call\n${transferCall.method.toHex()}\n`);

  // Batch the remove liquidity and transfer calls
  const batchTx = await api.tx.utility.batchAll([removeLiquidityCall, transferCall]);

  console.log(`Hydration Batch Call\n${batchTx.method.toHex()}\n`);

  return batchTx.method.toHex();
};

// XCM Transactor Moonbeam Call
const createXCMTransactor = async (api, targetParaId, hydraCall) => {
  const dest = {
    V4: {
      parents: 1,
      interior: { X1: [{ Parachain: targetParaId }] },
    },
  };

    const xcmTransactorCall = await api.tx.xcmTransactor.transactThroughSovereign(
      dest,
      null,
      {
        currency: {
          AsMultiLocation: {
            V4: {
              parents: 1,
              interior: { X2: [{ Parachain: targetParaId }, { GeneralIndex: 0 }] },
            },
          },
        },
        feeAmount: feeAmount,
      },
      hydraCall,
      'SovereignAccount',
      {
        transactRequiredWeightAtMost: { refTime: refTime, proofSize: proofSize },
        overallWeight: 'Unlimited',
      },
      true
    );
    console.log(`XCM Transactor Moonbeam Call ${xcmTransactorCall.method.toHex()}\n`);

  return xcmTransactorCall;
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

  // Calculate Remove Liquidity and Transfer Back Calls in Hydration
  const trasferBytes = await  createHydrationCalls(apiHydra, sovereigAccount, moonbeamParaId);

  // Create XCM Transactor With Hydration Call Bytes
  const xcmTransactorBytes = await createXCMTransactor(apiMoonbeam, hydrationParaId, trasferBytes);

};

main()
  .catch(console.error)
  .finally(() => process.exit());
