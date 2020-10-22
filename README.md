# ELF Deploy

The purpose of this repo is automate the setup of a local testnet to run the elf-contracts.

### Prerequisites

- [nix](https://nixos.org/download.html)
- [dapp.tools](https://dapp.tools/)
- [npm](https://nodejs.org/en/download/)

### How to run

Clone the repo

```bash
$ git clone git@github.com:element-fi/elf-deploy.git 
```

### Terminal #1 

From the elf-deploy directory run:

```bash
$ sh start-testnet.sh 

dapp-testnet:   RPC URL: http://127.0.0.1:8545
dapp-testnet:  TCP port: 38545
dapp-testnet:  Chain ID: 99
dapp-testnet:  Database: /Users/foo/.dapp/testnet/8545
dapp-testnet:  Geth log: /Users/foo/.dapp/testnet/8545/geth.log
dapp-testnet:   Account: 0x146fD81a56d10e86bBA3dcAb2772192428eB65f2 (default)
```

### Terminal #2

From the elf-deploy directory run:

```bash
$ sh deploy-contracts.sh

ELF_DEPLOY=0x2CF8042b6579084583A9F2da0ADC1ba34781ee24

Deploying contracts...
seth-send: Published transaction with 4 bytes of calldata.
seth-send: 0x54cca22f5a6a0e9fd9fec16f8e8fa4ddfaa7014c298f9319b809d5e3acc7d082
seth-send: Waiting for transaction receipt...
seth-send: Transaction included in block 2.

ELF=0xddc0543eBD9b9DD61222407d95Ce5eB9A32e3560

Configuring contracts...
seth-send: Published transaction with 4 bytes of calldata.
seth-send: 0x87a9c6e02eaceb69b39e27835ed615bd2555bcf4bfc10337ac3bcc3d97f8f343
seth-send: Waiting for transaction receipt...
seth-send: Transaction included in block 3.
Fund user account...
seth-send: Published transaction with 0 bytes of calldata.
seth-send: 0x619710378e4a36e854a8afcfefaa4317f1c5319757df31c3bfac577bd39eae49
seth-send: Waiting for transaction receipt...
seth-send: Transaction included in block 4.
```

Once the contracts have deployed, you can interact with them from the command line.  You will need the address of the ELF contract from the output of Terminal #2

### Terminal #3 

From the elf-deploy/.workingdir directory run:

```bash
# store the ELF contract address displayed in the previous step
$ export ELF=0xddc0543eBD9b9DD61222407d95Ce5eB9A32e3560

# deposit eth
$ seth send --gas 5000000 --value 1024 $ELF "depositETH()"

# query contract balance
$ seth call $ELF "balance()"

# query the ERC20's totalSupply
$ seth call $ELF "totalSupply()"

# withdraw half of the eth
$ seth send --gas 5000000 $ELF "withdrawETH(uint256)" 512

# query contract balance (should be half the previous value)
$ seth call $ELF "balance()"

# query the ERC20's totalSupply (should be half the previous value)
$ seth call $ELF "totalSupply()"
```
