// This example etherscan verification script can be adapted for the one time deployments
import hre from 'hardhat';

async function main() {

    await hre.run("verify:verify", {
        network: "goerli",
        address: "0x8Bd721BB84a30c0078aF4a5a732c7169C5BE6eDB",
        constructorArguments: [],
    })
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });