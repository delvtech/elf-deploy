'use strict';

const fs = require('fs');
const path = require("path");

// TODO: need to know whether this is goerli or mainnet  

// Read in address file and parse
let rawdata = fs.readFileSync('../addresses/goerli.json');
let addresses = JSON.parse(rawdata);

let safeList = [];

for(let i=0;i<addresses["tranches"]["usdc"].length;i++){
    safeList.push(addresses["tranches"]["usdc"][i]["address"])
}

for(let i=0;i<addresses["tranches"]["weth"].length;i++){
    safeList.push(addresses["tranches"]["weth"][i]["address"])
}

let chainid = 5;  // TODO

let frontend = {
    addresses: {
      balancerVaultAddress: addresses["balancerVault"],
      convergentPoolFactoryAddress: addresses["convergentCurvePoolFactory"],
      trancheFactoryAddress: addresses["trancheFactory"],
      usdcAddress: addresses["tokens"]["usdc"],
      userProxyContractAddress: addresses["userProxy"],
      weightedPoolFactoryAddress: addresses["weightedPoolFactory"],
      wethAddress: addresses["tokens"]["weth"]
    },
    chainId: chainid,
    safelist: safeList
  }
 
let frontendJson = JSON.stringify(frontend, null, 4);
console.log(frontendJson)
fs.writeFileSync('../addresses/frontend.json', frontendJson);
