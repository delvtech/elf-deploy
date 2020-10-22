#!/bin/bash

source elf.env
rm -rf elf-contracts

echo "Download contracts..."
# link/clone and build contracts
if [ ! -z "$1" ] && [ $1="local" ]; then
    ln -sf ../../elf-contracts . 
else
    git clone git@github.com:element-fi/elf-contracts.git 
fi

echo "Build contracts..."
cd elf-contracts && make init && make build
cd ../
ln -sf elf-contracts/out .
ln -sf elf-contracts/scripts/deploy.sh .
sh deploy.sh

rm -f $LOCALNET_DIR/passwd
rm -f $LOCALNET_DIR/keystore/*
rm -f $LOCALNET_DIR/.sethrc
cp $LOCALNET_DIR/0x5ff0fc256b230e974f3ea67eee1b1239b97a4aa7.passwd $LOCALNET_DIR/passwd
cp $LOCALNET_DIR/0x5ff0fc256b230e974f3ea67eee1b1239b97a4aa7.keystore/UTC--2020-10-19T15-54-33.636966000Z--5ff0fc256b230e974f3ea67eee1b1239b97a4aa7 $LOCALNET_DIR/keystore/
cp $LOCALNET_DIR/0x5ff0fc256b230e974f3ea67eee1b1239b97a4aa7.sethrc $LOCALNET_DIR/.sethrc
ln -sf $LOCALNET_DIR/.sethrc .



