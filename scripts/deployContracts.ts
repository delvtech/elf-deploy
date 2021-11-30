import {
    UserProxyData,
    WrappedPositionData,
    TrancheData,
    deployTranche,
    deployUserProxy,
    deployWrappedPosition
  } from "./deployer/deployer";
  import { ethers } from "hardhat";
  import * as readline from "readline-sync";
  import fs from "fs";
  import data from "../artifacts/contracts/Tranche.sol/Tranche.json";

  import goerli from "../addresses/goerli.json";
  import mainnet from "../addresses/mainnet.json";

  // An example of deplying a contract using the deployer. This deploys the user Proxy.
  async function deployWithAddresses(addresses: any) {
    const data = {
        name: "element yvUSDC",
        symbol: "yvUSDC",
        underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        vault: "0xa354F35829Ae975e850e23e9615b11Da1B3dC4DE"
    };
    await deployWrappedPosition(data, true);
    //   const weth = addresses.tokens.weth
    //   const trancheFactory = addresses.trancheFactory
    //   const trancheBytecodeHash = ethers.utils.solidityKeccak256(
    //     ["bytes"],
    //     [data.bytecode]
    // );

    // const userProxyDeployData: UserProxyData = {
    //     weth,
    //     trancheFactory,
    //     trancheBytecodeHash
    // }
    // const proxyAddress = await deployUserProxy(userProxyDeployData);
    // addresses.userProxy = proxyAddress
    // console.log(proxyAddress)
    return addresses
}


async function main() {
    const [signer] = await ethers.getSigners();
    const network = await signer.provider?.getNetwork();
    switch(network?.chainId) {
        case 5 : {
            const result = await deployWithAddresses(goerli);
            console.log("writing changed address to output file 'addresses/goerli.json'")
            fs.writeFileSync('addresses/goerli.json', JSON.stringify(result, null, '\t'), 'utf8');
            break;
        };
        case 1 : {
            const result = await deployWithAddresses(mainnet);
            console.log("writing changed address to output file 'addresses/mainnet.json'")
            fs.writeFileSync('addresses/mainnet.json', JSON.stringify(result, null, '\t'), 'utf8');
            break;
        };
        default: {
            console.log("Unsupported network");
        }
    }
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });