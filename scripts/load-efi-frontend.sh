#!/bin/bash

rm -rf efi-frontend

# link/clone frontend
if [ ! -z "$1" ] && [ $1="local" ]; then
    echo "--local flag detected, symlinking to ../../efi-frontend"
    ln -sf ../../efi-frontend .
else
    echo "Cloning efi-frontend repo..."
    git clone git@github.com:element-fi/efi-frontend.git
fi
