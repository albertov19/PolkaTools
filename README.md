# PolkaTools

A comprehensive set of tools for working with the Polkadot API, Substrate chains, and Moonbeam networks.

**Use [PNPM](https://pnpm.io/) to avoid dependency conflicts**

⚠️ **Use at your own risk!**

## Table of Contents

- [Getting Started](#getting-started)
- [Scripts](#scripts)
  - [Account Management](#account-management)
  - [Address Calculations](#address-calculations)
  - [Block and Transaction Analysis](#block-and-transaction-analysis)
  - [Staking and Governance](#staking-and-governance)
  - [Contract and Metadata Management](#contract-and-metadata-management)
  - [Asset Management and Fixes](#asset-management-and-fixes)
  - [Treasury and DCA Operations](#treasury-and-dca-operations)
  - [Cross-Chain Operations](#cross-chain-operations)
  - [Transaction Utilities](#transaction-utilities)
  - [Security and Verification](#security-and-verification)
  - [Specialized Generators](#specialized-generators)
- [Network Support](#network-support)
- [Data Files](#data-files)
- [Security Notice](#security-notice)

## Getting Started

Install packages:

```bash
pnpm install
```

Then, run scripts with `ts-node` for TypeScript files or `python`/`python3` for Python files.

### Example Usage

```bash
# Create ECDSA accounts
ts-node createECDSAAcc.ts --n 5

# Check balance at specific height
ts-node checkBalanceAtHeight.ts

# Calculate multisig address
ts-node calculateMultisigAddress.ts --a '["addr1","addr2"]' --t 2
```

## Scripts

### Account Management

**`createECDSAAcc`** - Creates ECDSA accounts using Polkadot Keyring with Ethereum derivation paths
```bash
ts-node createECDSAAcc.ts --n 5  # Creates 5 ECDSA accounts
```

**`createSR25519Acc`** - Creates SR25519 accounts with a given prefix, saved to JSON file

**`encodeDecodeAddress`** - Simple snippet demonstrating encode and decode functionality for Substrate addresses

**`getAccFromJSON`** - Prints the private key from a JSON file (⚠️ DO NOT SHARE YOUR PRIVATE KEY)

**`getAddressFromMnemonic`** - Derives Ethereum addresses from mnemonic using `m/44/60/0/0/0` derivation path and Substrate addresses with `//hard/soft` derivation

**`getEthAddressFromPrivKey`** - Shows the Ethereum address associated with a private key

### Address Calculations

**`calculateAddressStorageKey`** - Calculates the storage key for an EVM address

**`calculateDerivedAddress`** - Calculates the derivative address of a given index

**`calculateMultisigAddress`** - Calculates multisig addresses based on an array of addresses and threshold
```bash
ts-node calculateMultisigAddress.ts --a '["14gZZ9xc52TKDJA6LmzX7iVBcdPeBNX6B3NkGubKd6pLTcSe","1333RgL47QYYkmJk1BHzfEF4hRE7Bd2Yf8P2HdV8Cn3p9hVh"]' --t 2
```

**`calculateSovereignAccountFundTransfer`** - Calculates sovereign account fund transfers between parachains

### Block and Transaction Analysis

**`checkBalanceAtHeight`** - Checks account balances at a specific block height, saves results to JSON

**`checkBlockFinality`** - Prints the latest finalized block in the provided chain

**`checkTxFinality`** - Checks if a given transaction hash has been finalized (both TypeScript and Python versions)

**`getBlock`** - Gets a Substrate block with a given hash

**`getBalanceEvents`** - Fetches all balance transfer events via the Substrate API

### Staking and Governance

**`getStakingAddress`** - Fetches all staking addresses and their totals for Moonbeam or Moonriver
```bash
ts-node getStakingAddress.ts --network moonbeam
```

**`getStakingData`** - Gets staking data from all collators

**`batchRemoveVotes`** - Batch removes conviction voting for a given sender address
```bash
ts-node batchRemoveVotes.ts --n moonbeam --s 0x1234...
```

**`batchRefundRefDeposits`** - Batch processes referendum deposit refunds

**`batchTxs`** - Executes multiple transactions in batch format

### Contract and Metadata Management

**`addContractMetadata`** - Adds contract metadata for multiple contracts using lazy migrations
```bash
ts-node addContractMetadata.ts --c "0x452bE05439d83D3A6A510F11a4Ba1F1909d1cA6d,0x149f3dDeB5FF9bE7342D07C35D6dA19Df3F790af" --n moonbeam
```

**`setDummyCode`** - Calculates encoded call data to set dummy code for provided precompiles

### Asset Management and Fixes

**`calculateMBRT3100_MRLFix`** - Calculates Moonbeam RT3100 fix for failed Hydration asset transfers

**`calculateMoonbeamHydraDXAssetFix`** - Calculates fixes for Moonbeam HydraDX asset issues

**`calculateMoonbeamRefundPhala`** - Calculates refund operations for Phala transfers on Moonbeam

**`calculateMoonbeamRefundPinkNCTR`** - Calculates refund operations for Pink NCTR tokens on Moonbeam

**`calculateMoonriverXCMDeliveryCalldata`** - Calculates XCM delivery calldata for Moonriver

**`moonbeamAssetMigration`** - Handles asset migration operations on Moonbeam

### Treasury and DCA Operations

**`treasuryDCAHydration`** - Creates Dollar Cost Averaging (DCA) operations from Treasury funds via Hydration
- Transfers GLMR from Treasury to Hydration sovereign account
- Sets up automated DCA trading schedules
- Handles XCM message construction for remote execution

**`treasuryRemoveLPHydration`** - Removes liquidity provider positions from Hydration via Treasury operations

**`treasuryTransferUSDCBack`** - Handles USDC transfer operations back to Treasury

### Cross-Chain Operations

**`getCrowdloanContAddress`** - Retrieves and saves crowdloan rewards information for a given network to JSON

**`nestAsDerivatives`** - Nests derivative calls to multiple levels and provides encoded call data

### Transaction Utilities

**`estimateTxFee`** - Estimates transaction fees for a given call

**`sendSubstrateTx`** - Sends simple transactions using Substrate API (SR25519 accounts only, not for Moonriver!)
⚠️ **Requires origin account mnemonic - Not safe for production!**

**`chopsticks_fakeTx`** - Creates fake transactions for testing with Chopsticks local development environment
```bash
ts-node chopsticks_fakeTx.ts --e ws://127.0.0.1:8000 --s 0x1234...
```

### Security and Verification

**`verifyMessage`** - Verifies signed messages by providing the signer's public address, message, and signature

### Specialized Generators

**`PALTxGenerator`** - Generates Polkadot Assurance Legion multisig transactions

**`PALMonthlyPayoutGenerator`** - Generates monthly payout transactions for Polkadot Assurance Legion

## Requirements

- **Node.js** (v16 or higher recommended)
- **PNPM** package manager
- **TypeScript** for running `.ts` files
- **Python 3** for running `.py` files

Install TypeScript globally if needed:
```bash
npm install -g typescript ts-node
```

## Network Support

Most scripts support the following networks:
- **Moonbeam** (`--n moonbeam`)
- **Moonriver** (`--n moonriver`) 
- **Moonbase Alpha** (`--n moonbase`)

## Data Files

- `accounts.json` - Stores generated account information
- `addresses.json` - Contains address data for various operations
- `misc/` - Directory containing asset data and configuration files:
  - `AHAssets.json` - Asset Hub assets
  - `HydraDXAsset.json` - HydraDX asset configurations
  - `KusamaAssets.json` - Kusama network assets
  - `ParachainKusamaAssets.json` - Parachain-specific Kusama assets

## Configuration

Key configuration files:
- `package.json` - Node.js dependencies and scripts
- `tsconfig.json` - TypeScript compiler configuration
- `requirements.txt` - Python dependencies
- `.gitignore` - Git ignore rules

## Security Notice

⚠️ **CRITICAL SECURITY WARNINGS**

These tools handle private keys and perform on-chain operations. Always follow these security practices:

- ✅ **Test on testnets first** before using on mainnet
- ✅ **Never share private keys** or commit them to version control
- ✅ **Review all transactions** carefully before signing
- ✅ **Use hardware wallets** for production environments when possible
- ✅ **Keep dependencies updated** to patch security vulnerabilities
- ⚠️ **Use at your own risk** - no warranties provided

**Scripts that handle sensitive data:**
- `getAccFromJSON.ts` - Exposes private keys (DO NOT SHARE OUTPUT)
- `sendSubstrateTx.ts` - Requires mnemonic input (NOT SAFE FOR PRODUCTION)
- `createECDSAAcc.ts` & `createSR25519Acc.ts` - Generate and store private keys

## Contributing

Contributions are welcome! Please ensure:
1. Code follows existing patterns and style
2. Add documentation for new scripts in this README
3. Test thoroughly on testnets before submitting
4. Include usage examples for complex operations

## License

Use at your own risk. No warranties provided.

---

**Last Updated:** January 2026
