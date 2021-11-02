import { ethers } from "hardhat"
import { providers } from "ethers";
import hre from "hardhat";
// Smart contract imports

const provider = ethers.providers.getDefaultProvider("goerli")
export interface TokenData {
    name: string; // token name
    symbol: string; // token symbol
    owner: string; // token owner (burn() + mint() + setOwner() access)
}
export interface VestingVaultData {
    token: string; // ERC20 token to use
    stale: number; // stale block number for voting power calculation
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


export async function deployToken(deploymentData: TokenData) {
    const [signer] = await ethers.getSigners()

    const tokenFactory = await ethers.getContractFactory(
        "ERC20PermitWithMint",
        signer
      );

    const token = await tokenFactory.deploy(
        deploymentData.name,
        deploymentData.symbol,
        deploymentData.owner
    );

    return token.address
}

export async function deployVestingVault(deploymentData: VestingVaultData) {
    const [signer] = await ethers.getSigners()

    const vaultFactory = await ethers.getContractFactory(
        "VestingVault",
        signer
      );

    const vestingVault = await vaultFactory.deploy(
        deploymentData.token,
        deploymentData.stale,
    );

    return vestingVault.address
}