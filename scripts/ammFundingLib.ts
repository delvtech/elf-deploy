import { Vault } from "../typechain/Vault";
import {ERC20} from "typechain/ERC20";
import { ethers } from "hardhat";
import { Signer, BigNumber, BigNumberish, BytesLike } from "ethers";
import * as readline from "readline-sync";
import {Tranche} from "../typechain/Tranche";
import {ERC20__factory} from "../typechain/factories/ERC20__factory";

async function neededBonds(
    initialBase: number,
    expectedApy: number,
    timeStretch: number
  ) {
    const rho = Math.pow(1 + expectedApy, timeStretch);
    return (initialBase * (rho - 1)) / (1 + rho);
  }

async function gasPrice() {
    const gas = readline.question("gas price: ");
    return ethers.utils.parseUnits(gas, 'gwei');
}


const JOIN_WEIGHTED_POOL_INIT_TAG = 0;
export function encodeJoinWeightedPool(amountsIn: BigNumberish[]): string {
    return ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256[]"],
      [JOIN_WEIGHTED_POOL_INIT_TAG, amountsIn]
    );
}

  // Note - we assume that 1 - ytPrice = fytPrice, which is only valid at tranche start
export async function initYieldPool(
    signer: Signer,
    vault: Vault,
    tranche: Tranche,
    token: ERC20,
    ytPoolId: BytesLike,
    term: number,
    expectedAPY: number,
  ) {
    console.log("Attempting to initialize lp pool");
    // Load the yield token and cast it's address as erc20
    const yieldTokenAddr = await tranche.interestToken();
    const ERC20Factory = new ERC20__factory(signer);
    const yieldToken = ERC20Factory.attach(yieldTokenAddr);
    // Load other data
    const signerAddress = await signer.getAddress();
    const decimals = await token.decimal();
    const one = ethers.utils.parseUnits("1", decimals);
    console.log("Your token balance is :", (await token.balanceOf(signerAddress)).div(one).toNumber());
    console.log("Your yt balance is :", (await yieldToken.balanceOf(signerAddress)).div(one).toNumber());

    const mintMore = readline.question("do you need to deposit (y/n): ");
    if (mintMore == "y") {
        const howMuch = readline.question("how much [decimal form]: ");
        const mintAmount = one.mul(Number.parseInt(howMuch));
        // We mint using the input amount
        await token
        .connect(signer)
        .approve(tranche.address, ethers.constants.MaxUint256);
        const gas = await gasPrice();
        console.log("Deposited into tranche");
        let tx = await tranche.connect(signer).deposit(mintAmount, signerAddress, {gasPrice: gas});
        await tx.wait(1);
        console.log("Deposit Completed");
    }

    const depositAmountStr = readline.question("Deposit amount of yt [decimal]: ");
    const depositAmount = one.mul(Number.parseInt(depositAmountStr));

    console.log("Checking allowances");

    let txAwaits = [];
    if ((await token.allowance(signerAddress, vault.address)).lt(depositAmount)) {
        console.log("Setting unlimited allowance for underlying");
        const gas = await gasPrice();
        const tx = await token
        .connect(signer)
        .approve(vault.address, ethers.constants.MaxUint256, {gasPrice: gas});
        txAwaits.push(tx.wait(1));
    }
    if ((await yieldToken.allowance(signerAddress, vault.address)).lt(depositAmount)) {
        console.log("Setting unlimited allowance for yt");
        const gas = await gasPrice();
        let tx = await yieldToken
        .connect(signer)
        .approve(vault.address, ethers.constants.MaxUint256, {gasPrice: gas});
        txAwaits.push(tx.wait(1));
    }
    await Promise.all(txAwaits);
    console.log("Allowances completed");

    // Make the first deposit into the yield token pool, simple ratio
    let ytAssets;
    let ytAmountsIn;
    const tokenDecimals = await token.decimals();
    const ytRatio = ethers.utils.parseUnits(
      (term * expectedAPY).toFixed(tokenDecimals),
      tokenDecimals
    );
    const stakedTokenYT = depositAmount
      .mul(ytRatio)
      .div(ethers.utils.parseUnits("1", tokenDecimals));
    console.log("Depositing: ", stakedTokenYT.div(one).toNumber(), " underlying");
    // We have to order these inputs
    if (BigNumber.from(yieldToken.address).lt(token.address)) {
      ytAssets = [yieldToken.address, token.address];
      // Will input quite a bit less token than yt
      ytAmountsIn = [depositAmount, stakedTokenYT];
    } else {
      ytAssets = [token.address, yieldToken.address];
      // Will input quite a bit less token than yt
      ytAmountsIn = [stakedTokenYT, depositAmount];
    }
    const gas = await gasPrice();
    console.log("try funding yt pool");
    let tx = await vault
      .connect(signer)
      .joinPool(ytPoolId, signerAddress, signerAddress, {
        assets: ytAssets,
        maxAmountsIn: ytAmountsIn,
        userData: encodeJoinWeightedPool(ytAmountsIn),
        fromInternalBalance: false
      },        
      {gasPrice: gas});
    await tx.wait(1);
    console.log("Pool funded");

  
    console.log("YT pool status", await vault.getPoolTokens(ytPoolId));
}

