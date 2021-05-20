import { ethers } from "hardhat"
import { providers } from "ethers";
import hre from "hardhat";
// Smart contract imports
import { TrancheFactory__factory } from "../../typechain/factories/TrancheFactory__factory";
import { InterestTokenFactory__factory } from "../../typechain/factories/InterestTokenFactory__factory";
import { YVaultAssetProxy__factory } from "../../typechain/factories/YVaultAssetProxy__factory";
import { DateString__factory } from "../../typechain/factories/DateString__factory";
import { UserProxy__factory } from "../../typechain/factories/UserProxy__factory";

const provider = ethers.providers.getDefaultProvider("goerli")

export interface UserProxyData {
    weth: string; // weth address
    trancheFactory: string; // tranche factory address
    trancheBytecodeHash: string; // hash of the Tranche bytecode.
}

export interface WrappedPositionData {
    name: string; // name
    symbol: string; // name
    underlying: string; // underlying token address
    vault: string // yearn vault address
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
    const [signer] = await ethers.getSigners()
    const proxyFactory = new UserProxy__factory(signer);
    const proxy = await proxyFactory.deploy(
        deploymentData.weth,
        deploymentData.trancheFactory,
        deploymentData.trancheBytecodeHash
    );
    console.log("User Proxy", proxy.address);
    return proxy.address
}

async function deployFactories() {
    const [signer] = await ethers.getSigners()
    const interestTokenFactoryFactory = new InterestTokenFactory__factory(signer);
    const interestTokenFactory = await interestTokenFactoryFactory.deploy();
    console.log("Interest Token Factory", interestTokenFactory.address);

    //get datestring lib
    const trancheFactoryFactory = new TrancheFactory__factory(signer);
    const dateLibFactory = new DateString__factory(signer);
    const dateLib = await dateLibFactory.deploy();

    // Deploy the tranche factory
    const trancheFactory = await trancheFactoryFactory.deploy(
        interestTokenFactory.address,
        dateLib.address
    );
    console.log("Tranche Factory", trancheFactory.address);
    return trancheFactory.address
}

export async function deployWrappedPosition(deploymentData: WrappedPositionData) {
    const [signer] = await ethers.getSigners()

    const yAssetWPFactory = new YVaultAssetProxy__factory(signer);

    const wrappedPosition = await yAssetWPFactory.deploy(
        deploymentData.vault,
        deploymentData.underlying,
        deploymentData.name,
        deploymentData.symbol
    );
    console.log("Wrapped Position", wrappedPosition.address);
    return wrappedPosition.address
}

export async function deployTranche(deploymentData: TrancheData) {
    const [signer] = await ethers.getSigners()

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
    const timestamp = block.timestamp

    for (let i = 0; i < deploymentData.expirations.length; i++) {
        let expiration = deploymentData.expirations[i]
        // Deploy the tranche for this timestamp

        const txReceipt = (await (
            await trancheFactory.deployTranche(expiration + timestamp, deploymentData.wrappedPosition)
        ).wait()) as PostExecutionTransactionReceipt;

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
        trancheExpirations: trancheExpirations
    });

    console.log(JSON.stringify(deploymentResult, (k, v) => v, 4))
    return trancheAddresses
}
