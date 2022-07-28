import { encodeAddress, decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

import yargs from 'yargs';

const args = yargs.options({
  address: { type: 'string', demandOption: true, alias: 'a' },
  action: { type: 'string', demandOption: true, alias: 'x' },
  prefix: { type: 'number', demandOption: false, alias: 'p' },
}).argv;

switch (args['action'].toLowerCase()) {
  case 'decode':
    console.log(`Decoded address: ${u8aToHex(decodeAddress(args['address']))}`);
    break;
  case 'encode':
    console.log(
      `Encoded address with prefix ${args['prefix']}: ${encodeAddress(
        args['address'],
        args['prefix']
      )}`
    );
    break;
  default:
    console.error('Actions supported are encode or decode');
}
