/*
    1. We need to transfer GLMR funds from the Treasury to GLMR Sovereign Account in Hydration
    2. We need to construct the DCA call in Hydration to get the bytes of the calldata
    3. We need to send an XCM messate with Transact providing the calls calculated in step 2, to remotely execute the DCA call
*/

import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { MultiLocation } from "@polkadot/types/interfaces";


// Input Data
const transferAssetId = 22; // USDC Asset ID
const transferAmount = BigInt('92946000000');
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
const transferUSDCBack = async (api, targetParaId, targetAddress) => {
  // Get Asset ML
  const assetData = await api.query.assetRegistry.assetLocations(transferAssetId);

  const assetML = await api.createType("StagingXcmV4AssetAssetId", assetData.toJSON());

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
      interior: { X1: [{ AccountKey20: { network: null, key: targetAddress } }] },
    },
  };
  const assets = {
    V4: [{ id: assetML, fun: { Fungible: transferAmount } }],
  };

  // Transfer Asset Calldata
  const calldata = await api.tx.polkadotXcm.transferAssets(
    dest,
    beneficiary,
    assets,
    0,
    'Unlimited'
  );

  console.log(`Moonbeam USDC Transfer Back\n${calldata.method.toHex()}\n`);

  return calldata.method.toHex();
};

// XCM Transactor Moonbeam Call
const createXCMTransactor = async (api, targetParaId, calldata) => {
  const dest = {
    V5: {
      parents: 1,
      interior: { X1: [{ Parachain: targetParaId }] },
    },
  };

  let xcmTransactorCalls = [] as any;

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
      feeAmount: feeAmount,
    },
    calldata,
    'SovereignAccount',
    {
      transactRequiredWeightAtMost: { refTime: refTime, proofSize: proofSize },
      overallWeight: 'Unlimited',
    },
    true
  );

  console.log(`XCM Transactor Moonbeam Call\n${call.method.toHex()}\n`);

  return xcmTransactorCalls;
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

  // Transfer USDC back from Hydration to Moonbeam Treasury Account
  const trasferBytes = await transferUSDCBack(apiHydra, moonbeamParaId, treasuryAccount);

  // Create XCM Transactor With Hydration Call Bytes
  await createXCMTransactor(apiMoonbeam, hydrationParaId, trasferBytes);
};

main()
  .catch(console.error)
  .finally(() => process.exit());
