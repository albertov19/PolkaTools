# PolkaTools

Different set of tools with the Polkadot API.

**Use [PNPM](https://pnpm.io/) to avoid dependency conflicts**

**Use at your own risk!**

## Getting Started

Install packages:

```
pnpm install
```

Then, run script with `node` or `python` (`python3`) depending on the file


## Scripts

`calculateAddressStorageKey` calculates the storage key for an EVM address

`calculateDerivedAddress` calculates the derivative address of a given index

`calculateMultisigAddess` calculates a multisig address based on an array of address and a threshold, for example: 

```
ts-node calculateMultisigAddress.ts --a '["14gZZ9xc52TKDJA6LmzX7iVBcdPeBNX6B3NkGubKd6pLTcSe","1333RgL47QYYkmJk1BHzfEF4hRE7Bd2Yf8P2HdV8Cn3p9hVh"]' --t 2
```

`checkBlockFinality` prints the latest finalized block in the provided chain

`checkTxFinality` checks if a given Tx Hash has been finalized (both for `node` or `python`)

`createSR25519Acc` script to create a number of SR25519 with a given prefix, they are saved into a JSON file

`encodeDecodeAddress` simple snippet to show encode and decode functionity for substrate accounts

`estiamteTxFee` estimates the transaction fee for a given call

`getAccFromJSON` prints the private key of a JSON file (DO NOT SHARE YOUR PRIVATE KEY)

`getAddressFromMnemonic` derives the Ethereum address (for a given index) from a mnemonic using the `m/44/60/0/0/0` derivation path and logs the associated private key. Also derives the Substrate generic address with the `//hard/soft` derivation path

`getBalanceEvents` fetches all balance transfer events via the Substrate API

`getBlock` gets a substrate block with a given hash

`getCrowdloanContAddress.` script retrieve and save in a JSON file all Crowdloan rewards information for a given network

`getEthAddressFromPrivKey` shows the Ethereum address associated to a private key

`getStakingAddress` fetches all the addresses that are staking and their total in either `moonbeam` or `moonriver` (input with yargs like `node getStakingAddress.js --network moonbeam`)

`getStakingData` gets staking data from all collators

`nestAsDerivatives` nests as derivative calls to as many levels as desired and provided the encoded call data

`sendSubstrateTx` script to send a simple tx using the Substrate API, only works with SR25519 accounts (not Moonriver!). You need to provide the origin account mnemonic. Not safe for production!

`setDummyCode` calculates the encoded call data to set the dummy code for the provided precompiles

`verifyMessage` verifys a signed message by providing the signers public Address, the message and the signed message

`PALTxGenerator` a specific script that helps generating Polkadot Assurance Legion Multisig transactions
