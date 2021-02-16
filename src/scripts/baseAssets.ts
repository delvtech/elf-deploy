import { Signer } from "ethers";
import hre from "hardhat";
import { USDC, WETH } from "types";

export async function deployBaseAssets(signer: Signer): Promise<[WETH, USDC]> {
  const signerAddress = await signer.getAddress();
  const wethDeployer = await hre.ethers.getContractFactory("WETH");
  const wethContract = (await wethDeployer.deploy(signerAddress)) as WETH;

  const usdcContractDeployer = await hre.ethers.getContractFactory("USDC");
  const usdcContract = (await usdcContractDeployer.deploy(
    signerAddress
  )) as USDC;

  return [wethContract, usdcContract];
}
