import { Signer } from "ethers";
import { Elf } from "types";

import { Tranche__factory } from "../types";

const ONE_DAY_IN_SECONDS = 86400;
const ONE_WEEK_IN_SECONDS = 7 * ONE_DAY_IN_SECONDS;
const FOUR_WEEKS_IN_SECONDS = 4 * ONE_WEEK_IN_SECONDS;
const SIX_MONTHS_IN_SECONDS = 6 * FOUR_WEEKS_IN_SECONDS;

enum DurationOptions {
  "ONE_DAY" = ONE_DAY_IN_SECONDS,
  "ONE_WEEK" = ONE_WEEK_IN_SECONDS,
  "FOUR_WEEKS" = FOUR_WEEKS_IN_SECONDS,
  "SIX_MONTHS" = SIX_MONTHS_IN_SECONDS,
}

type Duration = keyof typeof DurationOptions;
export async function deployTranche(
  elfContract: Elf,
  duration: Duration,
  signer: Signer
) {
  const maturationTime = DurationOptions[duration];

  const TrancheDeployer = new Tranche__factory(signer);
  const trancheContract = await TrancheDeployer.deploy(
    elfContract.address,
    maturationTime
  );

  return trancheContract;
}
