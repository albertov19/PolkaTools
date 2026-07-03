/*
    Governance proposal to transfer the Moonbeam Treasury's remaining funds back from Hydration.

    After the rolling DCA has been terminated (see closeTreasuryDCAHydration.ts), the Moonbeam
    Treasury Sovereign Account on Hydration still holds:
      - GLMR (asset 16)  -> reserve is Moonbeam
      - USDC (asset 22)  -> reserve is AssetHub (routes Hydration -> AssetHub -> Moonbeam)

    GLMR and USDC take different reserve paths, so they cannot share a single transferAssets call.
    We build one polkadotXcm.transferAssets per asset, batch them with utility.batchAll on
    Hydration, and wrap the batch in an XCM transactThroughSovereign so Moonbeam governance (Root)
    executes it as the sovereign account (the owner of those funds).

    The final "Moonbeam Governance Proposal Call" hex is what you propose on Moonbeam OpenGov.

    Providers default to the live mainnet endpoints, so the balances (and therefore the
    calldata) reflect real on-chain state. Override with WS_HYDRA / WS_MOONBEAM env vars to
    point at a local chopsticks fork for testing, e.g.:
      WS_HYDRA=ws://localhost:8000 WS_MOONBEAM=ws://localhost:8001 npx ts-node ...
*/

import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';

// Input Data
const glmrAssetId = 16; // GLMR asset id on Hydration
const usdcAssetId = 22; // USDC asset id on Hydration

// Amount to transfer back. Set to 0n to transfer the FULL free balance of the sovereign account.
const glmrTransferAmount = BigInt('0');
const usdcTransferAmount = BigInt('0');

const wsHydraProvider = process.env.WS_HYDRA || 'wss://rpc.hydradx.cloud';
const wsMoonbeamProvider = process.env.WS_MOONBEAM || 'wss://wss.api.moonbeam.network';

// XCM Transactor Config (batch of two transfers -> a bit heavier than a single transfer)
const feeAmount = BigInt('100000000000000');
const refTime = BigInt('20000000000'); // For XCM Transact
const proofSize = BigInt('600000'); // For XCM Transact

// Treasury Account Moonbeam (20 bytes, "modlpy/trsry" padded)
const treasuryAccount = u8aToHex(
  new Uint8Array([...new TextEncoder().encode('modlpy/trsry')])
).padEnd(42, '0');

console.log(`Treasury Account [20 bytes]\n${treasuryAccount}\n`);

// Obtain Para ID from an API
const getParaId = async (api) => {
  return await api.query.parachainInfo.parachainId();
};

// Calculate the Sibling Sovereign Account (32 bytes) of a parachain
const calculateSovAddress = async (paraId) => {
  const sovAddressPara = u8aToHex(
    new Uint8Array([...new TextEncoder().encode('sibl'), ...paraId.toU8a()])
  ).padEnd(66, '0');

  console.log(`Sovereign Account Sibling [32 bytes]\n${sovAddressPara}\n`);

  return sovAddressPara;
};

// Resolve the amount to move: explicit override, or full free balance when 0
const resolveAmount = async (api, sovereignAccount, assetId, override, label) => {
  if (override > 0n) {
    console.log(`${label} amount (override): ${override.toString()}\n`);
    return override;
  }

  const free = BigInt((await api.query.tokens.accounts(sovereignAccount, assetId)).free.toString());
  console.log(`${label} amount (full free balance): ${free.toString()}\n`);
  return free;
};

// Build a single Hydration -> Moonbeam Treasury transferAssets call for one asset
const buildTransferCall = async (api, targetParaId, assetId, amount) => {
  // Resolve the asset multilocation from Hydration's registry
  const assetData = await api.query.assetRegistry.assetLocations(assetId);
  const assetML = api.createType('StagingXcmV4AssetAssetId', assetData.toJSON());

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
    V4: [{ id: assetML, fun: { Fungible: amount } }],
  };

  const call = await api.tx.polkadotXcm.transferAssets(dest, beneficiary, assets, 0, 'Unlimited');
  return call;
};

// Build both transfers on Hydration and batch them
const createHydrationTransfers = async (api, sovereignAccount, targetParaId) => {
  const glmrAmount = await resolveAmount(api, sovereignAccount, glmrAssetId, glmrTransferAmount, 'GLMR');
  const usdcAmount = await resolveAmount(api, sovereignAccount, usdcAssetId, usdcTransferAmount, 'USDC');

  if (glmrAmount === 0n && usdcAmount === 0n) {
    throw new Error('Both GLMR and USDC balances are 0 — nothing to transfer.');
  }

  const calls: any[] = [];
  if (glmrAmount > 0n) {
    const glmrCall = await buildTransferCall(api, targetParaId, glmrAssetId, glmrAmount);
    calls.push(glmrCall);
    console.log(`Hydration GLMR Transfer Back\n${glmrCall.method.toHex()}\n`);
  }
  if (usdcAmount > 0n) {
    const usdcCall = await buildTransferCall(api, targetParaId, usdcAssetId, usdcAmount);
    calls.push(usdcCall);
    console.log(`Hydration USDC Transfer Back\n${usdcCall.method.toHex()}\n`);
  }

  if (calls.length === 1) {
    return calls[0].method.toHex();
  }

  const batchTx = await api.tx.utility.batchAll(calls);
  console.log(`Hydration Batch Transfer Call\n${batchTx.method.toHex()}\n`);
  return batchTx.method.toHex();
};

// XCM Transactor Moonbeam Call — execute the Hydration call as the sovereign account
const createXCMTransactor = async (api, targetParaId, hydraCall) => {
  const dest = {
    V5: {
      parents: 1,
      interior: { X1: [{ Parachain: targetParaId }] },
    },
  };

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
    hydraCall,
    'SovereignAccount',
    {
      transactRequiredWeightAtMost: { refTime: refTime, proofSize: proofSize },
      overallWeight: 'Unlimited',
    },
    true
  );

  console.log(`XCM Transactor Moonbeam Call\n${call.method.toHex()}\n`);
  return call;
};

const main = async () => {
  const apiHydra = await ApiPromise.create({
    provider: new WsProvider(wsHydraProvider),
    noInitWarn: true,
  });
  const apiMoonbeam = await ApiPromise.create({
    provider: new WsProvider(wsMoonbeamProvider),
    noInitWarn: true,
  });

  const moonbeamParaId = await getParaId(apiMoonbeam);
  const hydrationParaId = await getParaId(apiHydra);

  const sovereignAccount = await calculateSovAddress(moonbeamParaId);

  // Build the Hydration transfers (batched) then wrap for sovereign execution
  const hydraCall = await createHydrationTransfers(apiHydra, sovereignAccount, moonbeamParaId);
  const xcmTransactorCall = await createXCMTransactor(apiMoonbeam, hydrationParaId, hydraCall);

  console.log(
    `\n================ Moonbeam Governance Proposal Call ================\n${xcmTransactorCall.method.toHex()}\n==================================================================\n`
  );
};

main()
  .catch(console.error)
  .finally(() => process.exit());
