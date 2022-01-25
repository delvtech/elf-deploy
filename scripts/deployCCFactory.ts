import { Vault__factory } from "../typechain/factories/Vault__factory";
import { Vault } from "../typechain/Vault";
import { ConvergentPoolFactory__factory } from "../typechain/factories/ConvergentPoolFactory__factory";
import { Signer, BigNumber } from "ethers";
import {ethers} from "hardhat";
import * as readline from "readline-sync";
import fs from "fs";
import hre from "hardhat";

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
    const gas = readline.question("gas price: ");
    console.log("Deploying convergent curve pool")
    const convergentPoolFactoryContract = await convergentPoolFactoryDeployer.deploy(
      balancerVaultContract.address,
      signerAddress,
      {
        maxFeePerGas: ethers.utils.parseUnits(gas, 'gwei')
      }
    );
    await convergentPoolFactoryContract.deployed();
    console.log("Convergent Curve pool deployed at address: ", convergentPoolFactoryContract.address);

    await hre.run("verify:verify", {
      network: "mainnet",
      address: balancerVaultContract.address,
      constructorArguments: [balancerVaultContract.address, signerAddress],
    })

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
    
    let newContract = await deployConvergentPoolFactory(signer, vault, feeBN);
    addresses.convergentCurvePoolFactory = newContract.address;
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