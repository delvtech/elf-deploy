// This example etherscan verification script can be adapted for the one time deployments
import hre from 'hardhat';

async function main() {

    await hre.run("verify:verify", {
        network: "mainnet",
        address: "0x9b44Ed798a10Df31dee52C5256Dcb4754BCf097E",
        constructorArguments: [],
    })
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });