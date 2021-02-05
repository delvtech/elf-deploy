# ELF Deploy

The purpose of this repo is automate the setup of a local testnet to run the elf-contracts.

### How to run

Clone the repo

```bash
$ git clone git@github.com:element-fi/elf-deploy.git
```

Install npm packages

```bash
$ npm install
```

Compile the contracts

```bash
$ npx hardhat compile
```

Run the Hardhat Runtime Environment

```bash
$ npx hardhat node
```

(This makes a local testnet at http://localhost:8545/ and chain id 31337)

Deploy the contracts

```bash
$ npx hardhat run scripts/main.ts --network localhost
```

Now all the contracts are loaded to the local testnet!
