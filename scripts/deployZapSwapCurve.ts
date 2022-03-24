import { ethers } from "hardhat";
import fs from "fs";
import mainnet from "../addresses/mainnet.json";
import { ZapSwapCurve__factory } from "../typechain/factories/ZapSwapCurve__factory";
import * as readline from "readline-sync";

async function deployZapSwapCurve(addresses: any) {
  if (
    addresses.zaps?.zapSwapCurve === undefined ||
    addresses.zaps?.zapSwapCurve === ""
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

  const gas = readline.question("gas price: ");

  console.log("Deploying zapSwapCurve contract");
  const zapSwapCurveContract = await zapSwapCurveFactory.deploy(
    addresses.balancerVault,
    {
      maxFeePerGas: ethers.utils.parseUnits(gas, "gwei"),
    }
  );

  await zapSwapCurveContract.deployed();

  console.log("Deployed zapSwapCurve contract!");
  if (addresses.zap === undefined) addresses.zaps = {};
  addresses.zaps.zapSwapCurve = zapSwapCurveContract.address;
  return addresses;
}

async function main() {
  const [signer] = await ethers.getSigners();

  const network = await signer.provider?.getNetwork();

  switch (network?.chainId) {
    case 1: {
      const result = await deployZapSwapCurve(mainnet);
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
