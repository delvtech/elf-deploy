import { providers } from "ethers";
import * as fs from "fs";
import * as hre from "hardhat";

async function main() {
    // get the network name
    let network = hre.network.name == "hardhat"? "mainnet": hre.network.name;

    // read in address file and parse
    let rawdata = fs.readFileSync("addresses/"+network+".json").toString();
    let addresses = JSON.parse(rawdata);

    let safeList = [];
    // get addresses for safelist
    for (const trancheListKey in addresses["tranches"]) {
        const trancheList = addresses["tranches"][trancheListKey];
        for (const tranche of trancheList) {
            safeList.push(tranche.address)
        }
    }

    let chainid = providers.getNetwork(network).chainId;

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
    };


    let frontendJson = JSON.stringify(frontend, null, 4);
    console.log(frontendJson);
    fs.writeFileSync('addresses/frontend.json', frontendJson,'utf8');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
