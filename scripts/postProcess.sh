#!/bin/bash

if [ $1 = "mainnet" ]; then
    WRITE_CHANGELOG=1 npm run processAddresses -- --network mainnet
    npm run processAddresses -- --network goerli
elif [ $1 = "goerli" ]; then
    WRITE_CHANGELOG=1 npm run processAddresses -- --network goerli
    npm run processAddresses -- --network mainnet
fi
