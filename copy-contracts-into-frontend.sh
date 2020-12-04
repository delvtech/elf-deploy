#!/bin/bash

CONTRACTS_JSON_SOURCE=./localnet/out/contracts.json
CONTRACTS_JSON_DESTINATION=./frontend/efi-frontend/frontend/src/contracts.json

rm -f "$CONTRACTS_JSON_DESTINATION"
cp "$CONTRACTS_JSON_SOURCE" "$CONTRACTS_JSON_DESTINATION"