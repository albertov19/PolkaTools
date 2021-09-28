// Import Ethereum Account from Private Key
import Keyring from '@polkadot/keyring';

const keyring = new Keyring({ type: 'ethereum' });

// Define private key
const privateKey = 'private_key';

// Extract address from private key
const otherPair = await keyring.addFromUri(privateKey);
console.log(`Derived Address from Private Key: ${otherPair.address}`);
