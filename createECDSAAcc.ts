/* Create Ethereum-style accounts from a BIP-39 mnemonic using Polkadot.js */
import * as fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { Keyring } from '@polkadot/keyring';
import {
  cryptoWaitReady,
  mnemonicGenerate,
  mnemonicValidate,
  mnemonicToLegacySeed, // 64-byte BIP-32 seed when length=64
  hdEthereum,
  hdValidatePath
} from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

const args = yargs(hideBin(process.argv)).options({
  naccounts: { type: 'number', alias: 'n', default: 1 }
}).parseSync();

async function createAccount(index: number) {
  await cryptoWaitReady();

  // Ethereum-style (secp256k1) keyring
  const keyring = new Keyring({ type: 'ethereum' });

  // Standard ETH derivation path
  const path = `m/44'/60'/0'/0/${index}`;
  hdValidatePath(path); // throws if not BIP-32/44 compliant

  // 12-word BIP-39 mnemonic
  const mnemonic = mnemonicGenerate(12);
  if (!mnemonicValidate(mnemonic)) throw new Error('Invalid mnemonic');

  // Derive ETH child key at the BIP-44 path
  const seed = mnemonicToLegacySeed(mnemonic, '', false, 64);  // 64-byte BIP-32 seed
  const { secretKey } = hdEthereum(seed, path);                // returns { secretKey: Uint8Array }
  const privateKeyHex = u8aToHex(secretKey);                   // 0x…

  // Import via raw private key (stable approach for ethereum type)
  const pair = keyring.addFromUri(privateKeyHex);

  console.log(`Account ${index} ---`);
  console.log(`Mnemonic:     ${mnemonic}`);
  console.log(`Deriv. path:  ${path}`);
  console.log(`Private key:  ${privateKeyHex}`);
  console.log(`EVM address:  ${pair.address}\n`);

  return { mnemonic, address: pair.address };
}

(async function main() {
  console.log(`🤖 - Creating ${args.naccounts} account(s)!`);

  const mnemonics: string[] = [];
  const addresses: string[] = [];

  for (let i = 0; i < args.naccounts; i++) {
    const { mnemonic, address } = await createAccount(i);
    mnemonics[i] = mnemonic;
    addresses[i] = address;
  }

  const accounts = { mnemonics, addresses };
  fs.writeFileSync('accounts.json', JSON.stringify(accounts, null, 2), 'utf-8');

  console.log('✔️  Done! Saved to accounts.json');
})();
