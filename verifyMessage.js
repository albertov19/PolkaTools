// Verify a signed message

import { stringToU8a, u8aToHex } from '@polkadot/util';
import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/api';

const accountPrefix = 2;
const keyring = new Keyring({ type: 'sr25519', ss58Format: accountPrefix });

const main = async () => {
  await cryptoWaitReady();

  const signedMessage = 'signed_message';

  const message = stringToU8a('email');

  const address = 'KusamaAddress';

  // create the message, actual signature and verify
  const { isValid } = signatureVerify(message, signedMessage, address);

  console.log(isValid);
};

main();
