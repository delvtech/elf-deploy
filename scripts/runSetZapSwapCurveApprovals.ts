import { ethers } from "hardhat";
import mainnet from "../addresses/mainnet.json";
import { setBlock } from "./setBlock";
import { setZapSwapCurveApprovals } from "./setZapSwapCurveApprovals";

async function main() {
  const [signer] = await ethers.getSigners();

  const network = await signer.provider?.getNetwork();
  switch (network?.chainId) {
    case 31337: {
      await setBlock(14450000); // Mar-24-2022 04:13:00 PM +UTC
    }
    case 1: {
      await setZapSwapCurveApprovals(mainnet);
      break;
    }
    default: {
      console.log("Unsupported network");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
