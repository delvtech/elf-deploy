import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";

import { HardhatUserConfig, task } from "hardhat/config";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.5.12",
      },
      {
        version: "0.8.0",
      },
    ],
  },

  networks: {
    hardhat: {
      gas: 1000000000000000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
    },
  },
};

export default config;
