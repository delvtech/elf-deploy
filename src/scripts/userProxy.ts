import { Contract, Signer } from "ethers";
import hre from "hardhat";
import { UserProxy } from "types";

export async function deployUserProxy<T extends Contract>(
  signer: Signer,
  wethAddress: string
): Promise<UserProxy> {
  const UserProxyDeployer = await hre.ethers.getContractFactory(
    "UserProxy",
    signer
  );
  const userProxyContract = (await UserProxyDeployer.deploy(
    wethAddress
  )) as UserProxy;

  return userProxyContract;
}
