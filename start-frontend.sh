#!/bin/bash

pushd frontend
rm -rf efi-frontend

# link/clone frontend
if [ ! -z "$1" ] && [ $1="local" ]; then
    echo "--local flag detected, symlinking to ../../efi-frontend"
    ln -sf ../../efi-frontend .
else
    echo "Cloning efi-frontend repo..."
    git clone git@github.com:element-fi/efi-frontend.git
fi
popd

echo "Copying over contracts.json"
# TODO: fix this to copy address.json, typechain, etc
# sh copy-contracts-into-frontend.sh

echo "Installing and building frontend..."
pushd frontend/efi-frontend/frontend

# npm ci (stands for "clean install") does not delete node_modules/.bin so we
# delete everything ourselves to have a truly "clean install" >:(
rm -rf node_modules

# Use npm ci to install packages exactly as pinned in package-lock.json
npm ci

echo "starting dev server"
npm start