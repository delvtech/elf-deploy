import { Signer, BigNumber } from "ethers";
import {ethers} from "hardhat";
import * as readline from "readline-sync";
import fs from "fs";
import {deployTranche} from "./deployer/deployer";

// Edit to import the correct version
import goerli from "../addresses/goerli.json";
import mainnet from "../addresses/mainnet.json"

async function deployWithAddresses(addresses: any) {

    if (addresses.trancheFactory == undefined || addresses.trancheFactory == undefined ) {
        console.log("Error: please init tranche factory");
        return;
    }

    const wpType = (readline.question("wp type: ")).toLowerCase();
    const assetSymbol = (readline.question("wp underlying symbol: ")).toLowerCase();

    if (addresses.wrappedPositions[wpType][assetSymbol] == undefined || addresses.wrappedPositions[wpType][assetSymbol] == undefined ) {
        console.log("Error: please init wp");
        return;
    }
    
    const duration = Number.parseInt(readline.question("duration unix seconds: "));

    const data = await deployTranche( {
        wrappedPosition: addresses.wrappedPositions[wpType][assetSymbol],
        expirations: [duration], 
        trancheFactory: addresses.trancheFactory, 
    });

    addresses.tranches[assetSymbol].push(
        {
            "expiration": data[0].trancheExpirations[0],
            "address": data[0].trancheAddresses[0]
        }
    );

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