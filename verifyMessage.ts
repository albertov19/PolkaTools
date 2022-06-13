// Verify a signed message
import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';
import yargs from 'yargs';

const args = yargs.options({
  msg: { type: 'string', demandOption: true, alias: 'm' },
  'signed-msg': { type: 'string', demandOption: true, alias: 's' },
  address: { type: 'string', demandOption: true, alias: 'a' },
}).argv;

const main = async () => {
  await cryptoWaitReady();

  // create the message, actual signature and verify
  const { isValid } = signatureVerify(args['msg'], args['signed-msg'], args['address']);

  console.log(isValid);
};

main();
