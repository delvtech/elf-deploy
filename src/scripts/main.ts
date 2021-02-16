import { Signer } from "ethers";
import { parseEther } from "ethers/lib/utils";
import fs from "fs";
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

import hre from "hardhat";
import { deployUserProxy } from "./userProxy";
import { BFactory, ElfFactory, ERC20, USDC, WETH } from "types";

import { deployBalancerFactory } from "./balancerFactory";
import { deployBalancerPool } from "./balancerPool";
import { deployBaseAssets } from "./baseAssets";
import { deployElf } from "./elf";
import { deployElfFactory } from "./elfFactory";
import { getSigner, SIGNER } from "./getSigner";
import { setupBalancerPool } from "./setupBalancerPool";
import { deployTranche } from "./tranche";

// TODO figure out actual max number
const MAX_ALLOWANCE = parseEther("1000000");

async function main() {
  const elementSigner = await getSigner(SIGNER.ELEMENT);
  const elementAddress = await elementSigner.getAddress();
  const userSigner = await getSigner(SIGNER.USER);
  const userAddress = await userSigner.getAddress();

  const [wethContract, usdcContract] = await deployBaseAssets(elementSigner);

  const elfFactoryContract = await deployElfFactory(elementSigner);
  const bFactoryContract = await deployBalancerFactory();

  const {
    elfContract: elfWethContract,
    trancheContract: trancheWethContract,
    bPoolContract: bPoolWethFYTContract,
  } = await setupElfTrancheAndMarket(
    elfFactoryContract,
    wethContract,
    elementSigner,
    bFactoryContract,
    elementAddress
  );

  const {
    elfContract: elfUsdcContract,
    trancheContract: trancheUsdcContract,
    bPoolContract: bPoolUsdcFYTContract,
  } = await setupElfTrancheAndMarket(
    elfFactoryContract,
    usdcContract,
    elementSigner,
    bFactoryContract,
    elementAddress
  );

  const userProxyContract = await deployUserProxy(
    elementSigner,
    wethContract.address
  );

  const addresses = JSON.stringify(
    {
      // signer addresses
      elementAddress,
      userAddress,

      // user proxy
      userProxyContractAddress: userProxyContract.address,

      // factories
      elfFactoryAddress: elfFactoryContract.address,
      bFactoryAddress: bFactoryContract.address,

      // weth addresses
      wethAddress: wethContract.address,
      elfWethAddress: elfWethContract.address,
      trancheWethAddress: trancheWethContract.address,
      bPoolWethAddress: bPoolWethFYTContract.address,

      //usdc addresses
      usdcAddress: usdcContract.address,
      elfUsdcAddress: elfUsdcContract.address,
      trancheUsdcAddress: trancheUsdcContract.address,
      bPoolUsdcAddress: bPoolUsdcFYTContract.address,
    },
    null,
    2
  );
  console.log("addresses", addresses);
  fs.writeFileSync("./addresses.json", addresses);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// TODO: add options for the tranche and balancer pools
// TODO: add options to initialize market with YCs
async function setupElfTrancheAndMarket(
  elfFactoryContract: ElfFactory,
  baseAssetContract: WETH | USDC,
  elementSigner: Signer,
  bFactoryContract: BFactory,
  elementAddress: string
) {
  const elfContract = await deployElf(
    elfFactoryContract,
    baseAssetContract,
    elementSigner
  );
  const trancheContract = await deployTranche(elfContract);

  const bPoolContract = await deployBalancerPool(
    bFactoryContract,
    elementSigner
  );

  // Get some FYTs to seed the balancer pool with
  await baseAssetContract.approve(elfContract.address, MAX_ALLOWANCE);
  await elfContract.deposit(elementAddress, parseEther("100"));
  await elfContract.approve(trancheContract.address, MAX_ALLOWANCE);
  await trancheContract.deposit(parseEther("100"));

  await baseAssetContract.approve(bPoolContract.address, MAX_ALLOWANCE);
  await trancheContract.approve(bPoolContract.address, MAX_ALLOWANCE);

  // Seed the pool with inital liquidity
  await setupBalancerPool(
    bPoolContract,
    (baseAssetContract as unknown) as ERC20,
    trancheContract
  );

  await bPoolContract.finalize();

  return {
    elfContract,
    trancheContract,
    bPoolContract,
  };
}
