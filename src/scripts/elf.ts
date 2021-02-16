import { Signer } from "ethers";
import hre from "hardhat";
import { Elf, ElfFactory, ERC20 } from "types";

import {
  AYVault__factory,
  Elf__factory,
  YVaultAssetProxy__factory,
} from "../types";

export async function deployElf<T extends ERC20>(
  elfFactoryContract: ElfFactory,
  baseAssetContract: T,
  signer: Signer
): Promise<Elf> {
  // TODO: make the vault type configurable
  const VaultDeployer = new AYVault__factory(signer);
  const vaultContract = await VaultDeployer.deploy(baseAssetContract.address);

  // TODO: make the asset proxy type configurable
  const AssetProxyDeployer = new YVaultAssetProxy__factory(signer);
  const assetProxyContract = await AssetProxyDeployer.deploy(
    vaultContract.address,
    baseAssetContract.address
  );

  await elfFactoryContract.newPool(
    baseAssetContract.address,
    assetProxyContract.address
  );

  const elfContract = await getLastDeployedElf(elfFactoryContract, signer);

  await assetProxyContract.setPool(elfContract.address);

  return elfContract;
}

// TODO: figure out a better way to get the elf address?
const getLastDeployedElf = async (
  elfFactoryContract: ElfFactory,
  signer: Signer
) => {
  const signerAddress = await signer.getAddress();
  const filter = elfFactoryContract.filters.NewPool(signerAddress, null);
  const results = await elfFactoryContract.queryFilter(filter);
  // ugly line to grab the second argument passed to the event, which is the pool address.
  const elfAddress = results[results.length - 1]?.args?.[1] as string;
  const elfContract = Elf__factory.connect(elfAddress, signer);

  return elfContract;
};
