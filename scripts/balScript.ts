import { Signer, BigNumberish, BigNumber } from "ethers";
import { BytesLike, parseEther, Result } from "ethers/lib/utils";
import { ethers } from "hardhat";

import { Vault__factory } from "../typechain/factories/Vault__factory";
import { WETH } from "../typechain/WETH";
import { WETH__factory } from "../typechain/factories/WETH__factory";
import { ConvergentPoolFactory__factory } from "../typechain/factories/ConvergentPoolFactory__factory";
import { Vault } from "../typechain/Vault";
import { ConvergentPoolFactory } from "../typechain/ConvergentPoolFactory";
import { ConvergentCurvePool__factory } from "../typechain/factories/ConvergentCurvePool__factory";
import { TestERC20__factory } from "../typechain/factories/TestERC20__factory";
import { WeightedPoolFactory__factory } from "../typechain/factories/WeightedPoolFactory__factory";
import { WeightedPoolFactory } from "../typechain/WeightedPoolFactory";
import { WeightedPool__factory } from "../typechain/factories/WeightedPool__factory";
import { Tranche__factory } from "../typechain/factories/Tranche__factory";
import { Tranche } from "../typechain/Tranche";
import { ERC20 } from "../typechain/ERC20";
import { ERC20__factory } from "../typechain/factories/ERC20__factory";

export async function deployBalancerVault(signer: Signer, wethContract: WETH) {
  const wethAddress = wethContract.address;
  const signerAddress = await signer.getAddress();
  const vaultDeployer = new Vault__factory(signer);
  const vaultContract = await vaultDeployer.deploy(
    signerAddress,
    wethAddress,
    0,
    0
  );

  await vaultContract.deployed();

  return vaultContract;
}

export async function deployConvergentPoolFactory(
  signer: Signer,
  balancerVaultContract: Vault
) {
  const signerAddress = await signer.getAddress();
  const convergentPoolFactoryDeployer = new ConvergentPoolFactory__factory(
    signer
  );
  const convergentPoolFactoryContract = await convergentPoolFactoryDeployer.deploy(
    balancerVaultContract.address,
    signerAddress
  );
  await convergentPoolFactoryContract.deployed();

  // set the fee to 20%
  const setFeeTx = await convergentPoolFactoryContract.setGovFee(
    parseEther("0.2")
  );
  await setFeeTx.wait(1);

  return convergentPoolFactoryContract;
}

const THREE_MONTHS_IN_SECONDS = 7890000;
const ONE_YEAR_IN_SECONDS = 7890000 * 4;
const defaultOptions = {
  swapFee: ".05",
  tParam: THREE_MONTHS_IN_SECONDS,
};

