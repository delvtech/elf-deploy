#!/bin/bash

source elf.env

rm -rf $HOME/.dapp/testnet
mkdir -p $HOME/.dapp/testnet/snapshots


# copy localnet config to snapshots folder
unlink -f $HOME/.dapp/testnet/snapshots/localnet
ln -sf $LOCALNET_DIR $HOME/.dapp/testnet/snapshots/

# launch network
dapp testnet --load=localnet
