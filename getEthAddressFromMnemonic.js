// Import Ethereum Account from Private Key
import Keyring from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';
import { mnemonicToLegacySeed, hdEthereum } from '@polkadot/util-crypto';

const keyring = new Keyring({ type: 'ethereum' });

// Import from Mnemonic
const mnemonic = 'mnemonic';
// Define index of the derivation path and the derivation path
const index = 0;
const derivationPath = "m/44'/60'/0'/0/" + index;
console.log(`Mnemonic: ${mnemonic}`);
console.log(`Derivation Path: ${derivationPath}`);

// Extract address from mnemonic
const newPair = keyring.addFromUri(`${mnemonic}/${derivationPath}`);
console.log(`Derived Address from Mnemonic: ${newPair.address}`);

// Extract private key from mnemonic
const privateKey = u8aToHex(
  hdEthereum(mnemonicToLegacySeed(mnemonic, '', false, 64), derivationPath).secretKey
);
console.log(`Derived Private Key from Mnemonic: ${privateKey}`);
