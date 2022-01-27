import { WrappedCoveredPrincipalTokenFactory } from "../typechain/WrappedCoveredPrincipalTokenFactory";
import { WrappedCoveredPrincipalTokenFactory__factory } from "../typechain/factories/WrappedCoveredPrincipalTokenFactory__factory";
import { WrappedCoveredPrincipalToken } from "../typechain/WrappedCoveredPrincipalToken";
import { ethers } from "hardhat";
import * as readline from "readline-sync";
import fs from "fs";
import hre from "hardhat";

// Edit to import the correct version
import goerli from "../addresses/goerli.json";
import mainnet from "../addresses/mainnet.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import data from "../artifacts/contracts/Tranche.sol/Tranche.json";

export async function createWrappedCoveredPrincipalToken(
  networkAddresses: any,
  networkType: string,
  factory: WrappedCoveredPrincipalTokenFactory,
  signer: SignerWithAddress
) {
  const trancheByteCodeHash = ethers.utils.solidityKeccak256(
    ["bytes"],
    [data.bytecode]
  );
  const gas = readline.question("gas price: ");
  const baseToken = readline.question(
    "Please provide the base token string ex - dai, weth or usdc: "
  );
  const ownerAddress = readline.question(
    "Please provide the owner of the wrapped covered principal token: "
  );
  if (!ethers.utils.isAddress(ownerAddress)) {
    console.log(
      `Provided owner address i.e ${ownerAddress} is an invalid address`
    );
    process.exit(1);
  }
  if (networkAddresses.tokens[`${baseToken}`] == null) {
    console.log(
      `Provided base token i.e ${baseToken} doesn't exists in the ${networkType}'s token list`
    );
    process.exit(1);
  }
  const previousList = await factory.allWrappedCoveredPrincipalTokens();
  const baseTokenAddress = networkAddresses.tokens[`${baseToken}`];
  console.log("Base Token address -", baseTokenAddress);
  console.log("Deploying wrapped covered principal token");
  const tx = await factory.create(
    baseTokenAddress, // Base token address
    ownerAddress, // Owner address
    {
      maxFeePerGas: ethers.utils.parseUnits(gas, "gwei"),
    }
  );
  await tx.wait(2);
  const newList = await factory.allWrappedCoveredPrincipalTokens();
  let wcptoken;
  if (previousList.length == 0) {
    wcptoken = newList[0];
  } else {
    for (let i = 0; i < newList.length; i++) {
      if (!previousList.includes(newList[i])) {
        wcptoken = newList[i];
        break;
      }
    }
  }
  console.log(
    "Wrapped covered principal token deployed at address: ",
    wcptoken
  );
  try {
    await hre.run("verify:verify", {
      network: networkType,
      address: wcptoken,
      constructorArguments: [
        baseTokenAddress,
        ownerAddress,
        networkAddresses.trancheFactory,
        trancheByteCodeHash,
      ],
    });
  } catch (error) {
    console.log(`Error get from etherscan: ${error}`);
  }

  return [wcptoken, baseToken];
}

async function deployWithAddresses(addresses: any, network: string) {
  const [signer] = await ethers.getSigners();
  const wcptFactoryAddress = addresses.wrappedCoveredPrincipalTokenFactory;
  const wcptFactoryContract = WrappedCoveredPrincipalTokenFactory__factory.connect(
    wcptFactoryAddress,
    signer
  );
  const result = await createWrappedCoveredPrincipalToken(
    addresses,
    network,
    wcptFactoryContract,
    signer
  );
  if (addresses.wrappedCoveredPrincipalToken == undefined) {
    addresses.wrappedCoveredPrincipalToken = {};
  }
  addresses.wrappedCoveredPrincipalToken[`${result[1]}`] = result[0];
  return addresses;
}

async function main() {
  const [signer] = await ethers.getSigners();
  const network = await signer.provider?.getNetwork();
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
