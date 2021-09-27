// Verify a signed message
import { stringToU8a } from '@polkadot/util';
import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';

const main = async () => {
  await cryptoWaitReady();

  const signedMessage = 'signed_message';

  //const message = stringToU8a('email');
  const message = 'hex_msg';

  const address = 'substrate_address';

  // create the message, actual signature and verify
  const { isValid } = signatureVerify(message, signedMessage, address);

  console.log(isValid);
};

main();
