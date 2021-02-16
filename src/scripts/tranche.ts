import { Signer } from "ethers";
import { Elf, Tranche } from "types";

import { Tranche__factory } from "../types";

export async function deployTranche(elfContract: Elf, signer: Signer) {
  const TrancheDeployer = new Tranche__factory(signer);
  const trancheContract = await TrancheDeployer.deploy(
    elfContract.address,
    86400 // time length of tranche in seconds
  );

  return trancheContract;
}
