import {ethers} from "hardhat";
import * as readline from "readline-sync";
import fs from "fs";
import {deployTranche} from "./deployer/deployer";
import hre from "hardhat";
import { Tranche__factory } from "../typechain/factories/Tranche__factory";

// Edit to import the correct version
import goerli from "../addresses/goerli.json";
import mainnet from "../addresses/mainnet.json"
import { WeightedPool__factory } from "../typechain/factories/WeightedPool__factory";

async function deployWithAddresses(addresses: any) {

    if (addresses.trancheFactory == undefined || addresses.trancheFactory == undefined ) {
        console.log("Error: please init tranche factory");
        return;
    }

    const version = (readline.question("version: ")).toLowerCase();
    const wpType = (readline.question("wp type: ")).toLowerCase();
    const assetSymbol = (readline.question("wp underlying symbol: ")).toLowerCase();

    if (addresses.wrappedPositions[version][wpType][assetSymbol] == undefined || addresses.wrappedPositions[version][wpType][assetSymbol] == undefined ) {
        console.log("Error: please init wp");
        return;
    }
    
    const duration = Number.parseInt(readline.question("duration unix seconds: "));

    const data = await deployTranche( {
        wrappedPosition: addresses.wrappedPositions[version][wpType][assetSymbol],
        expirations: [duration], 
        trancheFactory: addresses.trancheFactory, 
    });

    if (addresses.tranches[assetSymbol] == undefined) {
        addresses.tranches[assetSymbol] = [];
    }

    addresses.tranches[assetSymbol].push(
        {
            "expiration": data[0].trancheExpirations[0],
            "address": data[0].trancheAddresses[0],
            "trancheFactory": addresses.trancheFactory
        }
    );

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
    // Verify the tranche
    await hre.run("verify:verify", {
        network: networkName,
        address: data[0].trancheAddresses[0],
        constructorArguments: [],
    })

    // Load the data to verify the interest token
    const trancheFactory = new Tranche__factory(signer);
    const tranche = trancheFactory.attach(data[0].trancheAddresses[0]);
    const yt = await tranche.interestToken();
    const wpFactory = new WeightedPool__factory(signer);
    const wp = wpFactory.attach(addresses.wrappedPositions[wpType][assetSymbol]);
    const wpSymbol = await wp.symbol();
    // Verify the interest token
    await hre.run("verify:verify", {
        network: networkName,
        address: yt,
        constructorArguments: [tranche.address, wpSymbol, data[0].trancheExpirations[0], await tranche.decimals()],
    })

    return addresses;
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