// This example etherscan verification script can be adapted for the one time deployments
import hre from 'hardhat';

async function main() {

    await hre.run("verify:verify", {
        network: "goerli",
        address: "0xB8d8DD04385De3cbc84132F31dD84d5DaF0675fD",
        constructorArguments: ["0x9a1000d492d40bfccbc03f413a48f5b6516ec0fd", "0x5690332C2f0c12F00c147cE350d95B19a0C24f14", "0xdcf0d05c457df6f743b9d4315dc2f02261419d2952248706656d4e392f71c371"],
    })
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });