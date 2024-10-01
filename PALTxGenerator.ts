import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady, sortAddresses, decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { signFakeWithApi } from '@acala-network/chopsticks-utils';

import yargs from 'yargs';

// Get input arguments
const args = yargs.options({
  sender: { type: 'string', demandOption: true, alias: 's' },
  propose: { type: 'array', demandOption: false }, // [Child Bounty, fee]
  accept: { type: 'array', demandOption: false }, // Child Bounty
  award: { type: 'array', demandOption: false }, // [Child Bounty, Beneficiary]
  network: { type: 'string', demandOption: false, default: 'polkadot', alias: 'n' },
  chopsticks: { type: 'bolean', demandOption: false, nargs: 0 }, // Run Chopsticks Test at ws://localhost:8000
}).argv;

// PAL Config
const threshold = 4;
const signatories = sortAddresses([
  '14DsLzVyTUTDMm2eP3czwPbH53KgqnQRp3CJJZS9GR7yxGDP',
  '14Pn8sUxdEMgFRDgZ5J2VfcUVMLaMQhst9XuvCj9mKJYUAN2',
  '1brScQ9KDuFB2EsBc93smHY5T464gjWzzvtnJbBwKofTqad',
  '15BERoWxrWC61cAb4JjpUdM7sy8FAS9uduismDbZ7PURZLto',
  '15aSnCUARuwBoLYn6nkFj5ap2DUfRmKcXJaAotfVwvVQxNK3',
  '13zU1pipCuijDA1eWdHPnDgEHh3BvDJ9GsPMMFFvE5p6GF4D',
  '16AhqStFQa8GrffE7WapHrUQ29dmioZHuwFTn4z9fQ7WBGBZ',
]);

const parentBounty = 22;
const palCurator = '167dwA1UDmWSBRrFd9dXqXjdk1NRhqVjenT2FbHGDyy44GjS';
const palReftime = 300000000;
const palProofSize = 10000;

// Create Provider
let wsProvider;
switch (args['network']) {
  case 'polkadot':
    wsProvider = new WsProvider('wss://polkadot-rpc.dwellir.com');
    break;
  case 'kusama':
    wsProvider = new WsProvider('wss://kusama-rpc.dwellir.com');
    break;
}

const main = async () => {
  // Initialize WASM
  await cryptoWaitReady();

  // Wait for Provider
  const api = await ApiPromise.create({ provider: wsProvider, noInitWarn: true });
  await api.isReady;

  // Batch Tx
  let batchArgs = [];

  // Split the string inputs by commas into arrays
  const proposeBountiesID = args['propose'] ? args['propose'][0].split(',') : [];
  const proposeBountiesFees = args['propose'] ? args['propose'][1].split(',') : [];
  const acceptBounties = args['accept'] ? args['accept'][0].split(',') : [];
  const awardBounties = args['award'] ? args['award'][0].split(',') : [];
  const awardBeneficiary = args['award'] ? args['award'][1].split(',') : [];

  // Check lengths
  if (
    proposeBountiesID.length !== proposeBountiesFees.length ||
    awardBounties.length !== awardBeneficiary.length
  ) {
    throw new Error(
      'The size of propose bounties and fees, or award bounties and award beneficiaries must be the same.'
    );
  }

  // Propose Curator
  let proposeTx;
  for (let i = 0; i < proposeBountiesID.length; i++) {
    proposeTx = await api.tx.childBounties.proposeCurator(
      parentBounty,
      proposeBountiesID[i], // Child Bounty
      palCurator,
      proposeBountiesFees[i] // Fee
    );
    batchArgs.push(proposeTx);
  }

  // Accept Curator
  let acceptTx;
  for (let i = 0; i < acceptBounties.length; i++) {
    acceptTx = await api.tx.childBounties.acceptCurator(
      parentBounty,
      acceptBounties[i] // Child Bounty
    );
    batchArgs.push(acceptTx);
  }

  // Award Child Bounty
  let awardTx;
  for (let i = 0; i < awardBounties.length; i++) {
    awardTx = await api.tx.childBounties.awardChildBounty(
      parentBounty,
      awardBounties[i], // Child Bounty
      awardBeneficiary[i] // Beneficiary
    );
    batchArgs.push(awardTx);
  }

  // Batch Calls
  let batchTx = await api.tx.utility.batch(batchArgs);

  console.log(`\nBatch Tx for Chopsticks Test ${batchTx.toHex()}\n`);

  console.log(`Batch Tx for Multix Submission ${batchTx.method.toHex()}\n`);

  // Proxy call
  let proxyTx = await api.tx.proxy.proxy(palCurator, null, batchTx);

  //console.log(`Proxy Tx ${proxyTx.method.toHex()}`);
  //console.log(`Proxy Tx hash ${blake2AsHex(proxyTx.method.toHex())}\n`);

  // Multisig Call
  let multisigTx = await api.tx.multisig.asMulti(
    threshold,
    signatories.filter(
      (input) => u8aToHex(decodeAddress(input)) !== u8aToHex(decodeAddress(args['sender']))
    ),
    null,
    proxyTx,
    {
      refTime: palReftime,
      proofSize: palProofSize,
    }
  );

  console.log(`Multisig Tx ${multisigTx.toHex()}`);

  if (args['chopsticks']) {
    console.log('\n--- Chopsticks Testing ---');

    const chopsticksWS = 'ws://127.0.0.1:8000';

    const chopsticksProvider = new WsProvider(chopsticksWS);
    const chopsticksAPI = await ApiPromise.create({
      provider: chopsticksProvider,
      noInitWarn: true,
    });

    let chopsticksTx = await chopsticksAPI.tx(batchTx.toHex());

    await signFakeWithApi(chopsticksAPI, chopsticksTx, palCurator);
    await chopsticksTx.send();

    console.log('--- Chopsticks Test Done ---');
    await chopsticksAPI.disconnect();
  }

  await api.disconnect();
};

main();
