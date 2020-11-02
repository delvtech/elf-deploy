#!/bin/bash
cd localnet
# launch network
ganache-cli  --account_keys_path="./keystore/keys.json" --mnemonic="foo" --gasLimit=9007199254740991 --allowUnlimitedContractSize --defaultBalanceEther=18014398509481 --accounts=1 --chainId=99 --verbose
