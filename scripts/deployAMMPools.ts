import { Vault__factory } from "../typechain/factories/Vault__factory";
import { Vault } from "../typechain/Vault";
import { WeightedPoolFactory } from "../typechain/WeightedPoolFactory";
import { WeightedPoolFactory__factory } from "../typechain/factories/WeightedPoolFactory__factory";
import { ConvergentPoolFactory__factory } from "../typechain/factories/ConvergentPoolFactory__factory";
import { ConvergentPoolFactory } from "../typechain/ConvergentPoolFactory";
import { ERC20 } from "typechain/ERC20";
import { ethers } from "hardhat";
import { Signer, BigNumber } from "ethers";
import * as readline from "readline-sync";
import fs, { read } from "fs";
import { Tranche__factory } from "../typechain/factories/Tranche__factory";
import { ConvergentCurvePool__factory } from "../typechain/factories/ConvergentCurvePool__factory";
import { ERC20__factory } from "../typechain/factories/ERC20__factory";
import { InterestToken__factory } from "../typechain/factories/InterestToken__factory";
import hre from "hardhat";

// Edit to import the correct version
import goerliJson from "../addresses/goerli.json";
import mainnetJson from "../addresses/mainnet.json";

export async function deployWeightedPool(
  signer: Signer,
  vaultContract: Vault,
  poolFactory: WeightedPoolFactory,
  name: string,
  symbol: string,
  tokens: string[],
  weights: BigNumber[],
  swapFee: string,
  network: string
) {
  const gas = readline.question("gasPrice: ");
  const createTx = await poolFactory.create(
    name,
    symbol,
    tokens,
    weights,
    ethers.utils.parseEther(swapFee),
    await signer.getAddress(),
    {
      maxFeePerGas: ethers.utils.parseUnits(gas, "gwei"),
    }
  );
  const txReceipt = await createTx.wait(1);

  const filter = vaultContract.filters.PoolRegistered(null, null, null);
  const results = await vaultContract.queryFilter(filter);
  const poolId = results[results.length - 1]?.args?.poolId;
  const poolAddress = results[results.length - 1]?.args?.poolAddress;

  return { poolId, poolAddress };
}

const defaultOptions = {
  swapFee: ".05",
};

const ONE_YEAR_IN_SECONDS = 31556952;

export async function deployConvergentPool(
  signer: Signer,
  convergentPoolFactory: ConvergentPoolFactory,
  balancerVaultContract: Vault,
  baseAssetContract: ERC20,
  yieldAssetContract: ERC20,
  expiration: number,
  tParam: number,
  network: string,
  pauser: string,
  options?: {
    swapFee?: string;
  }
) {
  const { swapFee } = { ...defaultOptions, ...options };
  const assetSymbol = await yieldAssetContract.symbol();
  const assetName = await yieldAssetContract.name();

  const gas = readline.question("gasPrice: ");
  const createTx = await convergentPoolFactory
    .connect(signer)
    .create(
      baseAssetContract.address,
      yieldAssetContract.address,
      expiration,
      Math.round(tParam * ONE_YEAR_IN_SECONDS),
      ethers.utils.parseEther(swapFee),
      `LP ${assetName}`,
      `LP${assetSymbol}`,
      pauser,
      {
        maxFeePerGas: ethers.utils.parseUnits(gas, "gwei"),
      }
    );
  await createTx.wait(1);

  // grab last poolId from last event
  const newPools = balancerVaultContract.filters.PoolRegistered(
    null,
    null,
    null
  );
  const results = await balancerVaultContract.queryFilter(newPools);
  const poolId = results[results.length - 1]?.args?.poolId;
  const poolAddress = results[results.length - 1]?.args?.poolAddress;
  const poolContract = ConvergentCurvePool__factory.connect(
    poolAddress,
    signer
  );

  const vault = await convergentPoolFactory.getVault();
  const feeGov = await convergentPoolFactory.percentFeeGov();
  const gov = await convergentPoolFactory.governance();

  await hre.run("verify:verify", {
    network: network,
    address: poolAddress,
    constructorArguments: [
      baseAssetContract.address,
      yieldAssetContract.address,
      expiration,
      Math.round(tParam * ONE_YEAR_IN_SECONDS),
      vault,
      ethers.utils.parseEther(swapFee),
      feeGov,
      gov,
      `LP ${assetName}`,
      `LP${assetSymbol}`,
    ],
  });

    const vault = await convergentPoolFactory.getVault();
    const feeGov = await convergentPoolFactory.percentFeeGov();
    const gov = await convergentPoolFactory.governance();
    await hre.run("verify:verify", {
        network: network,
        address: poolAddress,
        constructorArguments: 
        [
            baseAssetContract.address,
            yieldAssetContract.address,
            expiration,
            Math.round(tParam*ONE_YEAR_IN_SECONDS),
            vault,
            ethers.utils.parseEther(swapFee),
            feeGov,
            gov,
            `LP ${assetName}`,
            `LP${assetSymbol}`,
            pauser,
        ],
    });
  
    return { poolId, poolContract };
}

