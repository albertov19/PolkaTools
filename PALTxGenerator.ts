import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import yargs from 'yargs';

// Get input arguments
const args = yargs.options({
  propose: { type: 'array', demandOption: false }, // [Child Bounty, fee]
  accept: { type: 'number', demandOption: false }, // Child Bounty
  award: { type: 'array', demandOption: false }, // [Child Bounty, Beneficiary]
  network: { type: 'string', demandOption: false, default: 'polkadot', alias: 'n' },
}).argv;

// PAL Config
const threshold = 5;
const signatories = [
  '14DsLzVyTUTDMm2eP3czwPbH53KgqnQRp3CJJZS9GR7yxGDP',
  '1brScQ9KDuFB2EsBc93smHY5T464gjWzzvtnJbBwKofTqad',
  '12BZFbrNksTKwHtaBojnVtoN8BoXKmBFzT3xDnHh7P9t2Cg5',
  '12LMDqivf5jDB7qkNLNVZf6vYHmBbDbiyV63jcRenAif4gSk',
  '15BERoWxrWC61cAb4JjpUdM7sy8FAS9uduismDbZ7PURZLto',
  '15aSnCUARuwBoLYn6nkFj5ap2DUfRmKcXJaAotfVwvVQxNK3',
  '16AhqStFQa8GrffE7WapHrUQ29dmioZHuwFTn4z9fQ7WBGBZ',
];
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

  // Propose Curator
  let proposeTx;
  if (args['propose']) {
    proposeTx = await api.tx.childBounties.proposeCurator(
      parentBounty,
      args['propose'][0], // Child Bounty
      palCurator,
      args['propose'][1] // Fee
    );
    batchArgs.push(proposeTx);
  }

  // Accept Curator
  let acceptTx;
  if (args['accept']) {
    acceptTx = await api.tx.childBounties.acceptCurator(
      parentBounty,
      args['accept'] // Child Bounty
    );
    batchArgs.push(acceptTx);
  }

  // Award Child Bounty
  let awardTx;
  if (args['award']) {
    awardTx = await api.tx.childBounties.awardChildBounty(
      parentBounty,
      args['award'][0], // Child Bounty
      args['award'][1] // Beneficiary
    );
    batchArgs.push(awardTx);
  }

  // Batch Calls
  let batchTx = await api.tx.utility.batch(batchArgs);

  // Proxy call
  let proxyTx = await api.tx.proxy.proxy(palCurator, null, batchTx);

  // Multisig Call
  let multisigTx = await api.tx.multisig.asMulti(threshold, signatories, null, proxyTx, {
    refTime: palReftime,
    proofSize: palProofSize,
  });

  console.log(multisigTx.method.toHex());

  await api.disconnect();
};

main();
