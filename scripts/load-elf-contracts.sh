#!/bin/bash
rm -rf elf-contracts

echo "Downloading contracts..."
# link/clone and build contracts
if [ ! -z "$1" ] && [ $1="local" ]; then
    ln -sf ../../elf-contracts .
else
    git clone git@github.com:element-fi/elf-contracts.git
fi
