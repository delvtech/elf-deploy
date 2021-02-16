import { Contract, Signer } from "ethers";
import hre from "hardhat";
import { ElfFactory } from "types";

import { ElfFactory__factory } from "../types";

export async function deployElfFactory<T extends Contract>(
  signer: Signer
): Promise<ElfFactory> {
  const ElfFactoryDeployer = new ElfFactory__factory(signer);
  const elfFactoryContract = await ElfFactoryDeployer.deploy();

  return elfFactoryContract;
}
