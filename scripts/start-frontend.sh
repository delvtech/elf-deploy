#!/bin/bash

echo "Installing and building frontend..."
cd efi-frontend/frontend

# npm ci (stands for "clean install") does not delete node_modules/.bin so we
# delete everything ourselves to have a truly "clean install" >:(
rm -rf node_modules

# Use npm ci to install packages exactly as pinned in package-lock.json
npm ci

echo "starting dev server"
npm start