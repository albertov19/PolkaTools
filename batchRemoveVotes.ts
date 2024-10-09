/*
  Simple code snippet to batch remove vote
*/
import { ApiPromise, WsProvider } from '@polkadot/api';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from 'fs';

const argv = yargs(hideBin(process.argv)).options({
  network: { type: 'string', demandOption: true, alias: 'n', default: 'moonbeam' },
  sender: { type: 'string', demandOption: true, alias: 's' },
}).argv;

// Create Provider
let wsProvider;
if (argv['network'] === 'moonbeam') {
  wsProvider = new WsProvider('wss://wss.api.moonbeam.network');
} else if (argv['network'] === 'moonriver') {
  wsProvider = new WsProvider('wss://wss.api.moonriver.moonbeam.network');
} else {
  console.error('Network not supported');
  process.exit();
}

const main = async () => {
  // Wait for Provider
  const api = await ApiPromise.create({
    provider: wsProvider,
    noInitWarn: true,
  });
  await api.isReady;

  // Get list of votes
  const votes = await api.query.convictionVoting.votingFor.entries(argv['sender']);

  let votesInfo = [];

  votes.forEach(([key, exposure]: any | any) => {
    votesInfo.push({
      info: key.args.map((k) => k.toHuman()),
      details: exposure.toHuman().Casting.votes,
    });
  });

  let batchTxs = [];

  // Batch remove vote extrinsic
  console.log(`Vote Class, # of Votes`);

  for (let i = 0; i < votesInfo.length; i++) {
    let classInfo = votesInfo[i].info[1];
    console.log(classInfo, votesInfo[i].details.length);
    for (let j = 0; j < votesInfo[i].details.length; j++) {
      let indexInfo = votesInfo[i].details[j] ? votesInfo[i].details[j][0] : NaN;
      if (indexInfo) {
        batchTxs.push(
          await api.tx.convictionVoting.removeOtherVote(argv['sender'], classInfo, indexInfo)
        );
      }
    }
  }

  // Batch Tx
  let tx = await api.tx.utility.batch(batchTxs);
  console.log(`\n Batch Call:`);

  console.log(tx.toHex());

  await api.disconnect();
};

main();
