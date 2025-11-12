import { blake2AsU8a, encodeAddress, decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex, hexToU8a, bnToU8a } from "@polkadot/util";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type Args = {
  address: string;
  index: number[];
};

const args = yargs(hideBin(process.argv))
  .options({
    address: { type: "string", demandOption: true, alias: "a", describe: "SS58 or 0x ETH" },
    index: {
      type: "number",
      array: true,
      demandOption: true,
      alias: "i",
      describe: "One or more u16 indices",
      coerce: (vals: unknown) => {
        const arr = (Array.isArray(vals) ? vals : [vals]).map(Number);
        for (const v of arr) {
          if (!Number.isInteger(v) || v < 0 || v > 65535) {
            throw new Error(`Index ${v} must be an integer in 0..65535`);
          }
        }
        return arr;
      }
    }
  })
  .strict()
  .parseSync() as Args;

const isEth = /^0x[0-9a-fA-F]{40}$/.test(args.address);
const seed = new TextEncoder().encode("modlpy/utilisuba");

const toEth40 = (hex: string) => hex.slice(0, 42); // keep 0x + 40 chars

let keyU8a: Uint8Array = isEth ? hexToU8a(args.address) : decodeAddress(args.address);

for (const idx of args.index) {
  const idxLE = bnToU8a(idx, { bitLength: 16, isLe: true });

  const derivativeU8a = blake2AsU8a(
    new Uint8Array([...seed, ...keyU8a, ...idxLE]),
    256
  );

  const derivativeHex = u8aToHex(derivativeU8a);

  if (isEth) {
    const ethLike = toEth40(derivativeHex);
    console.log(`Moonbeam derivative at index ${idx}: ${ethLike}`);
    keyU8a = hexToU8a(ethLike); // feed into next iteration
  } else {
    console.log(`32-byte derivative at index ${idx}: ${derivativeHex}`);
    console.log(`Encoded (SS58): ${encodeAddress(derivativeU8a)}`);
    keyU8a = derivativeU8a; // feed into next iteration
  }
}