async function deployWithAddresses(
  addresses: typeof goerliJson | typeof mainnetJson,
  network: string
) {
  const [signer] = await ethers.getSigners();

  // Get balancer vault
  if (addresses.balancerVault == undefined || addresses.balancerVault == "") {
    console.log("Error: please init balancer vault");
    return;
  }
  const balancerFactory = new Vault__factory(signer);
  const vault = balancerFactory.attach(addresses.balancerVault);

  const { latestVersion: latestCCPoolFactory } =
    addresses.convergentCurvePoolFactory;

  const latestCCPoolFactoryAddress =
    // TODO: type this better
    addresses.convergentCurvePoolFactory[latestCCPoolFactory as "v1" | "v1_1"];

  // Get convergent curve pool factory
  if (
    latestCCPoolFactoryAddress === undefined ||
    latestCCPoolFactoryAddress === ""
  ) {
    console.log("Error: please init cc pool factory");
    return;
  }
  const ccFactoryFactory = new ConvergentPoolFactory__factory(signer);
  const ccFactory = ccFactoryFactory.attach(latestCCPoolFactoryAddress);

  // Get the weighted pool factory
  if (
    addresses.weightedPoolFactory == undefined ||
    addresses.weightedPoolFactory == ""
  ) {
    console.log("Error: please init weighted pool factory");
    return;
  }
  const weightedPoolFactoryFactory = new WeightedPoolFactory__factory(signer);
  const weightedPoolFactory = weightedPoolFactoryFactory.attach(
    addresses.weightedPoolFactory
  );

  // Load the tranche
  const trancheAddress = readline.question("tranche address: ");
  const trancheFactory = new Tranche__factory(signer);
  const tranche = trancheFactory.attach(trancheAddress);

  // Load the yt
  const ytAddress = await tranche.interestToken();
  const ytFactory = new InterestToken__factory(signer);
  const yt = ytFactory.attach(ytAddress);

  // Load the underlying token
  const underlying = await tranche.underlying();
  const erc20Factory = new ERC20__factory(signer);
  const underlyingErc = erc20Factory.attach(underlying);

  // If they want to init the weighted pool let them
  const newWeightedPool = readline.question("new yt pool (y/n): ");
  let ytDeployData;
  if (newWeightedPool == "y") {
    const customSwapFee = readline.question("custom fee (y/n): ");
    let swapFee;
    if (customSwapFee == "y") {
      swapFee = readline.question("swap fee: ");
    } else {
      swapFee = "0.003";
    }

    const ytName = await yt.name();
    const lpTokenName = `LP ${ytName}`;
    const ytSymbol = await yt.symbol();
    const lpTokenSymbol = `LP${ytSymbol}`;

    let tokens;
    let weights;
    if (BigNumber.from(underlying).lt(BigNumber.from(yt.address))) {
      tokens = [underlying, yt.address];
      weights = [
        ethers.utils.parseEther("0.5").add(1),
        ethers.utils.parseEther("0.5").sub(1),
      ];
    } else {
      tokens = [yt.address, underlying];
      weights = [
        ethers.utils.parseEther("0.5").sub(1),
        ethers.utils.parseEther("0.5").add(1),
      ];
    }

    console.log("Deploying new yt pool");
    const deployData = await deployWeightedPool(
      signer,
      vault,
      weightedPoolFactory,
      lpTokenName,
      lpTokenSymbol,
      tokens,
      weights,
      swapFee,
      network
    );

    console.log("successfully deployed yt pool");
    ytDeployData = {
      address: deployData.poolAddress,
      poolId: deployData.poolId,
      fee: swapFee,
    };
  }

  const newCCPool = readline.question("new pt pool (y/n): ");
  let ptDeployData;
  // Safe conversion because it's a unix timestamp
  const unlockTimestamp = (await tranche.unlockTimestamp()).toNumber();
  if (newCCPool == "y") {
    const swapFeeString = readline.question("swap fee [decimal form] : ");
    const t = Number.parseFloat(readline.question("t stretch in years :"));
    const pauser = readline.question("pauser address : "); // Timelock

    console.log("Deploying new pool");
    const deployment = await deployConvergentPool(
      signer,
      ccFactory,
      vault,
      underlyingErc,
      tranche as unknown as ERC20,
      unlockTimestamp,
      t,
      network,
      pauser,
      {
        swapFee: swapFeeString,
      }
    );
    console.log("new pool deployed");

    ptDeployData = {
      address: deployment.poolContract.address,
      poolId: deployment.poolId,
      fee: swapFeeString,
      timeStretch: t,
    };
  }

  // We have to parse for the underlying tranche name in the addresses file
  const name = (await underlyingErc.symbol()).toLowerCase();
  let ind = -1;
  let i = 0;

  if (addresses.tranches[name] == undefined) {
    addresses.tranches[name] = [];
  }

  for (let storedTranche of addresses.tranches[name]) {
    if (storedTranche.address == trancheAddress) {
      ind = i;
    }
    i++;
  }

  if (ind == -1) {
    addresses.tranches[name].push({
      expiration: unlockTimestamp,
      address: trancheAddress,
      ptPool: ptDeployData,
      ytPool: ytDeployData,
      trancheFactory: addresses.trancheFactory,
      weightedPoolFactory: addresses.weightedPoolFactory,
      convergentCurvePoolFactory: addresses.convergentCurvePoolFactory,
    });
  } else {
    // We want to make sure to not overwrite old data
    if (
      ptDeployData == undefined &&
      addresses.tranches[name][ind].ptPool != undefined
    ) {
      ptDeployData = addresses.tranches[name][ind].ptPool;
    }
    if (
      ytDeployData == undefined &&
      addresses.tranches[name][ind].ytPool != undefined
    ) {
      ytDeployData = addresses.tranches[name][ind].ytPool;
    }

    addresses.tranches[name][ind].ptPool = ptDeployData;
    addresses.tranches[name][ind].ytPool = ytDeployData;
    addresses.tranches[name][ind].weightedPoolFactory =
      addresses.weightedPoolFactory;
    addresses.tranches[name][ind].convergentCurvePoolFactory =
      addresses.convergentCurvePoolFactory;
  }

  return addresses;
}

async function main() {
  const [signer] = await ethers.getSigners();
  const network = await signer.provider?.getNetwork();
  switch (network?.chainId) {
    case 5: {
      const result = await deployWithAddresses(goerliJson, "goerli");
      console.log(
        "writing changed address to output file 'addresses/goerli.json'"
      );
      fs.writeFileSync(
        "addresses/goerli.json",
        JSON.stringify(result, null, "\t"),
        "utf8"
      );
      break;
    }
    case 1: {
      const result = await deployWithAddresses(mainnetJson, "mainnet");
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
