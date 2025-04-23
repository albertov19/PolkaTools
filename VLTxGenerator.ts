import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady, sortAddresses, decodeAddress, blake2AsHex } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { signFakeWithApi } from '@acala-network/chopsticks-utils';

import yargs from 'yargs';

// Get input arguments
const args = yargs.options({
  childBounties: { type: 'array', demandOption: false }, // [Child Bounty IDs]
  beneficiaries: { type: 'array', demandOption: false }, // [Beneficiary Addresses]
  add: { type: 'array', demandOption: false, nargs: 0 }, // [Value Description]
  propose: { type: 'bolean', demandOption: false, nargs: 0 }, // Propose curator
  accept: { type: 'bolean', demandOption: false, nargs: 0 }, // Accept curator
  award: { type: 'bolean', demandOption: false, nargs: 0 }, // Award child bounty
  claim: { type: 'array', demandOption: false }, // Claim child bounty
  network: { type: 'string', demandOption: false, default: 'polkadot', alias: 'n' },
  chopsticks: { type: 'bolean', demandOption: false, nargs: 0, alias: 'c' }, // Run Chopsticks Test at ws://localhost:8000
}).argv;

// VL Config
const threshold = 4;
const signatories = sortAddresses([
  '1HGnvAkk9nbfZ58CzUJhjcrLdEDMkr5qNkqqYkyD5BF5v6Y',
  '12m16pNVG4QKDsr3d9hA1TMjNhSxdQaztqZ5jMC86HLba1Qw',
  '12xi27tWkBPdRi147GrV4BM5PmHPA7vSEPvWKU7v95p7h3yL',
  '14DsLzVyTUTDMm2eP3czwPbH53KgqnQRp3CJJZS9GR7yxGDP',
  '13gjthPeadKaZQChaGfXthNe52oErZVgUGt78W3oU7rE5Pmn',
  '14hBq9aMgvdM7nLhG6b3XvRhwfxqwEmY7MhwiXmfkbrV9xna',
  '16AhqStFQa8GrffE7WapHrUQ29dmioZHuwFTn4z9fQ7WBGBZ',
]);

const parentBounty = 36;
const vlCurator = '14Gvqxjvy2rKFnY5BobiNq4ZsmbsHnnhZy1SqwZb3nhh3mLE';
const reftime = 300000000;
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

// Split the string inputs by commas into arrays only if the argument is an array
const childBounties =
  args['childBounties'] && Array.isArray(args['childBounties'])
    ? splitData(args['childBounties'][0])
    : [];

const beneficiaries =
  args['beneficiaries'] && Array.isArray(args['beneficiaries'])
    ? args['beneficiaries'][0].split(',')
    : [];

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

  // Loop depending on adding child bounties or proposing curators
  const loopParameter = args['add'] ? childBountyAmounts.length : childBounties.length;
  for (let i = 0; i < loopParameter; i++) {
    // Add Child Bounty
    if (args['add']) {
      console.log(`Adding child bounty on parent bounty ${parentBounty}`);
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
        vlCurator,
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

  console.log(`\Tx for Chopsticks Test ${batchTx.toHex()}\n`);

  console.log(`Tx for Multix Submission ${batchTx.method.toHex()}\n`);

  // Proxy call
  let proxyTx = await api.tx.proxy.proxy(vlCurator, null, batchTx);

  console.log(`Proxy Tx ${proxyTx.method.toHex()}`);
  console.log(`Proxy Tx hash ${blake2AsHex(proxyTx.method.toHex())}\n`);

  // Multisig Call
  let multisigTx = await api.tx.multisig.asMulti(
    threshold,
    signatories.filter(
      (input) => u8aToHex(decodeAddress(input)) !== u8aToHex(decodeAddress(signatories[0]))
    ),
    null,
    proxyTx,
    {
      refTime: reftime,
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

    await signFakeWithApi(chopsticksAPI, chopsticksTx, vlCurator);
    await chopsticksTx.send();

    console.log('--- Chopsticks Test Done ---');
    await chopsticksAPI.disconnect();
  }

  await api.disconnect();
};

main();
