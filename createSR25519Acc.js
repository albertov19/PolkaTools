/* Create Accounts
  Script to create a number of accounts. These will be stored in a accounts.json file
  Provide the Account Prefix (1 - Polkadot, 2 - Kusama, 42 - Generic Substrate)
  Provide the number of accounts to create
*/
import * as fs from 'fs';
import { Keyring } from '@polkadot/api';
import {
  cryptoWaitReady,
  mnemonicGenerate,
  base64Decode,
  mnemonicToMiniSecret,
} from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

// Global variables
// Account prefix of SR25519 accounts (0 - Polkadot / 2 - Kusama / 42 - Generic Substrate)
const accountPrefix = 42;
// Number of accounts to Create
const nAccounts = 1;

const createAccount = async () => {
  // Initialize WASM
  await cryptoWaitReady();

  // Create a keyring instance with type SR25519 and given prefix
  const keyring = new Keyring({ type: 'sr25519', ss58Format: accountPrefix });

  // Generate mnemonic seed
  const mnemonic = mnemonicGenerate();

  // Extract private key from mnemonic
  const privateKey = u8aToHex(mnemonicToMiniSecret(mnemonic));

  // Create account (keypairs or pair) from mnemonic
  const pair = keyring.createFromUri(mnemonic, { name: 'sr25519' });

  // Log information
  console.log(`Account mnemonic is: ${mnemonic}`);
  console.log(`Account private key is: ${privateKey}`);
  console.log(`Account address is: ${pair.address}\n`);

  return [mnemonic, privateKey, pair.address];
};

const main = async () => {
  // Variables
  let accounts = {};
  let mnemonics = Array();
  let privateKeys = Array();
  let addresses = Array();

  console.log(`🤖 - Creating ${nAccounts} accounts!`);
  // Loop for each Account
  for (let i = 0; i < nAccounts; i++) {
    console.log(`Account ${i + 1} ---`);
    [mnemonics[i], privateKeys[i], addresses[i]] = await createAccount();
  }

  // Save variables into an object for saving
  accounts.mnemonics = mnemonics;
  accounts.privateKeys = privateKeys;
  accounts.addresses = addresses;

  // Save data to JSON file
  const accountsJSON = JSON.stringify(accounts);
  fs.writeFileSync('accounts.json', accountsJSON, 'utf-8');

  console.log('\n✔️     Done!');
};

main();
