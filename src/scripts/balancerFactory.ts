import { Signer } from "ethers";

import { BFactory__factory } from "../types";

export async function deployBalancerFactory(signer: Signer) {
  const bFactoryDeployer = new BFactory__factory(signer);
  const bFactoryContract = await bFactoryDeployer.deploy();

  await bFactoryContract.deployed();

  return bFactoryContract;
}
