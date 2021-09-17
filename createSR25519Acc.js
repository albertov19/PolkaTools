/* Create Accounts
  Script to create a number of accounts. These will be stored in a accounts.json file
  Provide the Account Prefix (1 - Polkadot, 2 - Kusama, 42 - Generic Substrate)
  Provide the number of accounts to create
*/
import * as fs from 'fs';
import { Keyring } from '@polkadot/api';
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto';

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

  // Create account (keypairs or pair) from mnemonic
  const pair = keyring.createFromUri(mnemonic, { name: 'sr25519' });

  return [mnemonic, pair.address];
};

const main = async () => {
  // Variables
  let accounts = {};
  let mnemonics = Array();
  let address = Array();

  console.log(`🤖 - Creating ${nAccounts} accounts!`);
  // Loop for each Account
  for (let i = 0; i < nAccounts; i++) {
    [mnemonics[i], address[i]] = await createAccount();
  }

  // Save variables into an object for saving
  accounts.mnemonics = mnemonics;
  accounts.address = address;

  // Save data to JSON file
  const accountsJSON = JSON.stringify(accounts);
  fs.writeFileSync('accounts.json', accountsJSON, 'utf-8');

  console.log('\n✔️     Done!');
};

main();
