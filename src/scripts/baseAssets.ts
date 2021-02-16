import { Signer } from "ethers";
import { USDC, WETH } from "types";
import { USDC__factory, WETH__factory } from "../types";

export async function deployBaseAssets(signer: Signer): Promise<[WETH, USDC]> {
  const signerAddress = await signer.getAddress();

  const wethDeployer = new WETH__factory(signer);
  const wethContract = await wethDeployer.deploy(signerAddress);
  await wethContract.deployed();

  const usdcDeployer = new USDC__factory(signer);
  const usdcContract = await wethDeployer.deploy(signerAddress);
  await usdcContract.deployed();

  return [wethContract, usdcContract];
}
