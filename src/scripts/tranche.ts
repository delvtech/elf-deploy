import { Signer } from "ethers";
import { Elf, Tranche } from "types";

import { Tranche__factory } from "../types";

const ONE_DAY_IN_SECONDS = 86400;
const ONE_WEEK_IN_SECONDS = 7 * ONE_DAY_IN_SECONDS;
export async function deployTranche(elfContract: Elf, signer: Signer) {
  const TrancheDeployer = new Tranche__factory(signer);
  const trancheContract = await TrancheDeployer.deploy(
    elfContract.address,
    ONE_WEEK_IN_SECONDS
  );

  return trancheContract;
}
