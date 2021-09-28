// Verify a signed message
import { stringToU8a } from '@polkadot/util';
import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';

const main = async () => {
  await cryptoWaitReady();

  const signedMessage =
    '0x1689bf94696757552c0d934585f9f8a56e9341917ab14de5487aa607e1ccdc7a61ce27b29463f8873e0fe65545505967cea5643eb6f6fb9ece40beac73996f86';

  //const message = stringToU8a('email');
  const message = '0x4489c599cf046b2f0fcd32a89e96a4def2345d6f';

  const address = 'Ei6hny8TPztPpF9ZBeKJWD24f4g2GTAVd2pLZwA3XPz7isT';

  // create the message, actual signature and verify
  const { isValid } = signatureVerify(message, signedMessage, address);

  console.log(isValid);
};

main();
