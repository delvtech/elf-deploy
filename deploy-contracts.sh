#!/bin/bash

source elf.env

# link/clone and build contracts
if [ $1="local" ]; then
    ln -sf ../../elf-contracts . 
else
    git clone git@github.com:element-fi/elf-contracts.git 
fi

cd elf-contracts && make init && make build 
cd ../
ln -sf elf-contracts/out .
ln -sf elf-contracts/scripts/deploy.sh .
sh deploy.sh



