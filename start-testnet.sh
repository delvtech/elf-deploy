#!/bin/bash

source elf.env

# copy localnet config to snapshots folder
ln -sf $LOCALNET_DIR $HOME/.dapp/testnet/snapshots/

# launch network
dapp testnet --load=localnet
