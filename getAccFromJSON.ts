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
const args = yargs.options({
    file: { type: 'string', demandOption: true, alias: 'f' },
    password: { type: 'string', demandOption: true, alias: 'p' },
}).argv;

// Enter JSON file name
let fileName = args['file'];

// Password that you used for the account
let accountPassword = args['password'];

let rawdata = JSON.parse(fs.readFileSync(fileName + '.json').toString());

// Decode the account
const decoded = decodePair(accountPassword, base64Decode(rawdata.encoded), rawdata.encoding.type);
console.log(`Private key is: ${u8aToHex(decoded.secretKey)}`);
