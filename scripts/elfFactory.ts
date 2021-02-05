import { Contract, Signer } from "ethers";
import hre from "hardhat";

import { ElfFactory } from "../typechain";

export async function deployElfFactory<T extends Contract>(
  signer: Signer
): Promise<ElfFactory> {
  const ElfFactoryDeployer = await hre.ethers.getContractFactory(
    "ElfFactory",
    signer
  );
  const elfFactoryContract = (await ElfFactoryDeployer.deploy()) as ElfFactory;

  return elfFactoryContract;
}
