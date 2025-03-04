import { ApiPromise, WsProvider } from '@polkadot/api';
import * as fs from 'fs';
import * as path from 'path';
import { input, select } from '@inquirer/prompts';

let provider;

// Main function
const main = async () => {
  // Input
  const network = await select({
    message: 'Choose the Moonbeam Network to query.',
    choices: [
      { name: 'Moonriver', value: 'moonriver' },
      { name: 'Moonbeam', value: 'moonbeam' },
    ],
  });

  if (network === 'moonriver') {
    provider = new WsProvider('wss://moonriver.unitedbloc.com');
  } else if (network === 'moonbeam') {
    provider = new WsProvider('wss://moonbeam.unitedbloc.com');
  }

  const block = await input({
    message: 'What is the block height (number)?',
  });

  // Read JSON Data
  const addressesDataBuffer = fs.readFileSync(path.resolve(`./addresses.json`));
  const addressesDataJSONString = addressesDataBuffer.toString();
  const addressesArray = JSON.parse(addressesDataJSONString);

  // Create API Provider
  const api = await ApiPromise.create({
    provider: provider,
    noInitWarn: true,
  });

  // Create API Provider at a Given Block Hash
  const blockHash = await api.rpc.chain.getBlockHash(block);
  const apiAt = await api.at(blockHash);

  // Get TimeStamp
  const time = (await apiAt.query.timestamp.now()).toHuman() as any;

  let results = [];
  for (let address of addressesArray['moonbeam']) {
    const balance = (await apiAt.query.system.account(address)).toHuman() as any;

    // Convert balance from WEI to blockchain tokens
    const realBalance = (
      BigInt(balance.data.free.replaceAll(',', '')) / BigInt(10 ** 18)
    ).toString();
    results.push({
      network: network,
      date: new Date(Number(time.replaceAll(',', ''))),
      address: address,
      balance: realBalance,
    });
  }

  // Save data to JSON file
  const dataJSON = JSON.stringify(results, null, 2);
  fs.writeFileSync(`${network}_address_balance_block${block}.json`, dataJSON, 'utf-8');

  await api.disconnect();
};

// Execute the main function
main().catch((error) => {
  console.error('An error occurred:', error);
});