export async function deployConvergentPool(
  signer: Signer,
  convergentPoolFactory: ConvergentPoolFactory,
  balancerVaultContract: Vault,
  baseAssetContract: ERC20,
  yieldAssetContract: ERC20,
  expiration: number,
  tParam: number,
  options?: {
    swapFee?: string;
  }
) {
  const { swapFee } = { ...defaultOptions, ...options };
  const baseAssetSymbol = await baseAssetContract.symbol();

  const createTx = await convergentPoolFactory.create(
    baseAssetContract.address,
    yieldAssetContract.address,
    expiration,
    tParam,
    parseEther(swapFee),
    `Element ${baseAssetSymbol} - fy${baseAssetSymbol}`,
    `${baseAssetSymbol}-fy${baseAssetSymbol}`
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

  return { poolId, poolContract };
}

export async function deployWeightedPoolFactory(
  signer: Signer,
  balancerVaultContract: Vault
) {
  const balancerVaultAddress = balancerVaultContract.address;
  const deployer = new WeightedPoolFactory__factory(signer);
  const weightedPoolFactoryContract = await deployer.deploy(
    balancerVaultAddress,
    { gasPrice: ethers.utils.parseUnits("50", "wei") }
  );

  await weightedPoolFactoryContract.deployed();

  return weightedPoolFactoryContract;
}

export async function deployWeightedPool(
  signer: Signer,
  vaultContract: Vault,
  poolFactory: WeightedPoolFactory,
  name: string,
  symbol: string,
  tokens: string[],
  weights: BigNumberish[],
  swapFee: string
) {
  const createTx = await poolFactory
    .connect(signer)
    .create(
      name,
      symbol,
      tokens,
      weights,
      parseEther(swapFee),
      await signer.getAddress()
    );
  const txReceipt = await createTx.wait(1);

  const filter = vaultContract.filters.PoolRegistered(null, null, null);
  const results = await vaultContract.queryFilter(filter);
  const poolId = results[results.length - 1]?.args?.poolId;
  const poolAddress = results[results.length - 1]?.args?.poolAddress;
  const poolContract = WeightedPool__factory.connect(poolAddress, signer);
  return { poolId, poolContract };
}

async function neededBonds(
  initialBase: number,
  expectedApy: number,
  timeStretch: number
) {
  const rho = Math.pow(1 + expectedApy, timeStretch);
  return (initialBase * (rho - 1)) / (1 + rho);
}

// Note - we assume that 1 - ytPrice = fytPrice, which is only valid at tranche start
export async function initLPPools(
  signer: Signer,
  vault: Vault,
  tranche: Tranche,
  token: ERC20,
  ccPoolId: BytesLike,
  ytPoolId: BytesLike,
  term: number,
  expectedAPY: number,
  timeStretch: number,
  mintAmount: BigNumber
) {
  console.log("attempting to initialize");
  const signerAddress = await signer.getAddress();
  console.log(await token.balanceOf(signerAddress));
  // We mint using the input amount
  await token
    .connect(signer)
    .approve(tranche.address, ethers.constants.MaxUint256);
  console.log("Deposited into tranche :", tranche.address);
  let tx = await tranche.connect(signer).deposit(mintAmount, signerAddress);
  console.log(await tranche.balanceOf(signerAddress));
  // Load the yield token and cast it's address as erc20
  const yieldTokenAddr = await tranche.interestToken();
  const ERC20Factory = new TestERC20__factory(signer);
  const yieldToken = ERC20Factory.attach(yieldTokenAddr);
  // Set approvals
  await tranche
    .connect(signer)
    .approve(vault.address, ethers.constants.MaxUint256);
  await token
    .connect(signer)
    .approve(vault.address, ethers.constants.MaxUint256);
  await yieldToken
    .connect(signer)
    .approve(vault.address, ethers.constants.MaxUint256);
  console.log("set approvals");

  // wait two blocks after mint to ensure we really have balance
  await tx.wait(2);

  // Make the first deposit into the yield token pool, simple ratio
  let ytAssets;
  let ytAmountsIn;
  const tokenDecimals = await token.decimals();
  const ytRatio = ethers.utils.parseUnits(
    (term * expectedAPY).toFixed(tokenDecimals),
    tokenDecimals
  );
  const stakedTokenYT = mintAmount
    .mul(ytRatio)
    .div(ethers.utils.parseUnits("1", tokenDecimals));
  console.log(stakedTokenYT);
  // We have to order these inputs
  if (BigNumber.from(yieldToken.address).lt(token.address)) {
    ytAssets = [yieldToken.address, token.address];
    // Will input quite a bit less token than yt
    ytAmountsIn = [mintAmount, stakedTokenYT];
  } else {
    ytAssets = [token.address, yieldToken.address];
    // Will input quite a bit less token than yt
    ytAmountsIn = [stakedTokenYT, mintAmount];
  }
  console.log("try funding yt pool");
  tx = await vault
    .connect(signer)
    .joinPool(ytPoolId, signerAddress, signerAddress, {
      assets: ytAssets,
      maxAmountsIn: ytAmountsIn,
      userData: encodeJoinWeightedPool(ytAmountsIn),
      fromInternalBalance: false,
    });
  await tx.wait(1);
  console.log("test trade in yt pool");
  await vault.connect(signer).swap(
    {
      poolId: ytPoolId,
      kind: 0,
      assetIn: token.address,
      assetOut: yieldToken.address,
      amount: stakedTokenYT.div(100),
      userData: "0x",
    },
    {
      sender: signerAddress,
      fromInternalBalance: false,
      recipient: signerAddress,
      toInternalBalance: false,
    },
    // TODO - Slippage protection, highly important for mainnet
    0,
    ethers.constants.MaxUint256
  );

  console.log("YT pool status", await vault.getPoolTokens(ytPoolId));

  // Make the deposit into the ccPool, first we deposit underlying to init then trade to ratio
  let ptAssets;
  let ptAmounts;
  if (BigNumber.from(tranche.address).lt(token.address)) {
    ptAssets = [tranche.address, token.address];
    ptAmounts = [0, mintAmount];
  } else {
    ptAssets = [token.address, tranche.address];
    ptAmounts = [mintAmount, 0];
  }

  // Make the initalizing deposit into the ccPool
  console.log("Initial deposit into cc pool");
  // The manual gas limit here is because the estimator wasn't working well
  // real gas usage should be ~180k
  tx = await vault.connect(signer).joinPool(
    ccPoolId,
    signerAddress,
    signerAddress,
    {
      assets: ptAssets,
      maxAmountsIn: ptAmounts,
      userData: ethers.utils.defaultAbiCoder.encode(["uint256[]"], [ptAmounts]),
      fromInternalBalance: false,
    },
    { gasLimit: 500000 }
  );
  await tx.wait(1);

  // Trade into the pool to get the correct apy
  const rawMintAmount = mintAmount
    .div(ethers.utils.parseUnits("1", tokenDecimals))
    .toNumber();
  const tradeIn = await neededBonds(rawMintAmount, expectedAPY, timeStretch);
  console.log(tradeIn);
  console.log("Trade into the cc pool to set rate");
  tx = await vault.connect(signer).swap(
    {
      poolId: ccPoolId,
      kind: 0,
      assetIn: tranche.address,
      assetOut: token.address,
      amount: ethers.utils.parseUnits(
        tradeIn.toFixed(tokenDecimals).toString(),
        tokenDecimals
      ),
      userData: "0x",
    },
    {
      sender: signerAddress,
      fromInternalBalance: false,
      recipient: signerAddress,
      toInternalBalance: false,
    },
    // TODO - Slippage protection, highly important for mainnet
    0,
    ethers.constants.MaxUint256
  );
  await tx.wait(1);
  console.log("Pt pool status", await vault.getPoolTokens(ccPoolId));
}

async function getPoolId(vaultContract: Vault, poolAddress: string) {
  const filter = vaultContract.filters.PoolRegistered(null, poolAddress, null);
  const results = await vaultContract.queryFilter(filter);
  // If there's more than one event something is really broken
  return results[0]?.args?.poolId;
}

// Adapted from balancer's tests
const JOIN_WEIGHTED_POOL_INIT_TAG = 0;
export function encodeJoinWeightedPool(amountsIn: BigNumberish[]): string {
  return ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256[]"],
    [JOIN_WEIGHTED_POOL_INIT_TAG, amountsIn]
  );
}

