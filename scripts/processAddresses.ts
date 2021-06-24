import { providers } from "ethers";
import * as fs from "fs";
import * as hre from "hardhat";
import * as readline from "readline-sync";


async function main() {
    // get the network name
    let network = hre.network.name == "hardhat"? "mainnet": hre.network.name;

    // read in address file and parse
    let rawdata = fs.readFileSync("addresses/"+network+".json").toString();
    let addressesFile = JSON.parse(rawdata);

    let safeList = [];
    let baseAssets = [];
    // get addresses for safelist
    for (const trancheListKey in addressesFile["tranches"]) {
        baseAssets.push(trancheListKey);
        const trancheList = addressesFile["tranches"][trancheListKey];
        for (const tranche of trancheList) {
            safeList.push(tranche.address)
            safeList.push(tranche.ptPool.address)
            safeList.push(tranche.ytPool.address)
        }
    }

    let chainid = providers.getNetwork(network).chainId;

    let addresses: any = {}
    // add the rest of the known address types
    addresses = {
        balancerVaultAddress: addressesFile["balancerVault"],
        convergentPoolFactoryAddress: addressesFile["convergentCurvePoolFactory"],
        trancheFactoryAddress: addressesFile["trancheFactory"],
        userProxyContractAddress: addressesFile["userProxy"],
        weightedPoolFactoryAddress: addressesFile["weightedPoolFactory"],
    }

    // add base asset tokens
    for (const baseAsset of baseAssets) {
        const keyName = baseAsset+"Address"
        addresses[keyName]=addressesFile["tokens"][baseAsset]
    }

    // frontend json structure
    let frontend = {
        addresses: addresses,
        chainId: chainid,
        safelist: safeList
    };

    let frontendJson = JSON.stringify(frontend, null, 4);
    console.log(frontendJson);
    fs.writeFileSync('addresses/frontend-'+network+'.json', frontendJson,'utf8');

    // get release version
    const releaseVersion = readline.question("Release Version (e.g. vX.X.X:X): ");
    fs.mkdirSync("changelog/releases/"+network+"/"+releaseVersion, { recursive: true })
    fs.copyFileSync("addresses/"+network+".json","changelog/releases/"+network+"/"+releaseVersion+"/addresses.json")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
