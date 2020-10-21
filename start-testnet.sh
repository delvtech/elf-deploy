#!/bin/bash

source elf.env

mkdir -p $HOME/.dapp/testnet/snapshots

# copy localnet config to snapshots folder
ln -sf $LOCALNET_DIR $HOME/.dapp/testnet/snapshots/

# launch network
dapp testnet --load=localnet
