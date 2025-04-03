import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady, sortAddresses, decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { signFakeWithApi } from '@acala-network/chopsticks-utils';

import yargs from 'yargs';

// Get input arguments
const args = yargs.options({
  sender: { type: 'string', demandOption: true, alias: 's' },
  propose: { type: 'array', demandOption: false }, // Child Bounty
  accept: { type: 'array', demandOption: false }, // Child Bounty
  award: { type: 'array', demandOption: false }, // [Child Bounty, Beneficiary]
  claim: { type: 'array', demandOption: false }, // Child Bounty
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

  // Split the string inputs by commas into arrays only if the argument is an array
  const proposeBountiesID =
    args['propose'] && Array.isArray(args['propose']) ? splitData(args['propose'][0]) : [];

  const acceptBounties =
    args['accept'] && Array.isArray(args['accept']) ? splitData(args['accept'][0]) : [];

  const awardBounties =
    args['award'] && Array.isArray(args['award']) ? splitData(args['award'][0]) : [];

  const awardBeneficiary =
    args['award'] && Array.isArray(args['award'])
      ? typeof args['award'][1] === 'string' && args['award'][1].includes(',')
        ? args['award'][1].split(',')
        : [args['award'][1]]
      : [];

  const claimBounties =
    args['claim'] && Array.isArray(args['claim']) ? splitData(args['claim'][0]) : [];

  console.log(`Proposing curator for child bounties ${proposeBountiesID}`);
  console.log(`Accepting child bounties ${acceptBounties}`);
  console.log(`Awarding child bounties ${awardBounties}`);
  console.log(`Awarding addresses are ${awardBeneficiary}`);
  console.log(`Claiming child bounties ${claimBounties}`);

  // Check lengths
  if (awardBounties.length !== awardBeneficiary.length) {
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
      vlCurator,
      0
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

  // Claim Child Bounty
  let claimTx;
  for (let i = 0; i < claimBounties.length; i++) {
    claimTx = await api.tx.childBounties.claimChildBounty(
      parentBounty,
      awardBounties[i] // Child Bounty
    );
    batchArgs.push(claimTx);
  }

  // Batch Calls
  let batchTx = await api.tx.utility.batch(batchArgs);

  console.log(`\nBatch Tx for Chopsticks Test ${batchTx.toHex()}\n`);

  console.log(`Batch Tx for Multix Submission ${batchTx.method.toHex()}\n`);

  // Proxy call
  let proxyTx = await api.tx.proxy.proxy(vlCurator, null, batchTx);

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

const splitData = (arg) => {
  if (typeof arg === 'string') {
    return arg.includes(',') ? arg.split(',').map((value) => BigInt(value)) : [BigInt(arg)];
  }
  // If the argument is already a number or BigInt, return it as an array
  return [BigInt(arg)];
};

main();
