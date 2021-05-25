import { Vault__factory } from "../typechain/factories/Vault__factory";
import { ethers } from "hardhat";
import * as readline from "readline-sync";

const BALANCER_VAULT_ADDRESS = "";
const PT_POOL_ADDRESS = "";
const PT_ADDRESS = "";
const UNDERLYING_ADDRESS = "";
const UNDERLYING_DECIMALS = 18;

async function main() {
    //NOTE - WE DON'T SET ALLOWANCES BUT THEY ARE NEEDED

    // Get the signer and attach the vault
    const [signer] = await ethers.getSigners();
    const vaultFactory = new Vault__factory(signer);
    const vault = vaultFactory.attach(BALANCER_VAULT_ADDRESS);

    // grab last poolId from last event
    const newPools = vault.filters.PoolRegistered(
        null,
        PT_POOL_ADDRESS,
        null
        );
    const results = await vault.queryFilter(newPools);
    const poolId = results[results.length - 1]?.args?.poolId;

    const howMuch = Number.parseFloat(readline.question("trade amount: "));
    const slippageBoundry = readline.question("Min output: ");

    let tx = await vault.connect(signer).swap(
        {
          poolId: poolId,
          kind: 0,
          assetIn: UNDERLYING_ADDRESS,
          assetOut: PT_ADDRESS,
          amount: ethers.utils.parseUnits(
            howMuch.toFixed(UNDERLYING_DECIMALS).toString(),
            UNDERLYING_DECIMALS
          ),
          userData: "0x",
        },
        {
          sender: signer.address,
          fromInternalBalance: false,
          recipient: signer.address,
          toInternalBalance: false,
        },
        ethers.utils.parseUnits(
          Number.parseFloat(slippageBoundry).toFixed(UNDERLYING_DECIMALS).toString(),
          UNDERLYING_DECIMALS
        ),
        ethers.constants.MaxUint256
      );
      await tx.wait(1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });