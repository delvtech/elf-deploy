import { ethers } from "hardhat";
import { providers } from "ethers";
import hre from "hardhat";
// Smart contract imports
import { TrancheFactory__factory } from "../../typechain/factories/TrancheFactory__factory";
import { InterestTokenFactory__factory } from "../../typechain/factories/InterestTokenFactory__factory";
import { YVaultAssetProxy__factory } from "../../typechain/factories/YVaultAssetProxy__factory";
import { DateString__factory } from "../../typechain/factories/DateString__factory";
import { UserProxy__factory } from "../../typechain/factories/UserProxy__factory";
import * as readline from "readline-sync";
import { YVaultV4AssetProxy__factory } from "../../typechain/factories/YVaultV4AssetProxy__factory";

const provider = ethers.providers.getDefaultProvider("goerli");

export interface UserProxyData {
  weth: string; // weth address
  trancheFactory: string; // tranche factory address
  trancheBytecodeHash: string; // hash of the Tranche bytecode.
}

export interface WrappedPositionData {
  name: string; // name
  symbol: string; // name
  underlying: string; // underlying token address
  vault: string; // yearn vault address
  version: string; 
}

export interface TrancheData {
  wrappedPosition: string; // Address of the Wrapped Position contract the tranche will use
  expirations: number[]; // tranche lengths
  trancheFactory: string; // Address of a tranche factory
}

// An interface to allow us to access the ethers log return
interface LogData {
  event: string;
  data: unknown;
}

// A partially extended interface for the post mining transaction receipt
interface PostExecutionTransactionReceipt extends providers.TransactionReceipt {
  events: LogData[];
}

export async function deployUserProxy(deploymentData: UserProxyData) {
  const [signer] = await ethers.getSigners();
  const proxyFactory = new UserProxy__factory(signer);
  const gas = readline.question("user proxy gasPrice: ");
  const proxy = await proxyFactory.deploy(
    deploymentData.weth,
    deploymentData.trancheFactory,
    deploymentData.trancheBytecodeHash,
    {
      maxFeePerGas: ethers.utils.parseUnits(gas, "gwei"),
    }
  );
  await proxy.deployed();

  await hre.run("verify:verify", {
    network: "mainnet",
    address: "0xEe4e158c03A10CBc8242350d74510779A364581C",
    constructorArguments: [
      deploymentData.weth,
      deploymentData.trancheFactory,
      deploymentData.trancheBytecodeHash,
    ],
  });

  console.log("User Proxy", proxy.address);
  return proxy.address;
}

export async function deployFactories() {
  const [signer] = await ethers.getSigners();
  const interestTokenFactoryFactory = new InterestTokenFactory__factory(signer);
  const ytFactoryGas = readline.question("yt factory gasPrice: ");
  const interestTokenFactory = await interestTokenFactoryFactory.deploy({
    maxFeePerGas: ethers.utils.parseUnits(ytFactoryGas, "gwei"),
  });
  await interestTokenFactory.deployed();
  console.log("Interest Token Factory", interestTokenFactory.address);

  //get datestring lib
  const trancheFactoryFactory = new TrancheFactory__factory(signer);
  const dateLibFactory = new DateString__factory(signer);
  const dateLibGas = readline.question("datelib gasPrice: ");
  const dateLib = await dateLibFactory.deploy({
    maxFeePerGas: ethers.utils.parseUnits(dateLibGas, "gwei"),
  });
  await dateLib.deployed();

  await hre.run("verify:verify", {
    network: "mainnet",
    address: dateLib.address,
    constructorArguments: [],
  });

  // Deploy the tranche factory
  const trancheFactoryGas = readline.question("tranche factory gasPrice: ");
  const trancheFactory = await trancheFactoryFactory.deploy(
    interestTokenFactory.address,
    dateLib.address,
    {
      maxFeePerGas: ethers.utils.parseUnits(trancheFactoryGas, "gwei"),
    }
  );
  await trancheFactory.deployed();

  await hre.run("verify:verify", {
    network: "mainnet",
    address: trancheFactory.address,
    constructorArguments: [interestTokenFactory.address, dateLib.address],
  });

  console.log("Tranche Factory", trancheFactory.address);
  return trancheFactory.address;
}

export async function deployWrappedPosition(
  deploymentData: WrappedPositionData,
  v4: boolean
) {
  const [signer] = await ethers.getSigners();

  let yAssetWPFactory;
  if (v4) {
    yAssetWPFactory = new YVaultV4AssetProxy__factory(signer);
  } else {
    yAssetWPFactory = new YVaultAssetProxy__factory(signer);
  }

  const pauser = readline.question("pauser address: ");
  const gas = readline.question("wrapped position gasPrice: ");
  const wrappedPosition = await yAssetWPFactory.deploy(
    deploymentData.vault,
    deploymentData.underlying,
    deploymentData.name,
    deploymentData.symbol,
    "",
    pauser,
    {
      maxFeePerGas: ethers.utils.parseUnits(gas, "gwei"),
    }
  );
  await wrappedPosition.deployed();
  await hre.run("verify:verify", {
    network: "mainnet",
    address: wrappedPosition.address,
    constructorArguments: [
      deploymentData.vault,
      deploymentData.underlying,
      deploymentData.name,
      deploymentData.symbol,
    ],
  });
  console.log("Wrapped Position", wrappedPosition.address);
  return wrappedPosition.address;
}

export async function deployTranche(deploymentData: TrancheData) {
  const [signer] = await ethers.getSigners();

  interface AssetDeployment {
    wrappedPositionAddress: string;
    trancheAddresses: string[];
    trancheExpirations: number[];
  }

  const deploymentResult = {
    elfDeployments: [] as AssetDeployment[],
  };

  const trancheAddresses: string[] = [];
  const trancheExpirations: number[] = [];

  const trancheFactory = TrancheFactory__factory.connect(
    deploymentData.trancheFactory,
    signer
  );

  const blockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNumber);
  const timestamp = block.timestamp;

  for (let i = 0; i < deploymentData.expirations.length; i++) {
    let expiration = deploymentData.expirations[i];
    // Deploy the tranche for this timestamp
    const gas = readline.question("tranche gasPrice: ");

    const txReceipt = (await (
      await trancheFactory.deployTranche(
        expiration + timestamp,
        deploymentData.wrappedPosition,
        {
          maxFeePerGas: ethers.utils.parseUnits(gas, "gwei"),
        }
      )
    ).wait(1)) as PostExecutionTransactionReceipt;

    const returned = txReceipt.events.filter(
      (event) => event.event == "TrancheCreated"
    );

    const trancheAddress = (returned[0] as any).args[0] as string;
    trancheExpirations.push(expiration + timestamp);
    trancheAddresses.push(trancheAddress);

    console.log("Tranche", trancheAddress);
    console.log("Expiration", expiration + timestamp);
  }

  deploymentResult.elfDeployments.push({
    wrappedPositionAddress: deploymentData.wrappedPosition,
    trancheAddresses: trancheAddresses,
    trancheExpirations: trancheExpirations,
  });

  return deploymentResult.elfDeployments;
}
