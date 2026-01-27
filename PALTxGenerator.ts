import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady, sortAddresses, decodeAddress, blake2AsHex } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { signFakeWithApi } from '@acala-network/chopsticks-utils';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const args = yargs(hideBin(process.argv)).options({
// Get input arguments
  childBounties: { type: 'array', demandOption: false }, // [Child-Bounty-IDs]
  childBountiesOffset: { type: 'number', demandOption: false, default: 0 }, // Offset for child bounties
  beneficiaries: { type: 'array', demandOption: false }, // [Beneficiary-Addresses]
  add: { type: 'array', demandOption: false }, // [Value(with-decimals) Description]
  propose: { type: 'boolean', demandOption: false, nargs: 0 }, // Propose curator
  accept: { type: 'boolean', demandOption: false, nargs: 0 }, // Accept curator
  award: { type: 'boolean', demandOption: false, nargs: 0 }, // Award child bounty
  claim: { type: 'array', demandOption: false }, // Claim child bounty
  network: { type: 'string', demandOption: false, default: 'polkadot', alias: 'n' },
  chopsticks: { type: 'boolean', demandOption: false, nargs: 0, alias: 'c' }, // Run Chopsticks Test at ws://localhost:8000
  signer: { type: 'string', demandOption: false, default: '' }, // Signer address
}).argv;

// PAL Config
const threshold = 4;
const signatories = sortAddresses([
  '16AhqStFQa8GrffE7WapHrUQ29dmioZHuwFTn4z9fQ7WBGBZ',
  '14DsLzVyTUTDMm2eP3czwPbH53KgqnQRp3CJJZS9GR7yxGDP',
  '14Pn8sUxdEMgFRDgZ5J2VfcUVMLaMQhst9XuvCj9mKJYUAN2',
  '1brScQ9KDuFB2EsBc93smHY5T464gjWzzvtnJbBwKofTqad',
  '15BERoWxrWC61cAb4JjpUdM7sy8FAS9uduismDbZ7PURZLto',
  '15aSnCUARuwBoLYn6nkFj5ap2DUfRmKcXJaAotfVwvVQxNK3',
]);

const parentBounty = 22;
const palCurator = '167dwA1UDmWSBRrFd9dXqXjdk1NRhqVjenT2FbHGDyy44GjS';
const refTime = 300000000;
const proofSize = 10000;

// Function to split string inputs by commas into arrays
const splitData = (arg): (bigint | string)[] => {
  if (Array.isArray(arg)) {
    return arg.map((item) => {
      if (typeof item === 'string') {
        return !isNaN(Number(item)) ? BigInt(item) : item;
      }
      if (typeof item === 'number' || typeof item === 'bigint') {
        return BigInt(item);
      }
      return item;
    });
  }

  if (typeof arg === 'string') {
    const parts = arg.split(',');
    return parts.map((value) => {
      const trimmed = value.trim();
      return !isNaN(Number(trimmed)) ? BigInt(trimmed) : trimmed;
    });
  }

  if (typeof arg === 'number' || typeof arg === 'bigint') {
    return [BigInt(arg)];
  }

  return [];
};

const checkInput = async (api) => {
  const beneficiaries =
    args['beneficiaries'] && Array.isArray(args['beneficiaries'])
      ? args['beneficiaries'][0].split(',')
      : [];

  let childBounties;

  if (args['childBounties']) {
    // Split the string inputs by commas into arrays only if the argument is an array]
    childBounties = Array.isArray(args['childBounties']) ? splitData(args['childBounties'][0]) : [];
  } else if (args['add']) {
    // Get the total number of child bounties for the parent
    const totalChildBounties = await api.query.childBounties.parentTotalChildBounties(parentBounty);

    // Start array at totalChildBounties, incrementing from there
    const start = BigInt(totalChildBounties) + BigInt(args['childBountiesOffset']);
    childBounties = Array.from(
      { length: totalChildBounties.toNumber() },
      (_, i) => start + BigInt(i)
    );
  }

  const childBountyAmounts =
    args['add'] && Array.isArray(args['add']) ? splitData(args['add'][0]) : [];

  const childBountyDescriptions =
    args['add'] && Array.isArray(args['add']) ? splitData(args['add'][1]) : [];

  // Check inputs
  if (childBounties.length === 0 && !args['add']) {
    throw new Error('You must pass child bounties ID unless you are just adding it.');
  }
  if (childBounties.length !== beneficiaries.length && !args['add']) {
    throw new Error(
      'The size of child bounties and beneficiaries must be the same (unless you are just adding).'
    );
  }
  if (
    (args['propose'] || args['accept'] || args['award'] || args['claim']) &&
    childBounties.length === 0 &&
    !args['add']
  ) {
    throw new Error('Child bounties are required for proposing curator.');
  }
  if (args['award'] && beneficiaries.length === 0) {
    throw new Error('Beneficiaries are required for awarding child bounties.');
  }

  return [childBounties, beneficiaries, childBountyAmounts, childBountyDescriptions];
};

