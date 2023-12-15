import { encodeAddress, decodeAddress, createKeyMulti } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

import yargs from 'yargs';

const args = yargs
  .options({
    addresses: { type: 'array', demandOption: true, alias: 'a', coerce: JSON.parse },
    threshold: { type: 'number', demandOption: true, alias: 't' },
  })
  .check((argv) => {
    // Check length
    console.log(argv.addresses.length);
    if (argv.addresses.length < 2) {
      throw new Error('Addresses array must have at least a length of 2');
    }
    // Ensure that addresses array is correct
    for (const i of argv['addresses']) {
      if (typeof i !== 'string' || decodeAddress(i).length != 32)
        throw new Error(`${i} is not a valid address. Please enter a valid array of addresses`);
      return true;
    }
  }).argv;

const multisigAddress = u8aToHex(createKeyMulti(args['addresses'], BigInt(args['threshold'])));

console.log(`32 Bytes Multisig Address: ${multisigAddress}`);
console.log(`Encoded (Generic): ${encodeAddress(multisigAddress)}`);
