import { ethers } from "hardhat";
import hre from "hardhat";
import { Signer } from "ethers";
import * as readline from "readline-sync";
import { DeploymentValidator__factory } from "typechain/factories/DeploymentValidator__factory";

export async function deployValidator(
    signer: Signer,
    ownerAddress: string
) {
    const validatorDeployer = new DeploymentValidator__factory(signer);

    const gas = readline.question("tranche gasPrice: ");
    console.log("Deploying deployment validator contract");
    const validatorContract = await validatorDeployer.deploy(
        ownerAddress,
        {
            maxFeePerGas: ethers.utils.parseUnits(gas, "gwei"),
        }
    )
    console.log("deploymentValidator contract deployed a ", validatorContract.address);

    try {
        await hre.run("verify:verify", {
            network: "mainnet",
            address: validatorContract.address,
            constructorArguments: [ownerAddress],
        });
    } catch (error) {
        console.log("Couldn't verify validator contract", error);
    }

    return validatorContract;
}

async function main() {
    const [signer] = await ethers.getSigners();
    const ownerAddress = "0x422494292e7a9Dda8778Bb4EA05C2779a3d60f5D";
    const result = await deployValidator(signer, ownerAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
