import { blake2AsU8a, encodeAddress, decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex, hexToU8a, bnToU8a } from '@polkadot/util';

import yargs from 'yargs';

const args = yargs.options({
  address: { type: 'string', demandOption: true, alias: 'a' },
  index: { type: 'array', demandOption: true, alias: 'i' },
})
.check((argv) => {
  // Ensure that index array is parsed correctly
  for(const i of argv['index'])
    if(typeof(i) !== 'number' || !Number.isInteger(i)) 
      throw new Error(`${i} is not an integer. Please try the command again with integers.`);
  return true;
}).argv;

// If address does not start with 0x - decode it
let address = args['address'];
const ethAddress = address.length === 42;

const derivativeToEthAddress = (d: string) => d.slice(0, 42);
let derivative;

for(let l = 0; l < args['index'].length; l++) {
  if (!(address.substring(0, 1) == '0x') && !ethAddress) {
    address = decodeAddress(address);
  } else {
    address = hexToU8a(address);
  }
  
  // Calculate Derivative Address of Given Index
  derivative = u8aToHex(
    blake2AsU8a(
      new Uint8Array([
        ...new TextEncoder().encode('modlpy/utilisuba'),
        ...address,
        ...bnToU8a(args['index'][l], 16).reverse(),
      ])
    )
  );

  if(ethAddress) address = derivativeToEthAddress(derivative);
  else address = derivative;
}

if (ethAddress) {
  console.log(`Moonbeam derivative at index ${args['index']}: ${derivativeToEthAddress(derivative)}`);
} else {
  console.log(`32 Bytes derivative at index ${args['index']}: ${derivative}`);
  console.log(`Encoded: ${encodeAddress(derivative)}`);
}
