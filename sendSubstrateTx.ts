/* Fund Accounts
  Script to send a simple transaction using the Polkadot API
  This script won't work for Moonriver because it uses Ethereum style accounts
  Therefore, Keyring needs to be adapted slightly
  Provide the Account Prefix (1 - Polkadot, 2 - Kusama, 42 - Generic Substrate)
  Provide the origin account mnemonic
  Provide the destination address
  Provide the transfer amount
*/
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { formatBalance } from '@polkadot/util';

// Global Variables
// Account prefix of SR25519 accounts (0 - Polkadot / 2 - Kusama / 42 - Generic Substrate)
const accountPrefix = 42;
//Decimals of the min unit of the network where you are sending the tx
//     Kusama is 12
const decimals = 12;
// Balance to transfer (in units, i.e. KSM)
const transferAmount = 1;
// Calculate the formatted transaction amount
const fmtAmount = formatBalance(
  BigInt(transferAmount * 10 ** decimals),
  { withSi: true, withUnit: 'Unit' },
  decimals
);

// Account funded
const fromMnemonic = 'mnemonic'; //NOT SAFE FOR PRODUCTION
// Accounts to fund
const addressTo = 'addressTo';

// Create a keyring instance with type SR25519 and given prefix (Moonriver uses Ethereum type!)
const keyring = new Keyring({ type: 'sr25519', ss58Format: accountPrefix });

// Create provider
const wsProvider = new WsProvider('wss://wss-relay.testnet.moonbeam.network');

const sendTransfer = async (addressTo, accountFrom, api) => {
  // Transfer to address
  // Nonce: -1 will fetch the nonce from the network
  // We check for finality as well
  const unsub = await api.tx.balances
    .transfer(addressTo, fmtAmount)
    .signAndSend(accountFrom, { nonce: -1 }, ({ status }) => {
      if (status.isFinalized) {
        console.log(`✔️  - Finalized at block hash #${status.asFinalized.toString()}`);
        unsub();
      }
    });

  // Log
  console.log(`💰 - Transfer to ${addressTo}`);
};

const main = async () => {
  // Initialize WASM
  await cryptoWaitReady();

  // Load origin account with keyring from mnemonic
  const accountFrom = keyring.createFromUri(fromMnemonic, {
    name: 'sr25519',
    ss58Format: accountPrefix,
  });

  // Wait for provider
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;

  // Send transfer
  await sendTransfer(addressTo, accountFrom, api);
};

main();
