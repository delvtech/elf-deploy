import { ethers } from "hardhat";
import mainnet from "../addresses/mainnet.json";
import { impersonate } from "./impersonate";
import { setBlock } from "./setBlock";
import { setZapSwapCurveApprovals } from "./setZapSwapCurveApprovals";

const zapSwapCurveOwner = "0x422494292e7a9Dda8778Bb4EA05C2779a3d60f5D";

async function main() {
  let [signer] = await ethers.getSigners();

  const network = await signer.provider?.getNetwork();
  switch (network?.chainId) {
    case 31337: {
      await setBlock(14617007); // Mar-26-2022 01:40:40 AM
      signer = await impersonate(zapSwapCurveOwner);
    }
    case 1: {
      await setZapSwapCurveApprovals(mainnet, signer);
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
