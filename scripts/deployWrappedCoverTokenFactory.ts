import { WrappedCoveredPrincipalTokenFactory__factory } from "../typechain/factories/WrappedCoveredPrincipalTokenFactory__factory";
import { ethers } from "hardhat";
import * as readline from "readline-sync";
import fs from "fs";
import hre from "hardhat";

// Edit to import the correct version
import goerli from "../addresses/goerli.json";
import mainnet from "../addresses/mainnet.json";
import data from "../artifacts/contracts/Tranche.sol/Tranche.json";

export async function deployWrappedCoveredPrincipalTokenFactory(
  networkAddresses: any,
  networkType: string
) {
  const [signer] = await ethers.getSigners();
  const trancheByteCodeHash = ethers.utils.solidityKeccak256(
    ["bytes"],
    [data.bytecode]
  );
  const signerAddress = await signer.getAddress();
  const wrappedCoveredPrincipalTokenFactoryDeployer = new WrappedCoveredPrincipalTokenFactory__factory(
    signer
  );
  const gas = readline.question("gas price: ");
  console.log("Deploying wrapped covered principal token");
  const wrappedCoveredPrincipalTokenFactoryContract = await wrappedCoveredPrincipalTokenFactoryDeployer.deploy(
    networkAddresses.trancheFactory, // trancheFactory
    trancheByteCodeHash, // trancheBytecodeHash
    {
      maxFeePerGas: ethers.utils.parseUnits(gas, "gwei"),
    }
  );
  await wrappedCoveredPrincipalTokenFactoryContract.deployed();
  console.log(
    "Wrapped covered principal token factory deployed at address: ",
    wrappedCoveredPrincipalTokenFactoryContract.address
  );
  try {
    await hre.run("verify:verify", {
      network: networkType,
      address: wrappedCoveredPrincipalTokenFactoryContract.address,
      constructorArguments: [
        networkAddresses.trancheFactory,
        trancheByteCodeHash,
      ],
    });
  } catch (error) {
    console.log(`Error get from etherscan: ${error}`);
  }

  return wrappedCoveredPrincipalTokenFactoryContract;
}

async function deployWithAddresses(addresses: any, network: string) {
  let newContract = await deployWrappedCoveredPrincipalTokenFactory(
    addresses,
    network
  );
  addresses.wrappedCoveredPrincipalTokenFactory = newContract.address;
  return addresses;
}

async function main() {
  const [signer] = await ethers.getSigners();
  console.log(`Signer of the transaction ${signer.address}`);
  const network = await signer.provider?.getNetwork();
  console.log(`Network on which transaction get executed is ${network}`);
  switch (network?.chainId) {
    case 5: {
      const result = await deployWithAddresses(goerli, "goerli");
      console.log(
        "writing changed address to output file 'addresses/goerli.json'"
      );
      fs.writeFileSync(
        "addresses/goerli.json",
        JSON.stringify(result, null, "\t"),
        "utf8"
      );
      break;
    }
    case 1: {
      const result = await deployWithAddresses(mainnet, "mainnet");
      console.log(
        "writing changed address to output file 'addresses/mainnet.json'"
      );
      fs.writeFileSync(
        "addresses/mainnet.json",
        JSON.stringify(result, null, "\t"),
        "utf8"
      );
      break;
    }
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
