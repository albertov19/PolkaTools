import { base64Decode } from '@polkadot/util-crypto';
import { decodePair } from '@polkadot/keyring/pair/decode';
import { u8aToHex } from '@polkadot/util';
import fs from 'fs';

// Enter JSON file name
const fileName = 'file_name';
let rawdata = JSON.parse(fs.readFileSync(fileName + '.json'));

// Password that you used for the account
const accountPassword = ' ';

// Decode the account
const decoded = decodePair(accountPassword, base64Decode(rawdata.encoded), rawdata.encoding.type);
console.log(`Private key is: ${u8aToHex(decoded.secretKey)}`);
