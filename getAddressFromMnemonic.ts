// Import Ethereum Account from Private Key
import Keyring from "@polkadot/keyring";
import { u8aToHex } from "@polkadot/util";
import { mnemonicToLegacySeed, hdEthereum, cryptoWaitReady } from "@polkadot/util-crypto";
import yargs from "yargs";

const args = yargs.options({
  mnemonic: { type: "string", demandOption: true, alias: "m" },
  index: { type: "string", demandOption: true, alias: "i" },
}).argv;

const keyringSR25519 = new Keyring({ type: "sr25519" });
const keyringECDSA = new Keyring({ type: "ethereum" });

// Import from Mnemonic
// Define the derivation path
const ethDerPath = "m/44'/60'/0'/0/" + args["index"];
const subsDerPath = "//hard/soft";
console.log(`Mnemonic: ${args["mnemonic"]}`);
console.log(`--------------------------\n`);

const main = async () => {
  await cryptoWaitReady();

  // Extract Eth address from mnemonic
  const newPairEth = keyringECDSA.addFromUri(`${args["mnemonic"]}/${ethDerPath}`);
  console.log(`Ethereum Derivation Path: ${ethDerPath}`);
  console.log(`Derived Ethereum Address from Mnemonic: ${newPairEth.address}`);

  // Extract private key from mnemonic
  const privateKey = u8aToHex(
    hdEthereum(mnemonicToLegacySeed(args["mnemonic"], "", false, 64), ethDerPath).secretKey
  );
  console.log(`Derived Private Key from Mnemonic: ${privateKey}`);
  console.log(`--------------------------\n`);

  // Extract Substrate address from mnemonic
  const newPairSubstrate = keyringSR25519.addFromUri(`${args["mnemonic"]}${subsDerPath}`);
  console.log(`Substrate Derivation Path: ${subsDerPath}`);
  console.log(`Derived Generic Substrate Address from Mnemonic: ${newPairSubstrate.address}`);
};

main();
