/* 
  Create ECDSA account with Polkadot Keyring
*/
import * as fs from 'fs';
import { Keyring } from '@polkadot/api';
import {
  cryptoWaitReady,
  mnemonicGenerate,
  mnemonicToLegacySeed,
  hdEthereum,
} from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import yargs from 'yargs';

// Global variables
const args = yargs.options({
  naccounts: { type: 'string', demandOption: false, alias: 'n' },
}).argv;

const createAccount = async (index) => {
  // Initialize WASM
  await cryptoWaitReady();

  // Create a keyring instance with type SR25519 and given prefix
  const keyring = new Keyring({ type: 'ethereum' });
  // Define index of the derivation path and the derivation path
  const ethDerPath = "m/44'/60'/0'/0/" + index;

  // Generate mnemonic seed
  const mnemonic = mnemonicGenerate();

  // Extract private key from mnemonic
  const privateKey = u8aToHex(
    hdEthereum(mnemonicToLegacySeed(mnemonic, '', false, 64), ethDerPath).secretKey
  );

  // Create account (keypairs or pair) from mnemonic
  const pair = keyring.addFromUri(`${mnemonic}/${ethDerPath}`);

  // Log information
  console.log(`Account mnemonic is: ${mnemonic}`);
  console.log(`Account private key is: ${privateKey}`);
  console.log(`Account address is: ${pair.address}\n`);

  return [mnemonic, pair.address];
};

const main = async () => {
  // Variables
  let accounts = {};
  let mnemonics = Array();
  let addresses = Array();

  // Loop for each Account
  let naccounts = 1;
  if (args['naccounts']) {
    naccounts = args['naccounts'];
  }

  console.log(`🤖 - Creating ${naccounts} account/s!`);

  for (let i = 0; i < naccounts; i++) {
    console.log(`Account ${i + 1} ---`);
    [mnemonics[i], , addresses[i]] = await createAccount(i);
  }

  // Save variables into an object for saving
  accounts['mnemonics'] = mnemonics;
  accounts['addresses'] = addresses;

  // Save data to JSON file
  const accountsJSON = JSON.stringify(accounts);
  fs.writeFileSync('accounts.json', accountsJSON, 'utf-8');

  console.log('\n✔️     Done!');
};

main();
