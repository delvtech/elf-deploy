import hre from "hardhat";
import { BFactory } from "../typechain/BFactory";

export async function deployBalancerFactory() {
  const [signer] = await hre.ethers.getSigners();
  const BFactoryDeployer = await hre.ethers.getContractFactory(
    "BFactory",
    signer
  );
  const bFactoryContract = (await BFactoryDeployer.deploy()) as BFactory;

  await bFactoryContract.deployed();

  return bFactoryContract;
}
