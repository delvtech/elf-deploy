import { YC__factory } from "./../types/factories/YC__factory";
import { Signer } from "ethers";
import {
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
} from "ethers/lib/utils";
import fs from "fs";
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

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

  // deploy base assets, give element address some extra tokens
  const [wethContract, usdcContract] = await deployBaseAssets(elementSigner);
  const e_mintWethTx = await wethContract.mint(
    elementAddress,
    parseEther("1000000")
  );
  await e_mintWethTx.wait(1);
  const e_mintUsdcTx = await usdcContract.mint(
    elementAddress,
    parseUnits("1000000", 6)
  );
  await e_mintUsdcTx.wait(1);

  // deploy elf, tranches and markets
  const elfFactoryContract = await deployElfFactory(elementSigner);
  const bFactoryContract = await deployBalancerFactory(elementSigner);

  const {
    elfContract: elfWethContract,
    trancheContract: trancheWethContract,
    marketFYTContract: marketWethFYTContract,
    marketYCContract: marketWethYCContract,
  } = await setupElfTrancheAndMarkets(
    elfFactoryContract,
    wethContract,
    elementSigner,
    bFactoryContract,
    elementAddress
  );

  /**
   * remove these consoles when USDC price verified in frontend
   */
  const wethMarketBalance = await marketWethFYTContract.getBalance(
    wethContract.address
  );
  console.log("wethMarketBalance", formatEther(wethMarketBalance));

  const fyWethMarketBalance = await marketWethFYTContract.getBalance(
    trancheWethContract.address
  );
  console.log("fyWethMarketBalance", formatEther(fyWethMarketBalance));
  /************************************************************** */

  const {
    elfContract: elfUsdcContract,
    trancheContract: trancheUsdcContract,
    marketFYTContract: marketUsdcFYTContract,
    marketYCContract: marketUsdcYCContract,
  } = await setupElfTrancheAndMarkets(
    elfFactoryContract,
    usdcContract,
    elementSigner,
    bFactoryContract,
    elementAddress
  );

  /**
   * remove these consoles when USDC price verified in frontend
   */
  const usdcMarketBalance = await marketUsdcFYTContract.getBalance(
    usdcContract.address
  );
  console.log("usdcMarketBalance", formatUnits(usdcMarketBalance, 6));

  const fyUsdcMarketBalance = await marketUsdcFYTContract.getBalance(
    trancheUsdcContract.address
  );
  console.log("fyUsdcMarketBalance", formatUnits(fyUsdcMarketBalance, 6));
  /************************************************************** */

  // deploy user proxy
  const userProxyContract = await deployUserProxy(
    elementSigner,
    wethContract.address
  );

  // supply user with WETH and USDC
  const mintWethTx = await wethContract.mint(
    userAddress,
    parseEther("1000000")
  );
  await mintWethTx.wait(1);
  const mintUsdcTx = await usdcContract.mint(
    userAddress,
    parseUnits("1000000", 6)
  );
  await mintUsdcTx.wait(1);

  const wethBalance = await wethContract.balanceOf(userAddress);
  const usdcBalance = await usdcContract.balanceOf(userAddress);
  console.log("user1 supplied with");
  console.log(formatEther(wethBalance), "WETH");
  console.log(formatUnits(usdcBalance, 6), "USDC");

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
      marketWethFYTAddress: marketWethFYTContract.address,
      marketWethYCAddress: marketWethYCContract.address,

      //usdc addresses
      usdcAddress: usdcContract.address,
      elfUsdcAddress: elfUsdcContract.address,
      trancheUsdcAddress: trancheUsdcContract.address,
      bPoolUsdcAddress: marketUsdcFYTContract.address,
      marketUsdcFYTAddress: marketUsdcFYTContract.address,
      marketUsdcYCAddress: marketUsdcYCContract.address,
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
async function setupElfTrancheAndMarkets(
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
  const trancheContract = await deployTranche(
    elfContract,
    "SIX_MONTHS",
    elementSigner
  );

  const marketFYTContract = await deployBalancerPool(
    bFactoryContract,
    elementSigner
  );

  // allow elf contract to take user's base asset tokens
  await baseAssetContract.approve(elfContract.address, MAX_ALLOWANCE);
  const baseAssetDecimals = await baseAssetContract.decimals();

  // deposit base asset into elf
  await elfContract.deposit(
    elementAddress,
    parseUnits("10000", baseAssetDecimals)
  );

  // allow tranche contract to take user's elf tokens
  await elfContract.approve(trancheContract.address, MAX_ALLOWANCE);

  // deposit elf into tranche contract
  await trancheContract.deposit(parseUnits("10000", baseAssetDecimals));

  /********************************************** */
  /* Get some FYTs to seed the balancer pool with */
  /********************************************** */

  // allow balancer pool to take user's fyt and base tokens
  await baseAssetContract.approve(marketFYTContract.address, MAX_ALLOWANCE);
  await trancheContract.approve(marketFYTContract.address, MAX_ALLOWANCE);

  // Seed the pool with inital liquidity
  await setupBalancerPool(
    marketFYTContract,
    (baseAssetContract as unknown) as ERC20,
    trancheContract,
    { yieldAssetBalance: "9500" }
  );

  // check spot price
  const spotPriceFYT = await marketFYTContract.getSpotPrice(
    baseAssetContract.address,
    trancheContract.address
  );
  console.log("spotPrice FYT", formatUnits(spotPriceFYT));

  await marketFYTContract.finalize();

  const marketYCContract = await deployBalancerPool(
    bFactoryContract,
    elementSigner
  );
  /********************************************** */

  /********************************************** */
  /* Get some YCs to seed the balancer pool with */
  /********************************************** */
  // allow balancer pool to take user's yc and base tokens
  await baseAssetContract.approve(marketYCContract.address, MAX_ALLOWANCE);
  const ycAddress = await trancheContract.yc();
  const ycContract = YC__factory.connect(ycAddress, elementSigner);
  await ycContract.approve(marketYCContract.address, MAX_ALLOWANCE);

  // Seed the pool with inital liquidity
  await setupBalancerPool(
    marketYCContract,
    (baseAssetContract as unknown) as ERC20,
    ycContract,
    { yieldAssetBalance: "5000" }
  );

  // check spot price
  const spotPriceYC = await marketYCContract.getSpotPrice(
    baseAssetContract.address,
    ycContract.address
  );
  console.log("spotPrice YC", formatUnits(spotPriceYC));

  await marketYCContract.finalize();
  /********************************************** */

  return {
    elfContract,
    trancheContract,
    marketFYTContract,
    marketYCContract,
  };
}