async function logPoolStatus(vault: Vault, address: string) {
  const poolId = await getPoolId(vault, address);
  console.log(await vault.getPoolTokens(poolId));
}

async function main() {
  const [eleSigner, balSigner] = await ethers.getSigners();
  const wethFactory = new WETH__factory(balSigner);
  const weth = wethFactory.attach("0x9A1000D492d40bfccbc03f413A48F5B6516Ec0Fd");

  const vaultContractAddr = "0x65748E8287Ce4B9E6D83EE853431958851550311";
  let vaultContract;

  if (vaultContractAddr.length == 0) {
    vaultContract = await deployBalancerVault(balSigner, weth);
  } else {
    const vaultFactory = new Vault__factory(balSigner);
    vaultContract = vaultFactory.attach(vaultContractAddr);
  }
  console.log("Balancer V2 Vault: ", vaultContract.address);

  const ccFactoryAddr = "";
  let ccFactory;
  if (ccFactoryAddr.length == 0) {
    ccFactory = await deployConvergentPoolFactory(balSigner, vaultContract);
  } else {
    const ccFactoryFactory = new ConvergentPoolFactory__factory(balSigner);
    ccFactory = ccFactoryFactory.attach(ccFactoryAddr);
  }
  console.log("Convergent curve pool factory: ", ccFactory.address);

  const ERC20Factory = new ERC20__factory(balSigner);
  const TestERC20Factory = new TestERC20__factory(balSigner);

  const usdc = TestERC20Factory.attach(
    "0x78dEca24CBa286C0f8d56370f5406B48cFCE2f86"
  );
  // Give ourselves some usdc balance
  // await usdc.mint(balSigner.address, ethers.utils.parseUnits("10000000", 6));
  console.log(await usdc.balanceOf(balSigner.address));
  // [term length as percent of year, exp in unix seconds, tranche]
  const usdcTranches = [
    [0.25, 1628211057, "0x80272c960b862B4d6542CDB7338Ad1f727E0D18d"],
  ];
  const trancheFactory = new Tranche__factory(balSigner);

  // Deploy the weighted pool factory

  const weightedPoolFactoryFactory = new WeightedPoolFactory__factory(
    balSigner
  );
  const weightedPoolFactory = weightedPoolFactoryFactory.attach(
    "0x7576dB443020ec4F46526c317262347Acdf1B99d"
  );
  // const weightedPoolFactory = await deployWeightedPoolFactory(
  //   balSigner,
  //   vaultContract
  // );
  const weights = [parseEther("0.5"), parseEther("0.5")];
  console.log("Weighted pool factory ", weightedPoolFactory.address);

  // console.log("Usdc pools")
  // await logPoolStatus(vaultContract, "0x6ECC98D429eEBA37abd53748fD1549984da07cf9");
  // await logPoolStatus(vaultContract, "0x65ff7bb95AA27302622E05366A4a06E43F2bCa48");
  // console.log("Weth pools")
  // await logPoolStatus(vaultContract, "0x1Acd98aE3035e198ED2318a714f96f687A0997FA");
  // await logPoolStatus(vaultContract, "0xEC3bd23267fca5D10Deb300490B1c0eAb9f75B63");
  // await logPoolStatus(vaultContract, "0xA711480aA32a14022Ab7E09eC4C8a05Fb9f6F0d8");
  // await logPoolStatus(vaultContract, "0x7Fd82126Ee39cFD1E77168E2650a3aEf6cD1903c");

  // await vaultContract.connect(balSigner).swap(
  //   {
  //     poolId: ccPoolId,
  //     kind: 0,
  //     assetIn: tranche.address,
  //     assetOut: usdc.address,
  //     amount: ethers.utils.parseUnits("2000", 6),
  //     userData: "0x",
  //   },
  //   {
  //     sender: balSigner.address,
  //     fromInternalBalance: false,
  //     recipient: balSigner.address,
  //     toInternalBalance: false,
  //   },
  //   // TODO - Slippage protection, highly important for mainnet
  //   0,
  //   ethers.constants.MaxUint256
  // );

  console.log("USDC Tranches");
  for (const tranche of usdcTranches) {
    // Deploy cc pool
    const ccPool = await deployConvergentPool(
      balSigner,
      ccFactory,
      vaultContract,
      (usdc as unknown) as ERC20,
      ERC20Factory.attach(tranche[2] as string),
      tranche[1] as number,
      ONE_YEAR_IN_SECONDS * 8
    );
    console.log(
      "Tranche ",
      tranche[2] as string,
      "Convergent Curve Pool Address ",
      ccPool.poolContract.address
    );

    const trancheContract = trancheFactory.attach(tranche[2] as string);
    const yieldToken = await trancheContract.interestToken();

    // Create the yt pool
    let tokens;
    if (BigNumber.from(yieldToken).lt(BigNumber.from(usdc.address))) {
      tokens = [yieldToken, usdc.address];
    } else {
      tokens = [usdc.address, yieldToken];
    }
    const yieldTokenPool = await deployWeightedPool(
      balSigner,
      vaultContract,
      weightedPoolFactory,
      "Ele BPT",
      "eY_USDC_BPT",
      tokens,
      weights,
      "0.003"
    );
    console.log(
      "Yield token trading pool for tranche ",
      trancheContract.address,
      " is :",
      yieldTokenPool.poolContract.address
    );

    // initialize the pools
    await initLPPools(
      balSigner,
      vaultContract,
      trancheContract,
      (usdc as unknown) as ERC20,
      ccPool.poolId,
      yieldTokenPool.poolId,
      tranche[0] as number,
      0.1,
      8,
      ethers.utils.parseUnits("10000", 6)
    );

    console.log("base :", await ccPool.poolContract.underlying());
    console.log("usdc :", usdc.address);
    console.log("bond :", await ccPool.poolContract.bond());
    console.log("usdc bond :", tranche[2]);
    console.log("total supply", await ccPool.poolContract.totalSupply());
  }

  // console.log("Weth tranches");
  const wethERC20 = ERC20Factory.attach(weth.address);
  // Give ourselves some weth balance
  const wethTranches = [
    [0.0192, 1621010937, "0x44eecA004b2612d131EDA7dA2b9d986E7fED562e"],
    [0.25, 1628210937, "0x89d66Ad25F3A723D606B78170366d8da9870A879"],
  ];

  for (const tranche of wethTranches) {
    const ccPool = await deployConvergentPool(
      balSigner,
      ccFactory,
      vaultContract,
      wethERC20,
      ERC20Factory.attach(tranche[2] as string),
      tranche[1] as number,
      ONE_YEAR_IN_SECONDS * 9
    );
    console.log(
      "Tranche ",
      tranche[2] as string,
      "Convergent Curve Pool Address ",
      ccPool.poolContract.address
    );

    const trancheContract = trancheFactory.attach(tranche[2] as string);
    const yieldToken = await trancheContract.interestToken();

    let tokens;
    if (BigNumber.from(yieldToken).lt(BigNumber.from(weth.address))) {
      tokens = [yieldToken, weth.address];
    } else {
      tokens = [weth.address, yieldToken];
    }

    const yieldTokenPool = await deployWeightedPool(
      balSigner,
      vaultContract,
      weightedPoolFactory,
      "Ele BPT",
      "eY_WETH_BPT",
      tokens,
      weights,
      "0.003"
    );
    console.log(
      "Yield token trading pool for tranche ",
      trancheContract.address,
      " is :",
      yieldTokenPool.poolContract.address
    );

    // initialize the pools
    await initLPPools(
      balSigner,
      vaultContract,
      trancheContract,
      wethERC20,
      ccPool.poolId,
      yieldTokenPool.poolId,
      tranche[0] as number,
      0.1,
      9,
      ethers.utils.parseUnits("1", 18)
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
