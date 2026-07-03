/*
    Governance proposal to STOP (terminate) the Moonbeam Treasury's DCA schedule(s) in Hydration.

    The DCA schedule is owned by the Moonbeam Treasury Sovereign Account on Hydration
    (see treasuryDCAHydration.ts, where it was created via XCM Transact as the sovereign account).

    To close it we do the reverse:
    1. Build the Hydration `dca.terminate(scheduleId, null)` call for each owned schedule.
       (`terminate` must be signed by the schedule owner -> the Moonbeam sovereign account.)
    2. If more than one schedule, batch them with `utility.batchAll` on Hydration.
    3. Wrap it in an XCM `transactThroughSovereign` so Moonbeam governance executes it
       as the sovereign account on Hydration.

    The final "Moonbeam Governance Proposal Call" hex printed at the end is what you propose
    on Moonbeam OpenGov (preimage -> referendum). It leaves the remaining GLMR sitting in the
    sovereign account on Hydration; repatriating those funds is a separate action
    (see treasuryRemoveLPHydration.ts / treasuryTransferUSDCBack.ts for that pattern).
*/

import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';

// Input Data
const wsHydraProvider = 'wss://rpc.hydradx.cloud';
const wsMoonbeamProvider = 'wss://wss.api.moonbeam.network';

// If you already know the schedule id(s) to close (e.g. from the Hydration UI or from when
// the DCA was created), list them here and auto-discovery is skipped. Leave empty to
// auto-discover every schedule owned by the Treasury sovereign account.
const scheduleIdsOverride: number[] = [];

// XCM Transactor Config (mirrors treasuryDCAHydration.ts)
const feeAmount = BigInt('100000000000000');
const refTime = BigInt('8000000000'); // For XCM Transact
const proofSize = BigInt('300000'); // For XCM Transact

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

// Discover the DCA schedule ids owned by the sovereign account
const findOwnedSchedules = async (api, sovereignAccount) => {
  if (scheduleIdsOverride.length > 0) {
    console.log(`Using manual schedule id override: [${scheduleIdsOverride.join(', ')}]\n`);
    return scheduleIdsOverride;
  }

  // dca.scheduleOwnership is a double map: (AccountId, ScheduleId) => ()
  const entries = await api.query.dca.scheduleOwnership.entries(sovereignAccount);
  const scheduleIds = entries.map(([key]) => (key.args[1] as any).toNumber());

  console.log(
    `Discovered ${scheduleIds.length} schedule(s) owned by the sovereign account: [${scheduleIds.join(
      ', '
    )}]\n`
  );

  return scheduleIds;
};

// Build the Hydration terminate call(s), batching if more than one
const createHydrationTerminateCall = async (api, scheduleIds) => {
  if (scheduleIds.length === 0) {
    throw new Error(
      'No DCA schedules found for the sovereign account. Nothing to terminate. ' +
        'If you expected one, set scheduleIdsOverride manually.'
    );
  }

  const terminateCalls: any[] = [];
  for (const id of scheduleIds) {
    // terminate(scheduleId, nextExecutionBlock?) -> null lets the pallet locate it
    const call = await api.tx.dca.terminate(id, null);
    terminateCalls.push(call);
    console.log(`Hydration DCA Terminate Call (schedule ${id})\n${call.method.toHex()}\n`);
  }

  if (terminateCalls.length === 1) {
    return terminateCalls[0].method.toHex();
  }

  const batchTx = await api.tx.utility.batchAll(terminateCalls);
  console.log(`Hydration Batch Terminate Call\n${batchTx.method.toHex()}\n`);

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

  const xcmTransactorCall = await api.tx.xcmTransactor.transactThroughSovereign(
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

  console.log(`XCM Transactor Moonbeam Call\n${xcmTransactorCall.method.toHex()}\n`);

  return xcmTransactorCall;
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

  // Calculate the Moonbeam Treasury Sovereign Account on Hydration
  const sovereignAccount = await calculateSovAddress(moonbeamParaId);

  // Find the DCA schedule(s) to terminate
  const scheduleIds = await findOwnedSchedules(apiHydra, sovereignAccount);

  // Build the Hydration terminate call (batched if needed)
  const hydraCall = await createHydrationTerminateCall(apiHydra, scheduleIds);

  // Wrap it in an XCM Transactor so Moonbeam governance runs it as the sovereign account
  const xcmTransactorCall = await createXCMTransactor(apiMoonbeam, hydrationParaId, hydraCall);

  console.log(
    `\n================ Moonbeam Governance Proposal Call ================\n${xcmTransactorCall.method.toHex()}\n==================================================================\n`
  );
};

main()
  .catch(console.error)
  .finally(() => process.exit());
