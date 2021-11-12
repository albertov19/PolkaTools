# PolkaTools

Different set of tools with the Polkadot API.

**Use at your own risk!**

## Getting Started

Install packages:

```
yarn
```

Then, run script with `node`.


## Scripts

`getBlock` gets a substrate block with a given hash

`getStakingData` gets staking data from all collators

`getBalanceEvents` fetches all balance transfer events via the Substrate API

`checkBlockFinality` prints the latest finalized block in the provided chain

`checkTxBlockFinality` checks if a given Tx Hash has been finalized

`getAccFromJSON` prints the private key of a JSON file (DO NOT SHARE YOUR PRIVATE KEY)

`getEthAddressFromPrivKey` shows the Ethereum address associated to a private key

`getEthAddressFromMnemonic` derives the Ethereum address (for a given index) from a mnemonic using the `m/44/60/0/0/0` derivation path. Also logs the associated private key

`verifyMessage` verifys a signed message by providing the signers public Address, the message and the signed message

`createSR25519Acc` script to create a number of SR25519 with a given prefix, they are saved into a JSON file

`sendSubstrateTx` script to send a simple tx using the Substrate API, only works with SR25519 accounts (not Moonriver!). You need to provide the origin account mnemonic. Not safe for production!

`getCrowdloanContAddress.` script retrieve and save in a JSON file all Crowdloan rewards information for a given network