import { Signer } from "ethers";
import hre from "hardhat";

export enum SIGNER {
  ELEMENT,
  USER,
}

export async function getSigner(signer: SIGNER): Promise<Signer> {
  const signers = await hre.ethers.getSigners();
  return signers[signer];
}
