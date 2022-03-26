import fs from "fs";
import { ethers } from "hardhat";
import * as readline from "readline-sync";
import mainnet from "../addresses/mainnet.json";
import { ZapSwapCurve__factory } from "../typechain/factories/ZapSwapCurve__factory";
import { setBlock } from "./setBlock";
import { setZapSwapCurveApprovals } from "./setZapSwapCurveApprovals";

async function deployZapSwapCurve(addresses: any) {
  if (
    addresses.zaps?.zapSwapCurve !== undefined &&
    addresses.zaps?.zapSwapCurve !== ""
  ) {
    console.log("Error: already deployed");
    return;
  }

  if (addresses.balancerVault == undefined || addresses.balancerVault == "") {
    console.log("Error: please init");
    return;
  }

  const [signer] = await ethers.getSigners();
  const zapSwapCurveFactory = new ZapSwapCurve__factory(signer);

  const gas = readline.question("Set gas price: ");

  console.log("Deploying zapSwapCurve contract");

  const confirm = readline.question("Confirm zapSwapCurve deployment [Y/N]: ");

  if (confirm !== "Y") {
    return;
  }
  const zapSwapCurveContract = await zapSwapCurveFactory.deploy(
    addresses.balancerVault,
    {
      maxFeePerGas: ethers.utils.parseUnits(gas, "gwei"),
    }
  );
  console.log(zapSwapCurveContract.deployTransaction.hash);
  await zapSwapCurveContract.deployed();

  console.log("Deployed zapSwapCurve contract!");
  console.log(`ZapSwapCurve :: ${zapSwapCurveContract.address}`);

  if (addresses.zap === undefined) addresses.zaps = {};
  addresses.zaps.zapSwapCurve = zapSwapCurveContract.address;

  const shouldSetApprovals = readline.question(
    "Should set zapSwapCurve approvals? [Y/N]: "
  );

  if (shouldSetApprovals === "Y") {
    await setZapSwapCurveApprovals(addresses);
  }

  return addresses;
}

async function main() {
  const [signer] = await ethers.getSigners();

  const network = await signer.provider?.getNetwork();
  console.log(network?.chainId);
  switch (network?.chainId) {
    case 31337: {
      await setBlock(14450000); // Mar-24-2022 04:13:00 PM +UTC
      await deployZapSwapCurve(mainnet);
      break;
    }
    case 1: {
      const result = await deployZapSwapCurve(mainnet);
      if (!result) {
        console.log("No change");
        break;
      }
      console.log(
        "writing changed address to output file 'addresses/mainnet.json'"
      );
      fs.writeFileSync(
        "addresses/mainnet.json",
        JSON.stringify(result, null, "\t"),
        "utf8"
      );
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
