import { Vault__factory } from "../typechain/factories/Vault__factory";
import { Vault } from "../typechain/Vault";
import { ConvergentPoolFactory } from "../typechain/ConvergentPoolFactory";
import { ConvergentPoolFactory__factory } from "../typechain/factories/ConvergentPoolFactory__factory";
import { Signer, BigNumber } from "ethers";
import {ethers} from "hardhat";
import * as readline from "readline-sync";
import fs from "fs";

// Edit to import the correct version
import goerli from "../addresses/goerli.json";
import mainnet from "../addresses/mainnet.json";

export async function deployConvergentPoolFactory(
    signer: Signer,
    balancerVaultContract: Vault,
    fee: BigNumber
  ) {
    const signerAddress = await signer.getAddress();
    const convergentPoolFactoryDeployer = new ConvergentPoolFactory__factory(
      signer
    );
    console.log("Deploying convergent curve pool")
    const convergentPoolFactoryContract = await convergentPoolFactoryDeployer.deploy(
      balancerVaultContract.address,
      signerAddress
    );
    await convergentPoolFactoryContract.deployed();
    console.log("Convergent Curve pool deployed at address: ", convergentPoolFactoryContract.address);

    if (fee.gt(0)) {
        console.log("Setting gov fee");
        const setFeeTx = await convergentPoolFactoryContract.setGovFee(
            fee
          );
        await setFeeTx.wait(1);
    }

    return convergentPoolFactoryContract;
  }

async function deployWithAddresses(addresses: any) {
    if (addresses.balancerVault == undefined || addresses.balancerVault == "") {
        console.log("Error: please init");
        return;
    }
    
    const [signer] = await ethers.getSigners();
    const balancerFactory = new Vault__factory(signer);
    const vault = balancerFactory.attach(addresses.balancerVault);

    const feeString = readline.question("gov fee percent [raw decimal form]: ");
    const feeBN = ethers.utils.parseEther(feeString);
    console.log(feeBN);
    
    let newContract = await deployConvergentPoolFactory(signer, vault, feeBN);
    addresses.convergentCurvePoolFactory = newContract.address;
    return addresses;
}

async function main() {
    let network = readline.question("network: ");
    console.log(network)
    switch(network) {
        case "goerli" : {
            const result = await deployWithAddresses(goerli);
            console.log("writing changed address to output file 'addresses/goerli.json'")
            fs.writeFile('addresses/goerli.json', JSON.stringify(result), 'utf8', () => {});
            break;
        };
        case "mainnet" : {
            await deployWithAddresses(mainnet);
            console.log("writing changed address to output file 'addresses/mainnet.json'")
            fs.writeFile('addresses/mainnet.json', JSON.stringify(mainnet), 'utf8', () => {});
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