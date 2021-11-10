#!/bin/bash
echo "# Element Finance Changelog" > foo.md
echo "\n## goerli\n" >> foo.md
cat README.md  | grep goerli | grep -v "##" |sort -V >> foo.md
echo "\n## mainnet\n" >> foo.md
cat README.md  | grep mainnet | grep -v "##" |sort -V >> foo.md
mv foo.md README.md