// Create Provider
let wsProvider;
switch (args['network']) {
  case 'polkadot':
    wsProvider = new WsProvider('wss://rpc-asset-hub-polkadot.luckyfriday.io');
    break;
  case 'kusama':
    wsProvider = new WsProvider('wss://rpc-asset-hub-kusama.luckyfriday.io');
    break;
}

const main = async () => {
  // Initialize WASM
  await cryptoWaitReady();

  // Wait for Provider
  const api = await ApiPromise.create({ provider: wsProvider, noInitWarn: true });
  await api.isReady;

  // Input checks
  const [childBounties, beneficiaries, childBountyAmounts, childBountyDescriptions] =
    await checkInput(api);

  // Batch Tx
  let batchArgs = [] as any;

  // Loop depending on adding child bounties or proposing curators
  const loopParameter = args['add'] ? childBountyAmounts.length : childBounties.length;
  for (let i = 0; i < loopParameter; i++) {
    // Add Child Bounty
    if (args['add']) {
      console.log(`Adding child bounty ${childBounties[i]} on parent bounty ${parentBounty}`);
      let addTx = await api.tx.childBounties.addChildBounty(
        parentBounty,
        childBountyAmounts[i],
        childBountyDescriptions[i] as string
      );
      batchArgs.push(addTx);
    }

    // Propose Curator
    if (args['propose']) {
      let proposeTx;

      console.log(`Proposing curator for child bounties ${childBounties[i]}`);
      proposeTx = await api.tx.childBounties.proposeCurator(
        parentBounty,
        childBounties[i], // Child Bounty
        palCurator,
        0
      );
      batchArgs.push(proposeTx);
    }

    // Accept Curator
    if (args['accept']) {
      console.log(`Accepting curator for child bounties ${childBounties[i]}`);
      let acceptTx;
      acceptTx = await api.tx.childBounties.acceptCurator(
        parentBounty,
        childBounties[i] // Child Bounty
      );
      batchArgs.push(acceptTx);
    }

    // Award Child Bounty
    if (args['award']) {
      console.log(`Awarding child bounties ${childBounties[i]}`);
      let awardTx = await api.tx.childBounties.awardChildBounty(
        parentBounty,
        childBounties[i], // Child Bounty
        beneficiaries[i] // Beneficiary
      );

      batchArgs.push(awardTx);
    }

    // Claim Child Bounty

    if (args['claim']) {
      console.log(`Claiming child bounties ${childBounties[i]}`);
      let claimTx = await api.tx.childBounties.claimChildBounty(
        parentBounty,
        childBounties[i] // Child Bounty
      );
      batchArgs.push(claimTx);
    }
  }

  // Final Call
  let batchTx = batchArgs.length > 1 ? await api.tx.utility.batchAll(batchArgs) : batchArgs[0];

  console.log(`Tx for Chopsticks Test ${batchTx.toHex()}\n`);

  // Proxy call
  let proxyTx = await api.tx.proxy.proxy(palCurator, null, batchTx);

  console.log(`Proxy Tx ${proxyTx.method.toHex()}`);
  console.log(`Proxy Tx hash ${blake2AsHex(proxyTx.method.toHex())}\n`);

  // Multisig Call
  let multisigTx = await api.tx.multisig.asMulti(
    threshold,
    signatories.filter(
      (input) => u8aToHex(decodeAddress(input)) !== u8aToHex(decodeAddress(args['signer']))
    ),
    null,
    proxyTx,
    {
      refTime: refTime,
      proofSize: proofSize,
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

    await signFakeWithApi(chopsticksAPI, chopsticksTx as unknown as any, palCurator);
    await chopsticksTx.send();

    console.log('--- Chopsticks Test Done ---');
    await chopsticksAPI.disconnect();
  }

  await api.disconnect();
};

main();
