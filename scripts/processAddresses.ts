import { providers, utils } from "ethers";
import * as fs from "fs";
import * as hre from "hardhat";
import * as readline from "readline-sync";

import { AddressesJsonFile } from "../addresses/AddressesJsonFile.d";
import goerliJson from "../addresses/goerli.json";
import mainnetJson from "../addresses/mainnet.json";

type GoerliBaseAssets = keyof typeof goerliJson["tranches"];
type MainnetBaseAssets = keyof typeof mainnetJson["tranches"];

interface Tranche {
  address: string;
  convergentCurvePoolFactory: string;
  expiration: number;
  ptPool: {
    address: string;
    fee: string;
    poolId: string;
    timeStretch: number;
  };
  trancheFactory: string;
  weightedPoolFactory: string;
  ytPool: {
    address: string;
    fee: string;
    poolId: string;
  };
}

async function main() {
  // get the network name
  const network = hre.network.name == "hardhat" ? "mainnet" : hre.network.name;

  // get addresses for safelist
  let safeList: string[] = [];
  if (network === "mainnet") {
    safeList = getSafeList(mainnetJson.tranches);
  }
  if (network === "goerli") {
    safeList = getSafeList(goerliJson.tranches);
  }

  let chainid = providers.getNetwork(network).chainId;

  // read in address file and parse
  const addressesFile = network === "mainnet" ? mainnetJson : goerliJson;

  // add the rest of the known address types
  const balancerVaultAddress = utils.getAddress(addressesFile["balancerVault"]);
  const convergentPoolFactoryAddress: AddressesJsonFile["addresses"]["convergentPoolFactoryAddress"] =
    {
      latestVersion: "v1_1",
      v1_1: utils.getAddress(addressesFile.convergentCurvePoolFactory.v1_1),
      v1: utils.getAddress(addressesFile.convergentCurvePoolFactory.v1),
    };
  const trancheFactoryAddress = utils.getAddress(
    addressesFile["trancheFactory"]
  );
  const userProxyContractAddress = utils.getAddress(addressesFile["userProxy"]);
  const weightedPoolFactoryAddress = utils.getAddress(
    addressesFile["weightedPoolFactory"]
  );

  const addresses: AddressesJsonFile["addresses"] = {
    balancerVaultAddress,
    trancheFactoryAddress,
    weightedPoolFactoryAddress,
    convergentPoolFactoryAddress,
    userProxyContractAddress,
    wbtcAddress: getBaseAssetAddress(addressesFile.tokens, "wbtc"),
    wethAddress: getBaseAssetAddress(addressesFile.tokens, "weth"),
    daiAddress: getBaseAssetAddress(addressesFile.tokens, "dai"),
    usdcAddress: getBaseAssetAddress(addressesFile.tokens, "usdc"),
    eurscrvAddress: getBaseAssetAddress(addressesFile.tokens, "eurscrv"),
    stecrvAddress: getBaseAssetAddress(addressesFile.tokens, "stecrv"),
    crv3cryptoAddress: getBaseAssetAddress(addressesFile.tokens, "crv3crypto"),
    crvtricryptoAddress: getBaseAssetAddress(
      addressesFile.tokens,
      "crvtricrypto"
    ),
    "lusd3crv-fAddress": getBaseAssetAddress(
      addressesFile.tokens,
      "lusd3crv-f"
    ),
    "alusd3crv-fAddress": getBaseAssetAddress(
      addressesFile.tokens,
      "alusd3crv-f"
    ),
    "mim-3lp3crv-fAddress": getBaseAssetAddress(
      addressesFile.tokens,
      "mim-3lp3crv-f"
    ),
  };

  // frontend json structure
  const frontendAddressesJsonFile: AddressesJsonFile = {
    addresses: addresses,
    chainId: chainid,
    safelist: safeList,
  };

  const formattedAddressesJsonFile = JSON.stringify(
    frontendAddressesJsonFile,
    null,
    4
  );

  console.log(formattedAddressesJsonFile);

  fs.writeFileSync(
    "addresses/frontend-" + network + ".addresses.json",
    formattedAddressesJsonFile,
    "utf8"
  );

  if (process.env["WRITE_CHANGELOG"] == "1") {
    // get release version
    const releaseVersion = readline.question(
      "Release Version (e.g. vX.X.X:X): "
    );
    fs.mkdirSync("changelog/releases/" + network + "/" + releaseVersion, {
      recursive: true,
    });
    fs.copyFileSync(
      "addresses/" + network + ".json",
      "changelog/releases/" + network + "/" + releaseVersion + "/addresses.json"
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

function getSafeList(tranchesByBaseAsset: Record<string, any[]>): string[] {
  const safeList: string[] = [];
  Object.values(tranchesByBaseAsset).forEach((tranches) => {
    tranches.forEach((tranche) => {
      safeList.push(utils.getAddress(tranche.address));
      safeList.push(utils.getAddress(tranche.ptPool.address));
      if (tranche.ytPool) {
        safeList.push(utils.getAddress(tranche.ytPool.address));
      }
    });
  });

  return safeList;
}

function getBaseAssetAddress(
  tokens: Record<string, string>,
  baseAsset: GoerliBaseAssets | MainnetBaseAssets
) {
  const asset = tokens[baseAsset];

  if (asset) {
    return utils.getAddress(asset);
  }

  return "0x0000000000000000000000000000000000000000";
}
