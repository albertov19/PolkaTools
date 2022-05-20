import { blake2AsU8a, encodeAddress, decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex, hexToU8a, bnToU8a } from '@polkadot/util';

import yargs from 'yargs';

const args = yargs.options({
    address: { type: 'string', demandOption: true, alias: 'a' },
    index: { type: 'number', demandOption: true, alias: 'i' },
}).argv;

// If address does not start with 0x - decode it
let address = args['address'];
let ethAddress = address.length === 42;
if (!(address.substring(0, 1) == '0x') && !ethAddress) {
    address = decodeAddress(address);
} else {
    address = hexToU8a(address);
}

// Calculate Derivative Address of Given Index
const derivative = u8aToHex(
    blake2AsU8a(
        new Uint8Array([
            ...new TextEncoder().encode('modlpy/utilisuba'),
            ...address,
            ...bnToU8a(args['index'], 16),
        ])
    )
);

if (!ethAddress) {
    console.log(`32 Bytes derivative at index ${args['index']}: ${derivative}`);
    console.log(`Encoded: ${encodeAddress(derivative)}`);
} else {
    console.log(`Moonbeam derivative at index ${args['index']}: ${derivative.slice(0, 42)}`);
}
