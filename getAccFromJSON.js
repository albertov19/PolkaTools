/*
  Simple code to get your private key from JSON file
  USE AT YOUR OWN RISK
*/

import { base64Decode } from '@polkadot/util-crypto';
import { decodePair } from '@polkadot/keyring/pair/decode';
import { u8aToHex } from '@polkadot/util';
import yargs from 'yargs';
import fs from 'fs';

// Get input arguments
const argv = yargs(process.argv).argv;

// Enter JSON file name
let fileName;
if (argv.file) {
  fileName = argv.file;
} else {
  fileName = 'file_name';
}

// Password that you used for the account
let accountPassword;
if (argv.password) {
  accountPassword = argv.password;
} else {
  accountPassword = 'password';
}

let rawdata = JSON.parse(fs.readFileSync(fileName + '.json'));

// Decode the account
const decoded = decodePair(accountPassword, base64Decode(rawdata.encoded), rawdata.encoding.type);
console.log(`Private key is: ${u8aToHex(decoded.secretKey)}`);
