import { Vault__factory } from "../typechain/factories/Vault__factory";
import { Vault } from "../typechain/Vault";
import { WeightedPoolFactory } from "../typechain/WeightedPoolFactory";
import { WeightedPoolFactory__factory } from "../typechain/factories/WeightedPoolFactory__factory";
import { ConvergentPoolFactory__factory } from "../typechain/factories/ConvergentPoolFactory__factory";
import { ConvergentPoolFactory} from "../typechain/ConvergentPoolFactory";
import {ERC20} from "typechain/ERC20";
import { ethers } from "hardhat";
import { Signer, BigNumber } from "ethers";
import * as readline from "readline-sync";
import fs, { read } from "fs";
import {Tranche__factory} from "../typechain/factories/Tranche__factory";
import {ConvergentCurvePool__factory} from "../typechain/factories/ConvergentCurvePool__factory";
import {ERC20__factory} from "../typechain/factories/ERC20__factory";
import {InterestToken__factory} from "../typechain/factories/InterestToken__factory";


// Edit to import the correct version
import goerli from "../addresses/goerli.json";
import mainnet from "../addresses/mainnet.json";


export async function deployWeightedPool(
    signer: Signer,
    vaultContract: Vault,
    poolFactory: WeightedPoolFactory,
    name: string,
    symbol: string,
    tokens: string[],
    weights: BigNumber[],
    swapFee: string
  ) {
    const gas = readline.question("gasPrice: ");
    const createTx = await poolFactory
      .create(
        name,
        symbol,
        tokens,
        weights,
        ethers.utils.parseEther(swapFee),
        await signer.getAddress(),
        {
            gasPrice: ethers.utils.parseUnits(gas, 'gwei')
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
  
    const gas = readline.question("gasPrice: ");
    const createTx = await convergentPoolFactory.create(
      baseAssetContract.address,
      yieldAssetContract.address,
      expiration,
      tParam,
      ethers.utils.parseEther(swapFee),
      `Element ${baseAssetSymbol} - fy${baseAssetSymbol}`,
      `${baseAssetSymbol}-fy${baseAssetSymbol}`,
      {
        gasPrice: ethers.utils.parseUnits(gas, 'gwei')
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
  
    return { poolId, poolContract };
}

async function deployWithAddresses(addresses: any) {

    const [signer] = await ethers.getSigners();

    // Get balancer vault
    if (addresses.balancerVault == undefined || addresses.balancerVault == "") {
        console.log("Error: please init balancer vault");
        return;
    }
    const balancerFactory = new Vault__factory(signer)
    const vault = balancerFactory.attach(addresses.balancerVault);

    // Get convergent curve pool factory
    if (addresses.convergentCurvePoolFactory == undefined || addresses.convergentCurvePoolFactory == "") {
        console.log("Error: please init cc pool factory");
        return;
    }
    const ccFactoryFactory = new ConvergentPoolFactory__factory(signer);
    const ccFactory = ccFactoryFactory.attach(addresses.convergentCurvePoolFactory);

    // Get the weighted pool factory
    if (addresses.weightedPoolFactory == undefined || addresses.weightedPoolFactory == "") {
        console.log("Error: please init weighted pool factory");
        return;
    }
    const weightedPoolFactoryFactory = new WeightedPoolFactory__factory(signer);
    const weightedPoolFactory = weightedPoolFactoryFactory.attach(addresses.weightedPoolFactory);

    // Load the tranche
    const trancheAddress = readline.question("tranche address: ");
    const trancheFactory = new Tranche__factory(signer);
    const tranche = trancheFactory.attach(trancheAddress);

    // Load the yt
    const ytAddress = await tranche.interestToken();
    console.log(ytAddress);
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

        const lpTokenName = readline.question("lp token name: ");
        const lpTokenSymbol = readline.question("lp token symbol: ");

        let tokens;
        let weights;
        if (BigNumber.from(underlying).lt(BigNumber.from(yt.address))) {
            tokens = [underlying, yt.address];
            weights = [ethers.utils.parseEther("0.5").add(1), ethers.utils.parseEther("0.5").sub(1)];
        } else {
            tokens = [yt.address, underlying];
            weights = [ethers.utils.parseEther("0.5").sub(1), ethers.utils.parseEther("0.5").add(1)];
        }

        console.log("Deploying new yt pool")
        const deployData = await deployWeightedPool(
            signer,
            vault,
            weightedPoolFactory,
            lpTokenName,
            lpTokenSymbol,
            tokens,
            weights,
            swapFee
        )

        console.log("successfully deployed yt pool");
        ytDeployData = {
            "address": deployData.poolAddress,
            "poolId": deployData.poolId,
            "fee": swapFee
        };
    }


    const newCCPool = readline.question("new pt pool (y/n): ");
    let ptDeployData;
    // Safe conversion because it's a unix timestamp
    const unlockTimestamp =(await tranche.unlockTimestamp()).toNumber()
    if (newCCPool == "y") {

        const swapFeeString = readline.question("swap fee [decimal form] : ");
        const t = Number.parseInt(readline.question("t stretch in years :"));

        console.log("Deploying new pool");
        const deployment = await deployConvergentPool(
            signer,
            ccFactory,
            vault,
            underlyingErc,
            tranche as unknown as ERC20,
            unlockTimestamp,
            t,
            {
                swapFee: swapFeeString
            }
        )
        console.log("new pool deployed");

        ptDeployData =  {
            "address": deployment.poolContract.address,
            "poolId": deployment.poolId,
            "fee": swapFeeString,
            "timeStretch": t
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
        console.log(storedTranche);
        if (storedTranche.address == trancheAddress) {
            ind = i;
        }
        i ++;
    }

    if (ind == -1) {
        addresses.tranches[name].push(
            {
                "expiration": unlockTimestamp,
                "address": trancheAddress,
                "ptPool": ptDeployData,
                "ytPool": ytDeployData
            });
    } else {
        // We want to make sure to not overwrite old data
        if (ptDeployData == undefined && addresses.tranches[name][ind].ptPool != undefined) {
            ptDeployData = addresses.tranches[name][ind].ptPool
        }
        if (ytDeployData == undefined && addresses.tranches[name][ind].ytPool != undefined) {
            ytDeployData = addresses.tranches[name][ind].ytPool
        }

        addresses.tranches[name][ind].ptPool = ptDeployData;
        addresses.tranches[name][ind].ytPool = ytDeployData;
    }

    return addresses;
}

async function main() {
    let network = readline.question("network: ");
    switch(network) {
        case "goerli" : {
            const result = await deployWithAddresses(goerli);
            console.log("writing changed address to output file 'addresses/goerli.json'")
            fs.writeFile('addresses/goerli.json', JSON.stringify(result), 'utf8', () => {});
            break;
        };
        case "mainnet" : {
            await deployWithAddresses(mainnet);
            console.log("writing changed address to output file 'addresses/mainnet.json'")
            fs.writeFile('addresses/mainnet.json', JSON.stringify(mainnet), 'utf8', () => {});
            break;
        };
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