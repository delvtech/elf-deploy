# ELF Deploy

The purpose of this repo is automate the setup of a local testnet to run the elf-contracts.

## How to run

## Install

```bash
npm install
npm run load-contracts
```

## Build

```bash
npm run build
```

## Deploy

The following actions which will be repeated regularly have custom npm scripts. To prepare to deploy you need to load your private key and alchemy api key into env variables, the linux and mac run the following:


```bash
export ALCHEMY_KEY=\YOUR_API_KEY_HERE
export DEPLOYER_PRIVATE_KEY=\YOUR_PRIVATE_KEY_HERE
```

To deploy a new tranche run:

```bash
npm run deployTranche -- --network mainnet
```

To deploy new AMM pools for a tranche run

```bash
npm run deployPool -- --network mainnet
```

To init your pools and set first prices run the following command. We advise that you fund any new pools without many assets and conservative slippage limits to prevent amm sniping bots and other front running attacks that look for new pools in the mempool.

```bash
npm run fundPtPool -- --network mainnet
npm run fundYtPool -- --network mainnet
```

To run any of these commands on the goerli testnet replace `--network mainnet` with `--network goerli`
