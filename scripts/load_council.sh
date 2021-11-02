
#!/bin/bash
# Directly cloned from the script in elf frontend
rm -rf council

echo "Downloading contracts..."
# link/clone and build contracts
if [ ! -z "$1" ] && [ $1="local" ]; then
    ln -sf ../../council .
else
    git clone https://github.com/element-fi/council.git
fi

echo "Copying latest contracts..."
mv council/contracts contracts/council

echo "Removing unused element code"
rm -rf council

echo "Done!"