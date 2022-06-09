// Import Ethereum Account from Private Key
import Keyring from "@polkadot/keyring";
import yargs from "yargs";

// Get input arguments
const args = yargs.options({
  pk: { type: "string", demandOption: true, alias: "pk" },
}).argv;

const keyring = new Keyring({ type: "ethereum" });

// Extract address from private key
const otherPair = keyring.addFromUri(args["pk"]);
console.log(`Derived Address from Private Key: ${otherPair.address}`);
