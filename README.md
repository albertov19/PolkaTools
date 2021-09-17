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

`checkBlockFinality` prints the latest finalized block in the provided chain

`getAccFromJSON` prints the private key of a JSON file (DO NOT SHARE YOUR PRIVATE KEY)

`importEthereum` shows the Ethereum address associated to a private key

`verifyMessage` verifys a signed message by providing the signers public Address, the message and the signed message

`createSR25519Acc` script to create a number of SR25519 with a given prefix, they are saved into a JSON file

`sendSubstrateTx` script to send a simple tx using the Polkadot API, only works with SR25519 accounts (not Moonriver!). You need to provide the origin account mnemonic. Not safe for production!