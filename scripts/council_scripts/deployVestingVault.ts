import {ethers} from "hardhat";
import * as readline from "readline-sync";
import fs from "fs";
import {deployVestingVault} from "./deployer/deployer";
import hre from "hardhat";

// Edit to import the correct version
import goerli from "../../addresses/goerli.json";
import mainnet from "../../addresses/mainnet.json"

async function deployWithAddresses(addresses: any) {
    const token_address = (readline.question("token address: ")).toLowerCase();
    const stale_block_number = Number.parseInt(readline.question("stale block number: "))

    const vestingVaultAddress = await deployVestingVault( {
        token: token_address,
        stale: stale_block_number
    });
    
    // We auto verify on etherscan
    const [signer] = await ethers.getSigners();
    const network = await signer.provider?.getNetwork();
    let networkName;
    switch(network?.chainId) {
        case 5 : {
            networkName = "goerli"
            break;
        };
        case 1 : {
            networkName = "mainnet"
            break;
        };
        default: {
            console.log("Unsupported network");
        }
    }

    // Verify the token
    console.log(networkName)
    await hre.run("verify:verify", {
        network: networkName,
        address: vestingVaultAddress,
        constructorArguments: [token_address, stale_block_number],
    })

    return addresses;
}

async function main() {
    const [signer] = await ethers.getSigners();
    const network = await signer.provider?.getNetwork();
    switch(network?.chainId) {
        case 5 : {
            const result = await deployWithAddresses(goerli);
            break;
        };
        case 1 : {
            const result = await deployWithAddresses(mainnet);
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