export async function initPtPool(
    signer: Signer,
    vault: Vault,
    tranche: Tranche,
    token: ERC20,
    ccPoolId: BytesLike,
    expectedAPY: number,
    timeStretch: number
  ) {
    console.log("Attempting to initialize lp pool");
    // Load the ptoken and cast it's address as erc20
    const ERC20Factory = new ERC20__factory(signer);
    const pt = ERC20Factory.attach(tranche.address);
    // Load other data
    const signerAddress = await signer.getAddress();
    const decimals = await token.decimal();
    const one = ethers.utils.parseUnits("1", decimals);
    console.log("Your token balance is :", (await token.balanceOf(signerAddress)).div(one).toNumber());
    console.log("Your pt balance is :", (await pt.balanceOf(signerAddress)).div(one).toNumber());

    const mintMore = readline.question("do you need to deposit (y/n): ");
    if (mintMore == "y") {
        const howMuch = readline.question("how much [decimal form]: ");
        const mintAmount = one.mul(Number.parseInt(howMuch));
        // We mint using the input amount
        await token
        .connect(signer)
        .approve(tranche.address, ethers.constants.MaxUint256);
        const gas = await gasPrice();
        console.log("Deposited into tranche");
        let tx = await tranche.connect(signer).deposit(mintAmount, signerAddress, {gasPrice: gas});
        await tx.wait(1);
        console.log("Deposit Completed");
    }

    const depositAmountStr = readline.question("Deposit amount of yt [decimal]: ");
    const depositAmount = one.mul(Number.parseInt(depositAmountStr));

    console.log("Checking allowances");

    let txAwaits = [];
    if ((await token.allowance(signerAddress, vault.address)).lt(depositAmount)) {
        console.log("Setting unlimited allowance for underlying");
        const gas = await gasPrice();
        const tx = await token
        .connect(signer)
        .approve(vault.address, ethers.constants.MaxUint256, {gasPrice: gas});
        txAwaits.push(tx.wait(1));
    }
    if ((await pt.allowance(signerAddress, vault.address)).lt(depositAmount)) {
        console.log("Setting unlimited allowance for pt");
        const gas = await gasPrice();
        let tx = await pt
        .connect(signer)
        .approve(vault.address, ethers.constants.MaxUint256, {gasPrice: gas});
        txAwaits.push(tx.wait(1));
    }
    await Promise.all(txAwaits);
    console.log("Allowances completed");

    let ptAssets;
    let ptAmounts;
    if (BigNumber.from(tranche.address).lt(token.address)) {
      ptAssets = [tranche.address, token.address];
      ptAmounts = [0, depositAmount];
    } else {
      ptAssets = [token.address, tranche.address];
      ptAmounts = [depositAmount, 0];
    }
  
    // Make the initalizing deposit into the ccPool
    console.log("Initial deposit into cc pool");
    let gas = await gasPrice()
    // The manual gas limit here is because the estimator wasn't working well
    // real gas usage should be ~180k
    let tx = await vault.connect(signer).joinPool(
      ccPoolId,
      signerAddress,
      signerAddress,
      {
        assets: ptAssets,
        maxAmountsIn: ptAmounts,
        userData: ethers.utils.defaultAbiCoder.encode(["uint256[]"], [ptAmounts]),
        fromInternalBalance: false,
      },
      { gasLimit: 250000, gasPrice: gas}
    );
    await tx.wait(1);
    console.log("Initial deposit finished");
  
    // Trade into the pool to get the correct apy
    const rawMintAmount = depositAmount.div(one).toNumber();
    const tradeIn = await neededBonds(rawMintAmount, expectedAPY, timeStretch);
    gas = await gasPrice();
    const minOut = readline.question("Min trade output [in decimals]: ");
    console.log("Trading in ", tradeIn, " bonds to set pool rate");
    console.log("Trade into the cc pool to set rate");
    tx = await vault.connect(signer).swap(
      {
        poolId: ccPoolId,
        kind: 0,
        assetIn: tranche.address,
        assetOut: token.address,
        amount: ethers.utils.parseUnits(
          tradeIn.toFixed(decimals).toString(),
          decimals
        ),
        userData: "0x",
      },
      {
        sender: signerAddress,
        fromInternalBalance: false,
        recipient: signerAddress,
        toInternalBalance: false,
      },
      ethers.utils.parseUnits(
        Number.parseFloat(minOut).toFixed(decimals).toString(),
        decimals
      ),
      ethers.constants.MaxUint256
    );
    await tx.wait(1);
    console.log("Rate setting trade finished");
    console.log("Pt pool status", await vault.getPoolTokens(ccPoolId));
}