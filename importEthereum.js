// Import Ethereum Account from Private Key
import Keyring from '@polkadot/keyring';

const keyring = new Keyring({ type: 'ethereum' });
const ethan = await keyring.addFromUri('priv_key');

console.log(ethan);
